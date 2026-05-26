const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { SLOT_EMOTES } = require('../slots.js');
const { PLAYER_NAMES, getPlayerForSlot, getSlotsForPlayer } = require('../players.js');

const STATUS_EMOJI = { 0: '❌', 5: '🔗', 10: '🟡', 20: '🎮', 30: '✅' };
const STATUS_LABEL = { 0: 'Disconnected', 5: 'Connected', 10: 'Ready', 20: 'Playing', 30: 'Goal!' };
const ITEMS_PER_PAGE = 8;

function slotLabel(name) {
    const emote = SLOT_EMOTES[name];
    return emote ? `${name} ${emote}` : name;
}

function pct(checked, total) {
    if (total === 0) return '100%';
    return `${((checked / total) * 100).toFixed(1)}%`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ap-summary')
        .setDescription('Archipelago multiworld summary')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('Show detailed stats for a specific player (omit for overview)')
                .setRequired(false)
                .setAutocomplete(true))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const query = interaction.options.getFocused().toLowerCase();
        const filtered = PLAYER_NAMES.filter(n => n.toLowerCase().includes(query));
        await interaction.respond(filtered.slice(0, 25).map(n => ({ name: n, value: n })));
    },

    async execute(interaction) {
        await interaction.deferReply();

        const playerArg = interaction.options.getString('player');
        const port = db.archipelago.get('server_port');
        const botSlot = db.archipelago.get('slot');
        const botGame = db.archipelago.get('game');

        if (!port || !botSlot) {
            await interaction.editReply('Archipelago is not configured. Run `/set-archipelago-settings` first.');
            return;
        }

        const { Client } = await import('archipelago.js');

        // ── Overview connection to get all players and their statuses ──────────
        const rootClient = new Client();
        let allPlayers;
        try {
            await rootClient.login(`archipelago.gg:${port}`, botSlot, botGame);
            allPlayers = rootClient.players.teams.flat().filter(p => p.slot > 0);
        } catch (err) {
            await interaction.editReply(`Failed to connect to Archipelago: ${err.message}`);
            return;
        }

        // ── OVERVIEW mode ─────────────────────────────────────────────────────
        if (!playerArg) {
            const statuses = await Promise.all(
                allPlayers.map(p => p.fetchStatus().then(s => ({ name: p.name, game: p.game, status: s })).catch(() => ({ name: p.name, game: p.game, status: 0 })))
            );
            rootClient.socket.disconnect();

            // Group by player, with an "Other" bucket for unrecognised slots
            const groups = new Map();
            for (const s of statuses) {
                const player = getPlayerForSlot(s.name);
                const key = player?.name ?? 'Other';
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key).push(s);
            }

            const lines = [];
            for (const [playerName, slots] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
                const goalCount = slots.filter(s => s.status === 30).length;
                const header = `**${playerName}** — ${goalCount}/${slots.length} goals`;
                lines.push(header);
                for (const s of slots.sort((a, b) => a.name.localeCompare(b.name))) {
                    const emoji = STATUS_EMOJI[s.status] ?? '❓';
                    lines.push(`  ${emoji} ${slotLabel(s.name)} *(${s.game})*`);
                }
            }

            const totalGoals = statuses.filter(s => s.status === 30).length;
            const footer = `-# **${totalGoals}/${statuses.length}** slots at goal`;
            const totalPages = Math.max(1, Math.ceil(lines.length / (ITEMS_PER_PAGE * 3)));
            let currentPage = 0;

            const generatePage = (page) => {
                const slice = lines.slice(page * ITEMS_PER_PAGE * 3, (page + 1) * ITEMS_PER_PAGE * 3);
                return `## Archipelago Summary\n${slice.join('\n')}\n${footer}${totalPages > 1 ? `\n-# Page ${page + 1}/${totalPages}` : ''}`;
            };

            const generateButtons = (page) => new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            );

            if (totalPages <= 1) {
                await interaction.editReply(generatePage(0));
                return;
            }

            const response = await interaction.editReply({ content: generatePage(0), components: [generateButtons(0)] });
            const collector = response.createMessageComponentCollector({ time: 300000 });
            collector.on('collect', async i => {
                if (i.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
                else if (i.customId === 'next') currentPage = Math.min(totalPages - 1, currentPage + 1);
                await i.update({ content: generatePage(currentPage), components: [generateButtons(currentPage)] });
            });
            collector.on('end', async () => { try { await interaction.editReply({ components: [] }); } catch (_) {} });
            return;
        }

        // ── PLAYER DETAIL mode ────────────────────────────────────────────────
        const playerSlots = getSlotsForPlayer(playerArg, allPlayers.map(p => p.name));
        rootClient.socket.disconnect();

        if (playerSlots.length === 0) {
            await interaction.editReply(`No slots found for player **${playerArg}**.`);
            return;
        }

        await interaction.editReply(`Connecting to **${playerSlots.length}** slot(s) for **${playerArg}**...`);

        const slotData = db.archipelago.get('slot_data') ?? {};

        const results = await Promise.all(playerSlots.map(async (slotName) => {
            const client = new Client();
            try {
                await client.login(`archipelago.gg:${port}`, slotName);
                const checked = client.room.checkedLocations.length;
                const missing = client.room.missingLocations.length;
                const total = checked + missing;
                const itemsReceived = client.items.received.length;
                const status = await client.players.self.fetchStatus().catch(() => 0);
                client.socket.disconnect();
                return { slotName, game: slotData[slotName]?.game ?? client.game, checked, missing, total, itemsReceived, status, error: null };
            } catch (err) {
                return { slotName, game: slotData[slotName]?.game ?? '?', checked: 0, missing: 0, total: 0, itemsReceived: 0, status: 0, error: err.message };
            }
        }));

        const lines = results
            .sort((a, b) => b.status - a.status || a.slotName.localeCompare(b.slotName))
            .map(r => {
                if (r.error) return `**${slotLabel(r.slotName)}** *(${r.game})*\n  ⚠️ Failed to connect: ${r.error}`;
                const emoji = STATUS_EMOJI[r.status] ?? '❓';
                const label = STATUS_LABEL[r.status] ?? 'Unknown';
                const checkLine = r.total > 0 ? `Checks: **${r.checked}/${r.total}** (${pct(r.checked, r.total)})` : 'Checks: unknown';
                return `${emoji} **${slotLabel(r.slotName)}** *(${r.game})* — ${label}\n  ${checkLine} · Items received: **${r.itemsReceived}**`;
            });

        const totalChecked = results.reduce((sum, r) => sum + r.checked, 0);
        const totalLocations = results.reduce((sum, r) => sum + r.total, 0);
        const goalCount = results.filter(r => r.status === 30).length;
        const header = `## ${playerArg}'s Slots`;
        const footer = `-# **${goalCount}/${results.length}** goals · **${totalChecked}/${totalLocations}** checks total (${pct(totalChecked, totalLocations)})`;

        await interaction.editReply(`${header}\n${lines.join('\n')}\n${footer}`);
    },
};
