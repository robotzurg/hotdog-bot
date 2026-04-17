const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES, SLOT_EMOTES } = require('../slots.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hint')
        .setDescription('Hint an item for a slot')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The archipelago slot name to hint as')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('item-name')
                .setDescription('The item name to hint. Use "-" to view hint points')
                .setRequired(true))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = SLOT_NAMES.filter(name => name.toLowerCase().includes(focusedValue));
        await interaction.respond(
            filtered.slice(0, 25).map(name => ({ name, value: name }))
        );
    },

    async execute(interaction) {
        await interaction.deferReply();

        const slotName = interaction.options.getString('slot-name');
        let itemName = interaction.options.getString('item-name');
        const port = db.archipelago.get('server_port');

        const { Client } = await import('archipelago.js');
        const client = new Client();
        const hintResults = [];
        let messageOutput = '';

        client.messages.on('itemHinted', (text, item, found) => {
            hintResults.push({ item, found });
        });

        client.messages.on('message', (text) => {
            messageOutput = text;
        });

        const isAll = itemName === 'all';
        const isPoints = itemName === '-';
        const sendArg = (isAll || isPoints) ? '' : itemName;

        try {
            await client.login(`archipelago.gg:${port}`, slotName);
            await client.messages.say(`!hint ${sendArg}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            client.socket.disconnect();
        } catch (err) {
            console.error('Hint error:', err);
            await interaction.editReply(`Failed to connect or send hint: ${err.message}`);
            return;
        }

        if (isPoints) {
            await interaction.editReply(`## Hint Points for ${slotName}\n${messageOutput}`);
            return;
        }

        const mapEmote = (name) => {
            const emote = SLOT_EMOTES[name];
            return emote ? `${name} ${emote}` : `**${name}**`;
        };

        if (isAll) {
            const unfound = hintResults.filter(({ found }) => !found);
            if (unfound.length === 0) {
                await interaction.editReply(`No unfound hints for **${slotName}**.`);
                return;
            }

            const lines = unfound.map(({ item }) =>
                `- **${item.name}** for ${mapEmote(item.receiver?.name ?? '???')} at **${item.locationName}**${item.sender?.name !== slotName ? ` in ${mapEmote(item.sender?.name ?? '???')}'s world` : ''}`
            );

            const header = `## Unfound Hints for ${slotName}`;
            const itemsPerPage = 10;
            const totalPages = Math.ceil(lines.length / itemsPerPage);

            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            let currentPage = 0;

            const generatePage = (page) => {
                const pageLines = lines.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
                return `${header}\n${pageLines.join('\n')}\n-# Page ${page + 1}/${totalPages} | **${lines.length}** unfound hints`;
            };

            const generateButtons = (page) => new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('first').setLabel('⏮️ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
                new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1)
            );

            if (totalPages <= 1) {
                await interaction.editReply(`${header}\n${lines.join('\n')}\n-# **${lines.length}** unfound hints`);
                return;
            }

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
            return;
        }

        if (hintResults.length === 0) {
            await interaction.editReply(`No hint found for **${itemName}** on **${slotName}**. The item may not exist or was already found.\nOutput from Archipelago: ${messageOutput}`);
            return;
        }

        const lines = hintResults.map(({ item, found }) => {
            const foundTag = found ? ' *(found)*' : '';
            return `- **${item.name}** for ${mapEmote(item.receiver?.name ?? '???')} at **${item.locationName}**${item.sender?.name !== slotName ? ` in ${mapEmote(item.sender?.name ?? '???')}'s world` : ''}${foundTag}`;
        });

        await interaction.editReply(`## Hint result for ${slotName}\n${lines.join('\n')}`);
    },
};
