const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES, SLOT_EMOTES } = require('../slots.js');

const ITEMS_PER_PAGE = 20;
const MAX_CONTENT = 1990;

const safeContent = (str) => str.length > MAX_CONTENT ? str.slice(0, MAX_CONTENT - 3) + '...' : str;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ap-item-group')
        .setDescription('Show all items in a game-defined item group for a slot')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The slot to look up')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('item-group')
                .setDescription('The item group to display')
                .setRequired(true)
                .setAutocomplete(true))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const query = focused.value.toLowerCase();

        if (focused.name === 'item-group') {
            const slotName = interaction.options.getString('slot-name') ?? '';
            const slotData = db.archipelago.get('slot_data') ?? {};
            const game = slotData[slotName]?.game;
            const itemNameGroups = db.archipelago.get('item_name_groups') ?? {};
            const groups = game ? Object.keys(itemNameGroups[game] ?? {}) : [];
            const filtered = groups.filter(g => g.toLowerCase().includes(query));
            await interaction.respond(filtered.slice(0, 25).map(n => ({ name: n, value: n })));
        } else {
            const filtered = SLOT_NAMES.filter(n => n.toLowerCase().includes(query));
            await interaction.respond(filtered.slice(0, 25).map(n => ({ name: n, value: n })));
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        const slotName  = interaction.options.getString('slot-name');
        const groupName = interaction.options.getString('item-group');

        const slotData = db.archipelago.get('slot_data') ?? {};
        const game = slotData[slotName]?.game;
        if (!game) {
            await interaction.editReply(`No game data cached for **${slotName}**. The bot may need to reconnect to Archipelago.`);
            return;
        }

        const itemNameGroups = db.archipelago.get('item_name_groups') ?? {};
        const groupItems = itemNameGroups[game]?.[groupName];
        if (!groupItems || groupItems.length === 0) {
            await interaction.editReply(`No items found in group **${groupName}** for game **${game}**.`);
            return;
        }

        const groupItemSet = new Set(groupItems);
        const history = db.archipelago.get('ap_history') ?? [];
        const receivedCounts = {};
        for (const e of history) {
            if (e.type === 'item' && e.receiver === slotName && groupItemSet.has(e.itemName)) {
                receivedCounts[e.itemName] = (receivedCounts[e.itemName] ?? 0) + 1;
            }
        }

        const lines = Object.entries(receivedCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([item, count]) => `- **${item}**${count > 1 ? ` ×${count}` : ''}`);

        if (lines.length === 0) {
            await interaction.editReply(`No items from group **${groupName}** have been received by **${slotName}** yet.`);
            return;
        }

        const slotEmote = SLOT_EMOTES[slotName] ? ` ${SLOT_EMOTES[slotName]}` : '';
        const header = `## ${slotName}${slotEmote} — ${groupName}`;
        const footer = `**${lines.length}** item${lines.length !== 1 ? 's' : ''} received`;

        const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));

        const generatePage = (page) => {
            const slice = lines.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
            return safeContent(`${header}\n${slice.join('\n')}\n-# Page ${page + 1}/${totalPages} | ${footer}`);
        };

        const generateButtons = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('first').setLabel('⏮️ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
        );

        if (totalPages <= 1) {
            await interaction.editReply(safeContent(`${header}\n${lines.join('\n')}\n-# ${footer}`));
            return;
        }

        let currentPage = 0;
        const response = await interaction.editReply({ content: generatePage(0), components: [generateButtons(0)] });
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'first') currentPage = 0;
            else if (i.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
            else if (i.customId === 'next') currentPage = Math.min(totalPages - 1, currentPage + 1);
            else if (i.customId === 'last') currentPage = totalPages - 1;
            await i.update({ content: generatePage(currentPage), components: [generateButtons(currentPage)] });
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (_) {}
        });
    },
};
