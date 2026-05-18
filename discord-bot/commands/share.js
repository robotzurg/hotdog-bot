const { SlashCommandBuilder } = require('discord.js');
const mm = require('../murder-mystery.js');
const { PERSONS } = require('../murdermystery-ap-info.js');

const PLAYER_CHOICES = PERSONS.map(p => ({ name: p, value: p }));

// hint values are encoded as `self::<template>` or `shared::<index>` so the
function encodeSelf(template) { return `self::${template}`; }
function encodeShared(index) { return `shared::${index}`; }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('share')
        .setDescription('Use a Progressive Share charge to send one of your hints to another player.')
        .addStringOption(option =>
            option.setName('hint')
                .setDescription('Which hint to share')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('player')
                .setDescription('Which player to share it with')
                .setRequired(true)
                .addChoices(...PLAYER_CHOICES)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const player = mm.resolveDiscordUser(interaction.user.id);
        if (!player) {
            await interaction.respond([]);
            return;
        }

        const state = mm.getPlayerState(player);
        const options = [];

        for (const template of Object.keys(state.investigated)) {
            if (state.investigated[template] === true) {
                options.push({
                    name: `${template} (yours)`,
                    value: encodeSelf(template),
                });
            }
        }
        state.shared_to_me.forEach((s, i) => {
            options.push({
                name: `${s.template} (from ${s.from}, originally ${s.sourcePlayer}'s)`,
                value: encodeShared(i),
            });
        });

        const filtered = options.filter(o => o.name.toLowerCase().includes(focused));
        await interaction.respond(filtered.slice(0, 25));
    },

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

        const hintValue = interaction.options.getString('hint');
        const targetPlayer = interaction.options.getString('player');

        if (targetPlayer === player) {
            await interaction.editReply(`You can't share a hint with yourself.`);
            return;
        }

        let received;
        try {
            received = await mm.readReceivedItems();
        } catch (err) {
            console.error('share: failed to read received items', err);
            await interaction.editReply(`Failed to query Archipelago: ${err.message}`);
            return;
        }

        const board = mm.buildClueBoard(player, received);

        if (board.sharesAvailable <= 0) {
            await interaction.editReply(`You have no Progressive Share charges available right now.`);
            return;
        }

        // Resolve the hint reference.
        let hint = null;
        if (hintValue.startsWith('self::')) {
            const template = hintValue.slice('self::'.length);
            const clue = board.clues.find(c => c.template === template);
            if (!clue || clue.status !== 'INVESTIGATED') {
                await interaction.editReply(`You haven't investigated **${template}** yet, so you can't share it.`);
                return;
            }
            hint = { sourcePlayer: player, template };
        } else if (hintValue.startsWith('shared::')) {
            const idx = parseInt(hintValue.slice('shared::'.length), 10);
            const entry = board.sharedToMe[idx];
            if (!entry) {
                await interaction.editReply(`That shared hint is no longer in your pool.`);
                return;
            }
            hint = { sourcePlayer: entry.sourcePlayer, template: entry.template };
        } else {
            await interaction.editReply(`Unrecognised hint value.`);
            return;
        }

        const result = mm.recordShare({
            caller: { player, discordId: interaction.user.id },
            hint,
            targetPlayer,
            sharesReceived: board.sharesReceived,
        });

        if (!result.locationId) {
            const reason = result.reason === 'out-of-share-locations'
                ? `You've already used both of your Share locations.`
                : `You have no Progressive Share charges available.`;
            await interaction.editReply(reason);
            return;
        }

        try {
            await mm.sendChecks([result.locationId]);
        } catch (err) {
            console.error('share: failed to send AP check', err);
            await interaction.editReply(`Share recorded but the AP check failed to send: ${err.message}. Tell an admin.`);
            return;
        }

        await interaction.editReply(
            `Shared **${hint.sourcePlayer === player ? hint.template : `${hint.template} (originally ${hint.sourcePlayer}'s)`}** with **${targetPlayer}**.`
        );
    },
};
