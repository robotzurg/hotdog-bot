const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const mm = require('../murder-mystery.js');
const { PERSONS, HINT_TEMPLATES, LOCATION_NAME_TO_ID } = require('../murdermystery-ap-info.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resync-mm')
        .setDescription('Rebuild Murder Mystery player state from Archipelago checked locations')
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        if (!mm.isGameActive()) {
            await interaction.editReply('No active Murder Mystery game. Run `/mm-start` first, then resync.');
            return;
        }

        await interaction.editReply('Connecting to Archipelago…');

        let client;
        try {
            client = await mm.mmConnect();
        } catch (err) {
            await interaction.editReply(`Failed to connect to Archipelago: ${err.message}`);
            return;
        }

        // Give ReceivedItems and Connected packet data time to arrive
        await new Promise(r => setTimeout(r, 2000));

        const checkedIds = new Set(client.room.checkedLocations);
        try { client.socket.disconnect(); } catch (_) {}

        let totalInvestigations = 0;
        let totalShareChecks = 0;

        for (const person of PERSONS) {
            const investigated = {};
            for (const template of HINT_TEMPLATES) {
                const locId = LOCATION_NAME_TO_ID[`${template} - ${person}`];
                if (locId && checkedIds.has(locId)) {
                    investigated[template] = true;
                    totalInvestigations++;
                }
            }

            let sharesUsed = 0;
            for (let i = 1; i <= 2; i++) {
                const locId = LOCATION_NAME_TO_ID[`Share ${i} - ${person}`];
                if (locId && checkedIds.has(locId)) {
                    sharesUsed++;
                    totalShareChecks++;
                }
            }

            db.murder.set(`player_${person}`, {
                investigated,
                shares_used: sharesUsed,
                shared_to_me: [],
            });
        }

        db.murder.set('share_checks_sent', totalShareChecks);
        // shared_to_murderer_count can't be determined from AP data alone
        db.murder.set('shared_to_murderer_count', 0);

        const solution = mm.getSolution();
        await interaction.editReply(
            `## Murder Mystery Resynced\n` +
            `- **${totalInvestigations}** investigations recovered\n` +
            `- **${totalShareChecks}** share locations checked\n` +
            `- Received shares (\`shared_to_me\`) cannot be recovered from Archipelago — each player's shared hints list has been reset\n` +
            `-# Solution locked in: ${solution.murderer} | ${solution.location} | ${solution.weapon}`
        );
    },
};
