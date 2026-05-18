const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const mm = require('../murder-mystery.js');
const { PERSONS } = require('../murdermystery-ap-info.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mm-status')
        .setDescription('Admin: view the full Murder Mystery game state.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!mm.isGameActive()) {
            await interaction.editReply('No Murder Mystery game is currently active.');
            return;
        }

        let received;
        try {
            received = await mm.readReceivedItems();
        } catch (err) {
            console.error('mm-status: failed to read received items', err);
            await interaction.editReply(`Failed to query Archipelago: ${err.message}`);
            return;
        }

        const sol = mm.getSolution();
        const winner = mm.getWinner();
        const progress = mm.concludeProgress(received);
        const wrong = mm.getWrongConclusions();
        const sharedMurderer = mm.getSharedToMurdererCount();

        const lines = [];
        lines.push(`## Murder Mystery - Game State`);
        lines.push(`- Solution: **${sol.murderer}** in **${sol.location}** with the **${sol.weapon}**`);
        lines.push(`- Winner: ${winner ? `**${winner}**` : '*(not yet)*'}`);
        lines.push(`- Wrong conclusions: ${wrong}/${mm.MAX_WRONG_CONCLUSIONS + 1}`);
        lines.push(`- Important hints shared to murderer: ${sharedMurderer}/${mm.MURDERER_SHARE_WIN_COUNT}`);
        lines.push(`- Multiworld progress: ${progress.received}/${progress.total} (${(progress.pct * 100).toFixed(0)}%)`);
        lines.push(`- Important hints received: ${progress.importantReceived}/${progress.importantTotal}`);
        lines.push(`- /conclude unlocked: ${mm.concludeAvailable(received) ? 'yes' : 'no'}`);
        lines.push('');
        lines.push(`### Per-player`);

        for (const p of PERSONS) {
            const board = mm.buildClueBoard(p, received);
            const investigated = board.clues.filter(c => c.status === 'INVESTIGATED').length;
            const available    = board.clues.filter(c => c.status === 'AVAILABLE').length;
            const locked       = board.clues.filter(c => c.status === 'LOCKED').length;
            lines.push(
                `- **${p}**: investigated ${investigated}, available ${available}, locked ${locked}; `
              + `shares ${board.sharesUsed}/${board.sharesReceived} used; `
              + `shared-to-me ${board.sharedToMe.length}`
            );
        }

        await interaction.editReply(lines.join('\n'));
    },
};
