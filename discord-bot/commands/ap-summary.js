const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
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

function buildSelectMenu(selectedPlayer = null) {
    return new ActionRowBuilder().addComponents(
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
}

function buildOverallButton() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('back_overall')
            .setLabel('Overall')
            .setStyle(ButtonStyle.Secondary)
    );
}

function buildOverview(cachedCounts, finishedGames) {
    const lines = ['## Archipelago Summary'];
    let grandChecked = 0;
    let grandTotal = 0;

    for (const [player, slots] of Object.entries(PLAYER_SLOTS)) {
        const playerChecked = slots.reduce((sum, s) => sum + (cachedCounts[s]?.checked ?? 0), 0);
        const playerTotal = slots.reduce((sum, s) => sum + (cachedCounts[s]?.total ?? 0), 0);
        grandChecked += playerChecked;
        grandTotal += playerTotal;
        const finishedCount = slots.filter(s => finishedGames.includes(s)).length;
        const goalStr = finishedCount > 0 ? ` | ${finishedCount}/${slots.length} goals` : '';
        lines.push(`- **${player}**: **${playerChecked}/${playerTotal}** (${pct(playerChecked, playerTotal)})${goalStr}`);
    }

    lines.push(`\n-# **${grandChecked}/${grandTotal}** checks total (${pct(grandChecked, grandTotal)})`);
    return lines.join('\n');
}

function buildPlayerDetail(player, cachedCounts, finishedGames) {
    const slots = PLAYER_SLOTS[player] ?? [];
    const lines = [`## ${player}'s Slots`];

    for (const slot of slots) {
        const { checked, total } = cachedCounts[slot] ?? { checked: 0, total: 0 };
        const isFinished = finishedGames.includes(slot);
        const checkStr = total > 0 ? `**${checked}/${total}** (${pct(checked, total)})` : 'unknown';
        const tag = isFinished ? ' ✅' : '';
        lines.push(`- ${slotLabel(slot)}${tag}: ${checkStr}`);
    }

    const finishedCount = slots.filter(s => finishedGames.includes(s)).length;
    const totalChecked = slots.reduce((sum, s) => sum + (cachedCounts[s]?.checked ?? 0), 0);
    const totalLocations = slots.reduce((sum, s) => sum + (cachedCounts[s]?.total ?? 0), 0);
    const footer = `-# **${finishedCount}/${slots.length}** slots completed - **${totalChecked}/${totalLocations}** checks (${pct(totalChecked, totalLocations)})`;

    return `${lines.join('\n')}\n${footer}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ap-summary')
        .setDescription('Archipelago multiworld check summary by player')
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        const response = await interaction.editReply({
            content: buildOverview(db.archipelago.get('check_counts') ?? {}, db.archipelago.get('finished_games') ?? []),
            components: [buildSelectMenu()],
        });

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            const cachedCounts = db.archipelago.get('check_counts') ?? {};
            const finishedGames = db.archipelago.get('finished_games') ?? [];

            if (i.customId === 'player_select') {
                const player = i.values[0];
                await i.update({
                    content: buildPlayerDetail(player, cachedCounts, finishedGames),
                    components: [buildSelectMenu(player), buildOverallButton()],
                });
            } else if (i.customId === 'back_overall') {
                await i.update({
                    content: buildOverview(cachedCounts, finishedGames),
                    components: [buildSelectMenu()],
                });
            }
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (e) {}
        });
    },
};
