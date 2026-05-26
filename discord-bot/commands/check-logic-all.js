const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_EMOTES } = require('../slots.js');
const { runTrackerForSlot } = require('../tracker.js');
const { PLAYER_SLOTS } = require('../players.js');

const ITEMS_PER_PAGE = 10;

function parseEmote(emoteStr) {
    if (!emoteStr) return null;
    const match = emoteStr.match(/^<:(\w+):(\d+)>$/);
    return match ? { name: match[1], id: match[2] } : null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-logic-all')
        .setDescription('Check in-logic items for all slots of a player, with side-by-side overview')
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

        await interaction.editReply(`Gathering Universal Tracker data for all **${player}** slots (${activeSlots.length} active), this may take a moment...`);

        const cachedCounts = db.archipelago.get('check_counts') ?? {};
        const trackerResults = await Promise.all(activeSlots.map(slot => runTrackerForSlot(slot, port, finishedGames)));

        const slotResults = Object.fromEntries(
            trackerResults.map(({ slotName, items, hintedCount }) => {
                const { checked, total } = cachedCounts[slotName] ?? { checked: 0, total: 0 };
                return [slotName, { items, hintedCount, checked, total }];
            })
        );

        const buildOverview = () => {
            const lines = [`## Logic Check Overview: ${player}`];
            for (const slot of slots) {
                const emote = SLOT_EMOTES[slot] ?? '';
                const prefix = emote ? `${emote} ` : '';
                if (finishedGames.includes(slot)) {
                    lines.push(`- ${prefix}**${slot}**: Completed`);
                    continue;
                }
                const { items, hintedCount, checked, total } = slotResults[slot] ?? { items: [], hintedCount: 0, checked: 0, total: 0 };
                const hintSuffix = hintedCount > 0 ? ` (${hintedCount} hinted)` : '';
                const checkStr = total > 0 ? ` | ${checked}/${total} checks` : '';
                lines.push(`- ${prefix}**${slot}**: ${items.length} in logic${hintSuffix}${checkStr}`);
            }
            return lines.join('\n');
        };

        const buildSelectMenu = (selectedSlot = null) => {
            const select = new StringSelectMenuBuilder()
                .setCustomId('slot_select')
                .setPlaceholder('Select a slot to view details...')
                .addOptions(activeSlots.map(slot => {
                    const { items, hintedCount, checked, total } = slotResults[slot] ?? { items: [], hintedCount: 0, checked: 0, total: 0 };
                    const hintStr = hintedCount > 0 ? ` • ${hintedCount} hinted` : '';
                    const checkStr = total > 0 ? ` • ${checked}/${total} checks` : '';
                    const emoji = parseEmote(SLOT_EMOTES[slot]);
                    const option = new StringSelectMenuOptionBuilder()
                        .setLabel(slot)
                        .setValue(slot)
                        .setDescription(`${items.length} in logic${hintStr}${checkStr}`.slice(0, 100))
                        .setDefault(slot === selectedSlot);
                    if (emoji) option.setEmoji(emoji);
                    return option;
                }));
            return new ActionRowBuilder().addComponents(select);
        };

        const buildDetailContent = (slotName, page) => {
            const { items, hintedCount, checked, total } = slotResults[slotName] ?? { items: [], hintedCount: 0, checked: 0, total: 0 };
            const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
            const start = page * ITEMS_PER_PAGE;
            const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
            const emote = SLOT_EMOTES[slotName] ?? '';
            const hintSuffix = hintedCount > 0 ? ` | **${hintedCount}** Hinted` : '';
            const checkSuffix = total > 0 ? ` | **${checked}/${total}** Checks (${((checked / total) * 100).toFixed(1)}%)` : '';
            const content = [
                `## In Logic Checks For ${slotName}${emote ? ` ${emote}` : ''}`,
                ...pageItems,
                `\n-# Page ${page + 1}/${totalPages} | **${items.length}** In Logic${hintSuffix}${checkSuffix}`
            ].join('\n');
            return { content, totalPages };
        };

        const buildDetailComponents = (slotName, page, totalPages) => [
            buildSelectMenu(slotName),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('back_overview')
                    .setLabel('Logic Overview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            )
        ];

        const response = await interaction.editReply({
            content: buildOverview(),
            components: activeSlots.length > 0 ? [buildSelectMenu()] : []
        });

        if (activeSlots.length === 0) return;

        let currentSlot = null;
        let currentPage = 0;

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'slot_select') {
                currentSlot = i.values[0];
                currentPage = 0;
                const { content, totalPages } = buildDetailContent(currentSlot, currentPage);
                await i.update({ content, components: buildDetailComponents(currentSlot, currentPage, totalPages) });
            } else if (i.customId === 'back_overview') {
                currentSlot = null;
                await i.update({ content: buildOverview(), components: [buildSelectMenu()] });
            } else if (i.customId === 'prev' || i.customId === 'next') {
                const { items } = slotResults[currentSlot] ?? { items: [] };
                const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
                currentPage = i.customId === 'prev'
                    ? Math.max(0, currentPage - 1)
                    : Math.min(totalPages - 1, currentPage + 1);
                const { content } = buildDetailContent(currentSlot, currentPage);
                await i.update({ content, components: buildDetailComponents(currentSlot, currentPage, totalPages) });
            }
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (e) {}
        });
    },
};
