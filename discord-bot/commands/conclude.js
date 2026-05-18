const { SlashCommandBuilder } = require('discord.js');
const mm = require('../murder-mystery.js');
const { PERSONS, LOCATION_POOL, WEAPON_POOL } = require('../murdermystery-ap-info.js');

const PERSON_CHOICES   = PERSONS.map(p => ({ name: p, value: p }));
const LOCATION_CHOICES = LOCATION_POOL.map(l => ({ name: l, value: l }));
const WEAPON_CHOICES   = WEAPON_POOL.map(w => ({ name: w, value: w }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('conclude')
        .setDescription('Submit a final guess at the murderer, location, and weapon.')
        .addStringOption(option =>
            option.setName('murderer').setDescription('Who did it').setRequired(true).addChoices(...PERSON_CHOICES))
        .addStringOption(option =>
            option.setName('location').setDescription('Where').setRequired(true).addChoices(...LOCATION_CHOICES))
        .addStringOption(option =>
            option.setName('weapon').setDescription('With what').setRequired(true).addChoices(...WEAPON_CHOICES))
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        if (!mm.isGameActive()) {
            await interaction.editReply('No Murder Mystery game is currently active.');
            return;
        }
        const existingWinner = mm.getWinner();
        if (existingWinner) {
            await interaction.editReply(`The game has already concluded (winner: **${existingWinner}**).`);
            return;
        }

        let received;
        try {
            received = await mm.readReceivedItems();
        } catch (err) {
            console.error('conclude: failed to read received items', err);
            await interaction.editReply(`Failed to query Archipelago: ${err.message}`);
            return;
        }

        const progress = mm.concludeProgress(received);
        if (!mm.concludeAvailable(received)) {
            const pct = (progress.pct * 100).toFixed(0);
            const threshold = (mm.CONCLUDE_THRESHOLD_PCT * 100).toFixed(0);
            const pctGate = progress.pct >= mm.CONCLUDE_THRESHOLD_PCT ? '✅' : '❌';
            const impGate = progress.importantComplete ? '✅' : '❌';
            await interaction.editReply(
                `Conclusion is locked. Both gates must pass:\n`
              + `- ${pctGate} Multiworld progress: **${pct}%** (${progress.received}/${progress.total}) - need **${threshold}%**\n`
              + `- ${impGate} Important hints received: **${progress.importantReceived}/${progress.importantTotal}** - need all`
            );
            return;
        }

        const murderer = interaction.options.getString('murderer');
        const location = interaction.options.getString('location');
        const weapon   = interaction.options.getString('weapon');

        const outcome = mm.submitConclusion({ murderer, location, weapon });

        if (outcome.goalReached) {
            try {
                await mm.sendGoal();
            } catch (err) {
                console.error('conclude: failed to send AP goal', err);
            }
        }

        if (outcome.correct) {
            await interaction.editReply(
                `🕵️ **Conclusion correct - detectives win!**\n`
              + `It was **${murderer}** in **${location}** with the **${weapon}**.`
            );
            return;
        }

        if (outcome.winner === 'murderer-wrong') {
            const sol = outcome.solution;
            await interaction.editReply(
                `❌ Wrong (${outcome.wrong}/${mm.MAX_WRONG_CONCLUSIONS + 1}). The detectives have run out of attempts - **the murderer wins!**\n`
              + `The truth: **${sol.murderer}** in **${sol.location}** with the **${sol.weapon}**.`
            );
            return;
        }

        await interaction.editReply(
            `❌ That conclusion is incorrect. **${outcome.remaining}** attempts remaining before the murderer wins.`
        );
    },
};

