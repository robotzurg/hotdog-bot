const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES, SLOT_EMOTES } = require('../slots.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('all-hints')
        .setDescription('List all hints for a slot')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The archipelago slot name to check hints for')
                .setRequired(true)
                .setAutocomplete(true))
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
        const port = db.archipelago.get('server_port');

        const { Client } = await import('archipelago.js');
        const client = new Client();

        let hints;
        try {
            const [resolvedHints] = await Promise.race([
                Promise.all([
                    client.items.wait('hintsInitialized'),
                    client.login(`archipelago.gg:${port}`, slotName),
                ]).then(([h]) => [h]),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timed out waiting for hints')), 10000)),
            ]);
            hints = resolvedHints;
        } catch (err) {
            console.error('Hints error:', err);
            await interaction.editReply(`Failed to fetch hints: ${err.message}`);
            return;
        } finally {
            try { client.socket.disconnect(); } catch (_) {}
        }

        if (!hints || hints.length === 0) {
            await interaction.editReply(`No hints found for **${slotName}**.`);
            return;
        }

        const mapEmote = (name) => {
            const emote = SLOT_EMOTES[name];
            return emote ? `${name} ${emote}` : `**${name}**`;
        };

        // Unfound hints first, then found
        const sorted = [...hints].sort((a, b) => a.found - b.found);

        const lines = sorted.map(hint => {
            const foundTag = hint.found ? ' *(found)*' : '';
            const entrance = hint.entrance && hint.entrance !== 'Vanilla' ? ` via **${hint.entrance}**` : '';
            return `- **${hint.item.name}** for ${mapEmote(hint.item.receiver.name)} at **${hint.item.locationName}** in ${mapEmote(hint.item.sender.name)}'s world${entrance}${foundTag}`;
        });

        const header = `## Hints for ${slotName}\n`;
        const body = lines.join('\n');

        if (header.length + body.length > 2000) {
            const chunks = [];
            let chunk = header;
            for (const line of lines) {
                if (chunk.length + line.length + 1 > 2000) {
                    chunks.push(chunk);
                    chunk = '';
                }
                chunk += line + '\n';
            }
            if (chunk) chunks.push(chunk);
            await interaction.editReply(chunks[0]);
            for (let i = 1; i < chunks.length; i++) {
                await interaction.followUp(chunks[i]);
            }
        } else {
            await interaction.editReply(header + body);
        }
    },
};
