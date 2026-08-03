const { SlashCommandBuilder, MessageFlags, InteractionContextType, PermissionFlagsBits } = require('discord.js');
const mm = require('../murder-mystery.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mm-start')
        .setDescription('Start a new Murder Mystery game (rolls murderer, location, weapon).')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        let result;
        try {
            result = mm.startGame();
        } catch (err) {
            await interaction.editReply(`Could not start game:\n\`\`\`\n${err.message}\n\`\`\``);
            return;
        }
        const { murderer, location, weapon, importantCount } = result;
        await interaction.editReply(
            `New Murder Mystery game started (loaded from \`murdermystery-hints.json\`).\n`
          + `- Murderer: **${murderer}**\n`
          + `- Location: **${location}**\n`
          + `- Weapon: **${weapon}**\n`
          + `- Important hints flagged: **${importantCount}**\n\n`
          + `All player state has been reset. Tell people to use /clues to view their board.`
        );
    },
};
