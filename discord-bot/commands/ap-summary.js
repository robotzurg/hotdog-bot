const { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_EMOTES } = require('../slots.js');
const { PLAYER_SLOTS } = require('../players.js');

function pct(checked, total) {
    if (total === 0) return '100%';
    return `${((checked / total) * 100).toFixed(1)}%`;
}

function slotLabel(name) {
    const emote = SLOT_EMOTES[name];
    return emote ? `${name} ${emote}` : name;
}

const buildSelectMenu = (selectedPlayer = null) =>
    new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('player_select')
            .setPlaceholder('Select a player...')
            .addOptions(Object.keys(PLAYER_SLOTS).map(player =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(player)
                    .setValue(player)
                    .setDefault(player === selectedPlayer)
            ))
    );

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ap-summary')
        .setDescription('Archipelago multiworld check summary by player')
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        const response = await interaction.editReply({
            content: '## Archipelago Summary\nSelect a player to view their slot check progress.',
            components: [buildSelectMenu()],
        });

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId !== 'player_select') return;

            const player = i.values[0];
            const slots = PLAYER_SLOTS[player] ?? [];
            const finishedGames = db.archipelago.get('finished_games') ?? [];
            const cachedCounts = db.archipelago.get('check_counts') ?? {};

            const results = slots
                .filter(s => !finishedGames.includes(s))
                .map(slot => {
                    const { checked, total } = cachedCounts[slot] ?? { checked: 0, total: 0 };
                    return { slot, checked, total };
                });

            const lines = [`## ${player}'s Slots`];
            for (const slot of slots) {
                if (finishedGames.includes(slot)) {
                    lines.push(`- ${slotLabel(slot)}: Completed`);
                    continue;
                }
                const r = results.find(x => x.slot === slot);
                if (!r) continue;
                const checkStr = r.total > 0 ? `**${r.checked}/${r.total}** (${pct(r.checked, r.total)})` : 'unknown';
                lines.push(`- ${slotLabel(slot)}: ${checkStr}`);
            }

            const finishedCount = slots.filter(s => finishedGames.includes(s)).length;
            const totalChecked = results.reduce((sum, r) => sum + r.checked, 0);
            const totalLocations = results.reduce((sum, r) => sum + r.total, 0);
            const footer = `-# **${finishedCount}/${slots.length}** slots completed - **${totalChecked}/${totalLocations}** checks (${pct(totalChecked, totalLocations)})`;

            await i.update({
                content: `${lines.join('\n')}\n${footer}`,
                components: [buildSelectMenu(player)],
            });
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (e) {}
        });
    },
};
