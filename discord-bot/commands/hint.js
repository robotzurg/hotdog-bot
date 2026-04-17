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
        let messageOutput = "";
        let fullMsgOutput = [];
        let outputItemName = "N/A";

        client.messages.on('itemHinted', (text, item, found) => {
            hintResults.push({ item, found });
        });

        client.messages.on('message', (text) => {
            messageOutput = text;
            fullMsgOutput.push(text);
        });

        try {
            if (itemName == '-' || itemName == 'all') {
                outputItemName = '';
            }

            await client.login(`archipelago.gg:${port}`, slotName);
            await client.messages.say(`!hint ${itemName}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            client.socket.disconnect();
        } catch (err) {
            console.error('Hint error:', err);
            await interaction.editReply(`Failed to connect or send hint: ${err.message}`);
            return;
        }

        if (itemName === '') {
            await interaction.editReply(`## Hint Points for ${slotName}\n${messageOutput}`);
            return;
        }

        if (itemName === 'all') {
            await interaction.editReply(`## All Hints for ${slotName}\n${fullMsgOutput.join('\n')}`);
        }

        if (hintResults.length === 0) {
            await interaction.editReply(`No hint found for **${itemName}** on **${slotName}**. The item may not exist or was already found.\nOutput from Archipelago: ${messageOutput}`);
            return;
        }

        const mapEmote = (name) => {
            const emote = SLOT_EMOTES[name];
            return emote ? `${name} ${emote}` : `**${name}**`;
        };

        const lines = hintResults.map(({ item, found }) => {
            const foundTag = found ? ' *(found)*' : '';
            return `- **${item.name}** for ${mapEmote(item.receiver.name)} is at **${item.locationName}** in ${mapEmote(item.sender.name)}'s world${foundTag}`;
        });

        await interaction.editReply(`## Hint result for ${slotName}\n${lines.join('\n')}`);
    },
};
