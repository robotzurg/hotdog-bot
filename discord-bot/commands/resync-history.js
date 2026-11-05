const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const db = require('../db.js');
const archipelago = require('../archipelago.js');
const { itemGroup } = require('../slots.js');

const itemKey = (sender, itemName, locationName) => `${sender ?? ''}\u0000${itemName}\u0000${locationName ?? ''}`;

module.exports = {
    // Logs in to the room, so it's refused while Archipelago is disabled
    requiresArchipelago: true,
    data: new SlashCommandBuilder()
        .setName('resync-history')
        .setDescription('Add items missing from history (e.g. while the bot was down) from Archipelago')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        await interaction.deferReply();

        const port = db.archipelago.get('server_port');
        if (!port) {
            await interaction.editReply('No Archipelago server port configured.');
            return;
        }

        const slotData = db.archipelago.get('slot_data') ?? {};
        const playerSlots = Object.entries(slotData)
            .filter(([, d]) => d.type === 1 && d.game)
            .map(([name, d]) => ({ name, game: d.game }));

        if (playerSlots.length === 0) {
            await interaction.editReply('No player slots found in cache. Try reconnecting the bot first.');
            return;
        }

        await interaction.editReply(`Checking ${playerSlots.length} slots for missing items…`);

        // The server's received list is the complete, ordered record for each slot
        const receivedBySlot = [];
        const errors = [];
        for (const slot of playerSlots) {
            try {
                // ReceivedItems packets arrive shortly after Connected
                const received = await archipelago.withSlotClient(slot.name, (client) => [...client.items.received], { settleMs: 2000 });
                receivedBySlot.push({ slot, received });
            } catch (err) {
                errors.push(`**${slot.name}**: ${err.message}`);
            }
        }

        // Everything from here to the write is synchronous, so no live item can slip in between
        archipelago.flushHistory();
        const history = db.archipelago.get('ap_history') ?? [];

        // history index -> entries to insert right after it (-1 = before everything)
        const inserts = new Map();
        const addedBySlot = [];

        for (const { slot, received } of receivedBySlot) {
            // This slot's existing item entries, in history order
            const ownIndices = [];
            const unmatched = new Map(); // key -> queue of history indices
            history.forEach((e, i) => {
                if (e.type !== 'item' || e.receiver !== slot.name) return;
                ownIndices.push(i);
                const key = itemKey(e.sender, e.itemName, e.locationName);
                if (!unmatched.has(key)) unmatched.set(key, []);
                unmatched.get(key).push(i);
            });

            let prevIdx = -1;
            let added = 0;
            for (const item of received) {
                const sender = item.sender?.name ?? null;
                const locationName = item.locationName ?? null;
                const queue = unmatched.get(itemKey(sender, item.name, locationName));
                if (queue?.length) {
                    prevIdx = queue.shift();
                    continue;
                }

                // Missing: we only know it arrived between the neighbouring known items, so use the
                // next known item's time (roughly when the bot came back), else the previous one's
                const nextIdx = ownIndices.find(i => i > prevIdx);
                const timestamp = history[nextIdx]?.timestamp ?? history[prevIdx]?.timestamp ?? null;

                const flags = item.flags ?? 0;
                if (!inserts.has(prevIdx)) inserts.set(prevIdx, []);
                inserts.get(prevIdx).push({
                    type: 'item',
                    receiver: slot.name,
                    sender,
                    itemName: item.name,
                    locationName,
                    flags,
                    group: itemGroup(flags),
                    timestamp,
                    backfilled: true,
                });
                added++;
            }
            if (added) addedBySlot.push(`${slot.name}: ${added}`);
        }

        const merged = [...(inserts.get(-1) ?? [])];
        history.forEach((e, i) => {
            merged.push(e);
            if (inserts.has(i)) merged.push(...inserts.get(i));
        });
        const totalAdded = merged.length - history.length;
        if (totalAdded) db.archipelago.set('ap_history', merged);

        const lines = [
            totalAdded
                ? `Added **${totalAdded}** missing items across **${addedBySlot.length}** slots (${addedBySlot.join(', ')}).`
                : 'History is already complete; nothing to add.',
            `Checked **${receivedBySlot.length}**/**${playerSlots.length}** slots.`,
            ...errors,
        ];
        await interaction.editReply(lines.join('\n'));
    },
};
