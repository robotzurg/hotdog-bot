const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES, SLOT_EMOTES } = require('../slots.js');
const { runTrackerForSlot } = require('../tracker.js');

const ITEMS_PER_PAGE = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-logic')
        .setDescription('Check your in logic checks')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The archipelago slot name to check')
                .setRequired(true)
                .setAutocomplete(true))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const finishedGames = db.archipelago.get('finished_games') ?? [];
        const filtered = SLOT_NAMES.filter(name =>
            !finishedGames.includes(name) && name.toLowerCase().includes(focusedValue)
        );
        await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
    },

    async execute(interaction) {
        await interaction.deferReply();

        const slotName = interaction.options.getString('slot-name');
        const finishedGames = db.archipelago.get('finished_games') ?? [];

        if (finishedGames.includes(slotName)) {
            const emote = SLOT_EMOTES[slotName] ?? '';
            await interaction.editReply(`## ${slotName}${emote ? ` ${emote}` : ''} has been goaled!`);
            return;
        }

        await interaction.editReply(`Gathering Universal Tracker data, this may take a moment...`);

        const port = db.archipelago.get('server_port');

        const { items, hintedCount } = await runTrackerForSlot(slotName, port);

        const emote = SLOT_EMOTES[slotName] ?? '';
        const header = `## In Logic Checks For ${slotName}${emote ? ` ${emote}` : ''}`;
        const checks = items.length;
        const hintSuffix = hintedCount > 0 ? ` | **${hintedCount}** Hinted` : '';
        const totalPages = Math.max(1, Math.ceil(checks / ITEMS_PER_PAGE));
        let currentPage = 0;

        const generatePage = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const pageItems = items.slice(start, start + ITEMS_PER_PAGE);
            return [
                header,
                ...pageItems,
                `\n-# Page ${page + 1}/${totalPages} | **${checks}** In Logic${hintSuffix}`
            ].join('\n');
        };

        const generateButtons = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('first').setLabel('⏮️ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
        );

        if (totalPages <= 1) {
            await interaction.editReply([header, ...items, `-# (**${checks}** In Logic${hintSuffix})`].join('\n'));
            return;
        }

        const response = await interaction.editReply({
            content: generatePage(currentPage),
            components: [generateButtons(currentPage)]
        });

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            switch (i.customId) {
                case 'first': currentPage = 0; break;
                case 'prev': currentPage = Math.max(0, currentPage - 1); break;
                case 'next': currentPage = Math.min(totalPages - 1, currentPage + 1); break;
                case 'last': currentPage = totalPages - 1; break;
            }
            await i.update({ content: generatePage(currentPage), components: [generateButtons(currentPage)] });
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (e) {}
        });
    },
};
