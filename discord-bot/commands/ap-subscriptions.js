const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ap-subscriptions')
        .setDescription('List your active Archipelago item subscriptions')
        .setDMPermission(false),

    async execute(interaction) {
        const userId = interaction.user.id;
        const subscriptions = (db.archipelago.get('subscriptions') ?? []).filter(s => s.userId === userId);

        if (subscriptions.length === 0) {
            await interaction.reply({ content: 'You have no active subscriptions. Use `/ap-subscribe` to add one.', ephemeral: true });
            return;
        }

        const lines = subscriptions.map((s, i) =>
            `**${i + 1}.** **${s.slot}** — ${s.type === 'group' ? `Group: ${s.value}` : `Item: ${s.value}`}`
        );

        await interaction.reply({
            content: `## Your AP Subscriptions\n${lines.join('\n')}\n-# Use \`/ap-subscribe\` with the same options to unsubscribe.`,
            ephemeral: true,
        });
    },
};
