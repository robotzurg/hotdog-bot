const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES, SLOT_EMOTES } = require('../slots.js');

const ITEMS_PER_PAGE = 15;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('progression-items')
        .setDescription('List all progression items in a slot\'s inventory')
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
        const port = db.archipelago.get('server_port');

        await interaction.editReply(`Connecting to Archipelago to read **${slotName}**'s inventory...`);

        const { Client } = await import('archipelago.js');
        const client = new Client();

        let received = [];
        try {
            await client.login(`archipelago.gg:${port}`, slotName);
            await new Promise(resolve => setTimeout(resolve, 4000));
            received = [...client.items.received];
            client.socket.disconnect();
        } catch (err) {
            console.error('Progression-items error:', err);
            await interaction.editReply(`Failed to connect: ${err.message}`);
            return;
        }

        const progItems = received.filter(item => item.progression);

        const counts = new Map();
        for (const item of progItems) {
            counts.set(item.name, (counts.get(item.name) ?? 0) + 1);
        }

        const emote = SLOT_EMOTES[slotName] ?? '';
        const header = `## Progression Items For ${slotName}${emote ? ` ${emote}` : ''}`;

        if (counts.size === 0) {
            await interaction.editReply(`${header}\n*No progression items received yet.*`);
            return;
        }

        const sorted = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
        const lines = sorted.map(([name, count]) => count > 1 ? `- **${name}** x${count}` : `- **${name}**`);

        const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));
        const totalProg = progItems.length;
        const uniqueCount = counts.size;
        let currentPage = 0;

        const generatePage = (page) => {
            const start = page * ITEMS_PER_PAGE;
            const pageLines = lines.slice(start, start + ITEMS_PER_PAGE);
            return [
                header,
                ...pageLines,
                `\n-# Page ${page + 1}/${totalPages} | **${uniqueCount}** unique | **${totalProg}** total progression items`
            ].join('\n');
        };

        const generateButtons = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('first').setLabel('⏮️ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
        );

        if (totalPages <= 1) {
            await interaction.editReply([header, ...lines, `-# **${uniqueCount}** unique | **${totalProg}** total progression items`].join('\n'));
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
