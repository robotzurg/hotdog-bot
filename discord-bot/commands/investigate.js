const { SlashCommandBuilder } = require('discord.js');
const mm = require('../murder-mystery.js');
const { HINT_TEMPLATES } = require('../murdermystery-ap-info.js');

const SLOT_CHOICES = HINT_TEMPLATES.map(t => ({ name: t, value: t }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('investigate')
        .setDescription('Investigate one of your AVAILABLE clue slots — DMs you the result.')
        .addStringOption(option =>
            option.setName('slot')
                .setDescription('Which clue slot to investigate')
                .setRequired(true)
                .addChoices(...SLOT_CHOICES)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!mm.isGameActive()) {
            await interaction.editReply('No Murder Mystery game is currently active.');
            return;
        }

        const player = mm.resolveDiscordUser(interaction.user.id);
        if (!player) {
            await interaction.editReply('Your Discord ID is not registered as a Murder Mystery player.');
            return;
        }

        const template = interaction.options.getString('slot');

        let received;
        try {
            received = await mm.readReceivedItems();
        } catch (err) {
            console.error('investigate: failed to read received items', err);
            await interaction.editReply(`Failed to query Archipelago: ${err.message}`);
            return;
        }

        const board = mm.buildClueBoard(player, received);
        const clue = board.clues.find(c => c.template === template);

        if (!clue || clue.status === 'LOCKED') {
            await interaction.editReply(`**${template}** is LOCKED for you — the multiworld hasn't sent that item to HDWMystery yet.`);
            return;
        }
        if (clue.status === 'INVESTIGATED') {
            await interaction.editReply(`You've already investigated **${template}**. Use /clues to see the result again.`);
            return;
        }

        const locationId = mm.markInvestigated(player, template);
        const text = mm.getHintText(player, template);

        try {
            await mm.sendChecks([locationId]);
        } catch (err) {
            console.error('investigate: failed to send AP check', err);
            // The investigation has already been recorded; we surface the error
            // but don't roll back, otherwise the clue would be lost on retry.
            await interaction.editReply(`Investigation recorded but the AP check failed to send: ${err.message}. Tell an admin.`);
        }

        try {
            await interaction.user.send(`## ${template} — ${player}\n${text}`);
            await interaction.editReply(`Investigated **${template}**. Result sent via DM.`);
        } catch (err) {
            console.error('investigate: failed to DM user', err);
            await interaction.editReply(`Investigated **${template}**, but I couldn't DM you. Enable DMs from server members and run /clues to see the result.`);
        }
    },
};
