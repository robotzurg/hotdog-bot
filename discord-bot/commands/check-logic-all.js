const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_EMOTES } = require('../slots.js');
const { runTrackerForSlot } = require('../tracker.js');

const PLAYER_SLOTS = {
    'Aria': ['AriaCeleste', 'AriaChess', 'AriaHollow', 'AriaLilies', 'AriaOri', 'AriaPizza', 'AriaTruck'],
    'Av': ['AvGenshin', 'AvGK', 'AvHat', 'AvNiko', 'AvTy', 'AvWitch'],
    'Ethan': ['Ethan-Celeste', 'Ethan-DKC', 'Ethan-Duck', 'Ethan-Hylics', 'Ethan-Ori', 'Ethan-Peggle', 'Ethan-Taxi', 'Ethan-TOEM', 'Ethan-Yoku'],
    'HDW': ['HDWClique', 'AllFactory', 'AllMinecraft', 'AllRepo'],
    'Jeff': ['Jeff-C64', 'Jeff-COTM', 'Jeff-DUCK', 'Jeff-KH2', 'Jeff-SOL', 'Jeff-SP', 'Jeff-Stardew', 'Jeff-Truck', 'Jeff-TS', 'Jeff-UT'],
    'Kirby': ['KirbyKSS'],
    'Nate': ['NateGK', 'NateGo', 'NateHunie', 'NateMK', 'NateOri', 'NatePvZ', 'NateRabi', 'NateTy', 'NateWitch', 'NateXeno'],
    'Raveel': ['RaveelCeleste', 'RaveelConquest', 'RaveelOri', 'RaveelPizza', 'RaveelXY', 'RaveelZA'],
    'vlad': ['vlad-dd', 'vlad-fm', 'vlad-hk', 'vlad-mini', 'vlad-ref'],
    'Yacob': ['Yacob-HK', 'Yacob-KH', 'Yacob-KH2', 'Yacob-Lies', 'Yacob-MIKU', 'Yacob-OOT', 'Yacob-SOLS', 'Yacob-SUNSHINE', 'Yacob-TP'],
};

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
        await interaction.editReply(`Gathering Universal Tracker data for all **${player}** slots (${slots.length} slots), this may take a moment...`);

        const results = await Promise.all(slots.map(slot => runTrackerForSlot(slot, port)));

        const slotResults = Object.fromEntries(
            results.map(({ slotName, items, hintedCount }) => [slotName, { items, hintedCount }])
        );

        const buildOverview = () => {
            const lines = [`## Logic Check Overview: ${player}`];
            for (const slot of slots) {
                const { items, hintedCount } = slotResults[slot] ?? { items: [], hintedCount: 0 };
                const emote = SLOT_EMOTES[slot] ?? '';
                const hintSuffix = hintedCount > 0 ? ` (${hintedCount} hinted)` : '';
                lines.push(`- ${emote ? `${emote} ` : ''}**${slot}**: ${items.length} in logic${hintSuffix}`);
            }
            return lines.join('\n');
        };

        const buildSelectMenu = (selectedSlot = null) => {
            const select = new StringSelectMenuBuilder()
                .setCustomId('slot_select')
                .setPlaceholder('Select a slot to view details...')
                .addOptions(slots.map(slot => {
                    const { items, hintedCount } = slotResults[slot] ?? { items: [], hintedCount: 0 };
                    const hintSuffix = hintedCount > 0 ? ` • ${hintedCount} hinted` : '';
                    const emoji = parseEmote(SLOT_EMOTES[slot]);
                    const option = new StringSelectMenuOptionBuilder()
                        .setLabel(slot)
                        .setValue(slot)
                        .setDescription(`${items.length} in logic${hintSuffix}`)
                        .setDefault(slot === selectedSlot);
                    if (emoji) option.setEmoji(emoji);
                    return option;
                }));
            return new ActionRowBuilder().addComponents(select);
        };

        const buildDetailContent = (slotName, page) => {
            const { items, hintedCount } = slotResults[slotName] ?? { items: [], hintedCount: 0 };
            const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
            const start = page * ITEMS_PER_PAGE;
            const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
            const emote = SLOT_EMOTES[slotName] ?? '';
            const hintSuffix = hintedCount > 0 ? ` | **${hintedCount}** Hinted` : '';
            const content = [
                `## In Logic Checks For ${slotName}${emote ? ` ${emote}` : ''}`,
                ...pageItems,
                `\n-# Page ${page + 1}/${totalPages} | **${items.length}** In Logic${hintSuffix}`
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
            components: [buildSelectMenu()]
        });

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
