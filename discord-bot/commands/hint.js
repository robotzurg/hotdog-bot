const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES, SLOT_EMOTES } = require('../slots.js');

const slotOption = (option) =>
    option.setName('slot-name')
        .setDescription('The archipelago slot name to hint as')
        .setRequired(true)
        .setAutocomplete(true);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hint')
        .setDescription('Hint commands for Archipelago')
        .addSubcommand(sub =>
            sub.setName('item')
                .setDescription('Hint a specific item for a slot')
                .addStringOption(slotOption)
                .addStringOption(option =>
                    option.setName('item-name')
                        .setDescription('The item name to hint')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(sub =>
            sub.setName('all')
                .setDescription('Show all unfound hints for a slot')
                .addStringOption(slotOption))
        .addSubcommand(sub =>
            sub.setName('points')
                .setDescription('Show hint points for a slot')
                .addStringOption(slotOption))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);

        if (focused.name === 'slot-name') {
            const query = focused.value.toLowerCase();
            const filtered = SLOT_NAMES.filter(name => name.toLowerCase().includes(query));
            await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
        } else if (focused.name === 'item-name') {
            const query = focused.value.toLowerCase();
            const slotName = interaction.options.get('slot-name')?.value ?? '';
            const slotData = db.archipelago.get('slot_data') ?? {};
            const items = slotData[slotName]?.items ?? [];
            const filtered = items.filter(name => name.toLowerCase().includes(query));
            await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        const sub = interaction.options.getSubcommand();
        const slotName = interaction.options.getString('slot-name');
        const port = db.archipelago.get('server_port');

        const { Client } = await import('archipelago.js');
        const client = new Client();
        const hintResults = [];
        let messageOutput = '';
        let primaryOutput = '';
        let hintPoints = null;
        let capturingHints = true;

        client.messages.on('itemHinted', (_text, item, found) => {
            if (capturingHints) hintResults.push({ item, found });
        });
        client.messages.on('message', (_text) => {
            messageOutput = _text;
            const m = _text.match(/You have (\d+) points/);
            if (m) hintPoints = parseInt(m[1], 10);
        });

        try {
            await client.login(`archipelago.gg:${port}`, slotName);
            await client.messages.say(sub === 'item' ? `!hint ${interaction.options.getString('item-name')}` : '!hint');
            await new Promise(resolve => setTimeout(resolve, 2000));
            // The bare `!hint` output (used by `all`/`points`) includes the points line;
            // `!hint <item>` does not always, so request points explicitly without
            // polluting the item's hint results.
            primaryOutput = messageOutput;
            if (sub === 'item') {
                capturingHints = false;
                await client.messages.say('!hint');
                await new Promise(resolve => setTimeout(resolve, 1500));
            }
            client.socket.disconnect();
        } catch (err) {
            console.error('Hint error:', err);
            await interaction.editReply(`Failed to connect or send hint: ${err.message}`);
            return;
        }

        if (sub === 'points') {
            await interaction.editReply(`## Hint Points for ${slotName}\n${messageOutput}`);
            return;
        }

        const mapEmote = (name) => {
            const emote = SLOT_EMOTES[name];
            return emote ? `${name} ${emote}` : `**${name}**`;
        };

        const pointsTag = hintPoints !== null ? `**${hintPoints}** hint points left` : '';
        const footerSuffix = pointsTag ? ` | ${pointsTag}` : '';

        if (sub === 'all') {
            const finishedGames = db.archipelago.get('finished_games') ?? [];
            const unfound = hintResults.filter(({ found, item }) =>
                !found && !finishedGames.includes(item.receiver?.name)
            );
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
            let currentPage = 0;

            const generatePage = (page) => {
                const pageLines = lines.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
                return `${header}\n${pageLines.join('\n')}\n-# Page ${page + 1}/${totalPages} | **${lines.length}** unfound hints${footerSuffix}`;
            };

            const generateButtons = (page) => new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('first').setLabel('⏮️ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
                new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1)
            );

            if (totalPages <= 1) {
                await interaction.editReply(`${header}\n${lines.join('\n')}\n-# **${lines.length}** unfound hints${footerSuffix}`);
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

        // sub === 'item'
        const itemName = interaction.options.getString('item-name');
        if (hintResults.length === 0) {
            await interaction.editReply(`No hint found for **${itemName}** on **${slotName}**. The item may not exist or was already found.\nOutput from Archipelago: ${primaryOutput}`);
            return;
        }

        const unfoundResults = hintResults.filter(({ found }) => !found);
        if (unfoundResults.length === 0) {
            await interaction.editReply(`All hints for **${itemName}** on **${slotName}** have already been found.`);
            return;
        }

        const lines = unfoundResults.map(({ item }) =>
            `- **${item.name}** for ${mapEmote(item.receiver?.name ?? '???')} at **${item.locationName}**${item.sender?.name !== slotName ? ` in ${mapEmote(item.sender?.name ?? '???')}'s world` : ''}`
        );

        const itemFooter = pointsTag ? `\n-# ${pointsTag}` : '';
        await interaction.editReply(`## Hint result for ${slotName}\n${lines.join('\n')}${itemFooter}`);
    },
};
