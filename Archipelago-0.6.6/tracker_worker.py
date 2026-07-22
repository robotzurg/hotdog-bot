"""Persistent Universal Tracker worker.

Reads newline-delimited JSON requests on stdin and writes NDJSON responses,
keeping the interpreter (and UT's class-level multiworld cache) alive between
requests instead of paying a full cold start per lookup.

Request:   {"id": 1, "slot": "AllRepo", "port": 38281}
Response:  {"id": 1, "items": ["Region | Location", ...]}
           {"id": 1, "error": "..."}
Emitted once when worlds are loaded and requests can be served:
           {"ready": true}

Run from the Archipelago root with the venv interpreter:
    ./venv/bin/python3 tracker_worker.py
"""

import asyncio
import collections
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Archipelago and the worlds print a great deal to stdout during generation.
# Claim the real stdout for the protocol before importing any of it, then point
# fd 1 at stderr so stray prints can never corrupt a response line.
_protocol_out = os.fdopen(os.dup(1), "w", encoding="utf-8")
os.dup2(2, 1)
sys.stdout = sys.stderr

REQUEST_TIMEOUT = float(os.environ.get("TRACKER_REQUEST_TIMEOUT", "180"))
REUSE_LAUNCH_MW = os.environ.get("TRACKER_REUSE_LAUNCH_MW", "1") != "0"

# Utils computes `gui_enabled = not sys.stdout or "--nogui" not in sys.argv` at
# import time. Without this the worker loads Kivy and aborts trying to open a
# Window. Must happen before anything pulls in Utils.
if "--nogui" not in sys.argv:
    sys.argv.insert(1, "--nogui")

from worlds.tracker.TrackerClient import TrackerGameContext, server_loop  # noqa: E402
from worlds.tracker.TrackerCore import TrackerCore  # noqa: E402


def quiet_logging():
    """Utils.init_logging() strips root handlers and resets the level to INFO,
    so this has to be re-asserted after anything that triggers it."""
    logging.getLogger().setLevel(logging.ERROR)
    for name in ("websockets", "kivy", "kivymd", "asyncio"):
        logging.getLogger(name).setLevel(logging.ERROR)


quiet_logging()

_launch_mw = None

# UT caches generated multiworlds on TrackerCore keyed by slot_data *alone* --
# no game, no slot name (see TrackerCore.run_generator). Two slots whose
# slot_data compares equal collide and get handed each other's multiworld,
# which surfaces as "Your datapackage is incorrect" once updateTracker reads
# item_id_to_name off the wrong game. Harmless when every lookup ran in its own
# process and the cache was always empty; not harmless in a worker. So give
# each slot its own cache: a hit can then only ever be that slot's own entry.
CACHE_SLOTS = int(os.environ.get("TRACKER_CACHE_SLOTS", "8"))
_slot_caches = collections.OrderedDict()  # slot -> (multiworlds, slot_datas)


def bind_slot_cache(slot):
    entry = _slot_caches.pop(slot, None) or ([], [])
    _slot_caches[slot] = entry  # reinsert at the end = most recently used
    while len(_slot_caches) > CACHE_SLOTS:
        evicted, _ = _slot_caches.popitem(last=False)
        print(f"[worker] evicted multiworld cache for {evicted}", file=sys.stderr)
    TrackerCore.cached_multiworlds, TrackerCore.cached_slot_data = entry


# Attributes run_generator() sets from host settings that updateTracker() later
# reads. TrackerCore.__init__ does NOT set these, so a reused launch multiworld
# has to bring them along or updateTracker dies on the second request.
_HOST_SETTING_ATTRS = ("output_format", "hide_excluded", "use_split", "enable_glitched_logic")


def prime_core_from_cache(core):
    """Reproduce the host-settings half of TrackerCore.run_generator() without
    regenerating the launch multiworld.

    Mirrors the `self._set_host_settings()` unpacking at TrackerCore.run_generator.
    Returns False if that contract has shifted, so the caller can fall back to a
    real run_generator() rather than half-initializing the core.
    """
    try:
        (_yaml_path, core.output_format, core.hide_excluded, core.use_split,
         deferred, core.enable_glitched_logic) = core._set_host_settings()
    except Exception as err:
        print(f"[worker] host-settings reuse failed ({err}), regenerating", file=sys.stderr)
        return False

    if core.enforce_deferred_connections is None:
        core.enforce_deferred_connections = deferred
    core.launch_multiworld = _launch_mw

    missing = [a for a in _HOST_SETTING_ATTRS if not hasattr(core, a)]
    if missing:
        print(f"[worker] core missing {missing} after reuse, regenerating", file=sys.stderr)
        return False
    return True


def send(payload):
    _protocol_out.write(json.dumps(payload) + "\n")
    _protocol_out.flush()


class WorkerContext(TrackerGameContext):
    """Captures the tracker state instead of logging it line by line."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.captured = None

    def updateTracker(self):
        state = super().updateTracker()
        # updateTracker fires on every watcher tick, including before the
        # multiworld is ready; only keep a state that actually resolved.
        if state is not None and state.readable_locations:
            self.captured = state
        return state


async def run_request(slot, port):
    global _launch_mw

    bind_slot_cache(slot)

    ctx = WorkerContext(f"archipelago.gg:{port}", None, print_list=True)
    ctx.auth = slot
    ctx.server_task = asyncio.create_task(server_loop(ctx), name="server loop")
    quiet_logging()

    primed = False
    if REUSE_LAUNCH_MW and _launch_mw is not None:
        primed = prime_core_from_cache(ctx.tracker_core)
    if not primed:
        ctx.run_generator()
        if REUSE_LAUNCH_MW:
            _launch_mw = ctx.tracker_core.launch_multiworld
    ctx.use_split = ctx.tracker_core.use_split

    try:
        await asyncio.wait_for(ctx.exit_event.wait(), timeout=REQUEST_TIMEOUT)
    except asyncio.TimeoutError:
        pass
    finally:
        try:
            await ctx.shutdown()
        except Exception:
            pass
        # UT leaves GameWatcher and the server loop running. Cancel and drain
        # them, or asyncio.run() closes the loop with tasks still pending and
        # logs "Task exception was never retrieved".
        leftover = [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]
        for task in leftover:
            task.cancel()
        if leftover:
            await asyncio.gather(*leftover, return_exceptions=True)

    if ctx.captured is None:
        raise RuntimeError(f"tracker produced no state for {slot}")
    return list(ctx.captured.readable_locations)


def main():
    send({"ready": True})

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except ValueError as err:
            send({"id": None, "error": f"bad request: {err}"})
            continue

        req_id = req.get("id")
        try:
            items = asyncio.run(run_request(req["slot"], req["port"]))
            send({"id": req_id, "items": items})
        except Exception as err:  # one bad slot must not kill the worker
            send({"id": req_id, "error": f"{type(err).__name__}: {err}"})


if __name__ == "__main__":
    main()
