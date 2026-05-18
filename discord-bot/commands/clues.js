const { SlashCommandBuilder } = require('discord.js');
const mm = require('../murder-mystery.js');

function statusBadge(status) {
    if (status === 'AVAILABLE')    return '✅ AVAILABLE';
    if (status === 'INVESTIGATED') return '🕵️ INVESTIGATED';
    return '❌ LOCKED';
}

function formatBoard(player, board, progress) {
    const lines = [];
    lines.push(`## Clues for ${player}`);
    lines.push('');
    lines.push(`**Your investigations:**`);
    for (const c of board.clues) {
        const head = `- ${c.template} — ${statusBadge(c.status)}`;
        if (c.status === 'INVESTIGATED' && c.text) {
            lines.push(`${head}\n  > ${c.text}`);
        } else {
            lines.push(head);
        }
    }

    lines.push('');
    lines.push(`**Progressive Share charges:** ${board.sharesAvailable} available (used ${board.sharesUsed} / received ${board.sharesReceived})`);

    lines.push('');
    if (board.sharedToMe.length === 0) {
        lines.push(`**Shared to you:** *(nothing yet)*`);
    } else {
        lines.push(`**Shared to you:**`);
        board.sharedToMe.forEach((s, i) => {
            lines.push(`- *(${i + 1})* from **${s.from}** — ${s.template} (originally **${s.sourcePlayer}**'s clue)`);
            lines.push(`  > ${s.text}`);
        });
    }

    lines.push('');
    const pct = (progress.pct * 100).toFixed(0);
    lines.push(`-# Multiworld progress: ${progress.received}/${progress.total} items received (${pct}%).`);

    return lines.join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clues')
        .setDescription('DMs you your current clue board.'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        if (!mm.isGameActive()) {
            await interaction.editReply('No Murder Mystery game is currently active.');
            return;
        }

        const player = mm.resolveDiscordUser(interaction.user.id);
        if (!player) {
            await interaction.editReply('Your Discord ID is not registered as a Murder Mystery player. Ask an admin to add you to `PLAYER_DISCORD_IDS` in `murdermystery-ap-info.js`.');
            return;
        }

        let received;
        try {
            received = await mm.readReceivedItems();
        } catch (err) {
            console.error('clues: failed to read received items', err);
            await interaction.editReply(`Failed to query Archipelago: ${err.message}`);
            return;
        }

        const board = mm.buildClueBoard(player, received);
        const progress = mm.concludeProgress(received);
        const content = formatBoard(player, board, progress);

        try {
            await interaction.user.send(content);
            await interaction.editReply('Sent your clue board via DM.');
        } catch (err) {
            console.error('clues: failed to DM user', err);
            await interaction.editReply('Could not DM you — make sure DMs from server members are enabled.');
        }
    },
};
