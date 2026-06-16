const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_EMOTES } = require('../slots.js');
const { PLAYER_SLOTS } = require('../players.js');

async function fetchHintPoints(slotName, port) {
    try {
        const { Client } = await import('archipelago.js');
        const client = new Client();
        let pointsMsg = '';
        client.messages.on('message', (text) => {
            if (/You have \d+ points/.test(text)) pointsMsg = text;
        });
        await client.login(`archipelago.gg:${port}`, slotName);
        await client.messages.say('!hint');
        await new Promise(resolve => setTimeout(resolve, 2000));
        client.socket.disconnect();

        const full = pointsMsg.match(/A hint costs (\d+) points\. You have (\d+) points/);
        if (full) return { slotName, points: parseInt(full[2], 10), cost: parseInt(full[1], 10) };
        const pointsOnly = pointsMsg.match(/You have (\d+) points/);
        return { slotName, points: pointsOnly ? parseInt(pointsOnly[1], 10) : null, cost: null };
    } catch {
        return { slotName, points: null, cost: null };
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hint-points-all')
        .setDescription('Show hint points for all of a player\'s slots')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('The player whose slots to check')
                .setRequired(true)
                .setAutocomplete(true))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = Object.keys(PLAYER_SLOTS).filter(name => name.toLowerCase().includes(focusedValue));
        await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
    },

    async execute(interaction) {
        await interaction.deferReply();

        const player = interaction.options.getString('player');
        const slots = PLAYER_SLOTS[player];
        if (!slots) {
            await interaction.editReply(`Unknown player: **${player}**`);
            return;
        }

        const port = db.archipelago.get('server_port');
        const finishedGames = db.archipelago.get('finished_games') ?? [];
        const activeSlots = slots.filter(slot => !finishedGames.includes(slot));

        await interaction.editReply(`Gathering hint points for all **${player}** slots (${activeSlots.length} active), this may take a moment...`);

        const results = await Promise.all(activeSlots.map(slot => fetchHintPoints(slot, port)));
        const bySlot = Object.fromEntries(results.map(r => [r.slotName, r]));

        let totalPoints = 0;
        const lines = [`## Hint Points: ${player}`];
        for (const slot of slots) {
            const emote = SLOT_EMOTES[slot] ?? '';
            const prefix = emote ? `${emote} ` : '';
            if (finishedGames.includes(slot)) {
                lines.push(`- ${prefix}**${slot}**: Completed`);
                continue;
            }
            const { points, cost } = bySlot[slot] ?? { points: null, cost: null };
            if (points === null) {
                lines.push(`- ${prefix}**${slot}**: ⚠️ Could not connect`);
                continue;
            }
            totalPoints += points;
            let affordableStr = '';
            if (cost === 0) {
                affordableStr = ' · free hints';
            } else if (cost > 0) {
                const affordable = Math.floor(points / cost);
                affordableStr = ` · ${affordable} hint${affordable === 1 ? '' : 's'} available (cost ${cost})`;
            }
            lines.push(`- ${prefix}**${slot}**: **${points}** points${affordableStr}`);
        }
        lines.push(`\n-# **${totalPoints}** total hint points across ${activeSlots.length} active slots`);

        await interaction.editReply(lines.join('\n'));
    },
};
