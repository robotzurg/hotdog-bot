const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { SLOT_EMOTES } = require('../slots.js');

const FLAG_EMOTES = {
    Progression: '<:Progression:1495879488716668988>',
    Useful:      '<:Useful:1495879485407494354>',
    Trap:        '<:Trap:1495879486346887238>',
    Junk:        '<:Junk:1495879487538204804>',
};

const TIMEFRAMES = [
    { name: 'Last 15 minutes', value: '15m', ms: 15 * 60 * 1000 },
    { name: 'Last hour',       value: '1h',  ms: 60 * 60 * 1000 },
    { name: 'Last 6 hours',    value: '6h',  ms: 6 * 60 * 60 * 1000 },
    { name: 'Last 24 hours',   value: '24h', ms: 24 * 60 * 60 * 1000 },
    { name: 'Last 7 days',     value: '7d',  ms: 7 * 24 * 60 * 60 * 1000 },
    { name: 'All time',        value: 'all', ms: null },
];

const ITEMS_PER_PAGE = 15;

const mapEmote = (name) => {
    const emote = SLOT_EMOTES[name];
    return emote ? `${name} ${emote}` : `**${name}**`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recent-items-all')
        .setDescription('View item history across all slots')
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('How far back to look (default: last hour)')
                .setRequired(false)
                .addChoices(...TIMEFRAMES.map(t => ({ name: t.name, value: t.value }))))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Filter by item type (default: all)')
                .setRequired(false)
                .addChoices(
                    { name: 'Progression', value: 'Progression' },
                    { name: 'Useful',      value: 'Useful' },
                    { name: 'Trap',        value: 'Trap' },
                    { name: 'Junk',        value: 'Junk' },
                ))
        .setDMPermission(false),

    async execute(interaction) {
        await interaction.deferReply();

        const timeframe  = interaction.options.getString('timeframe') ?? '1h';
        const typeFilter = interaction.options.getString('type');

        const tfConfig = TIMEFRAMES.find(t => t.value === timeframe);
        const cutoff = tfConfig?.ms ? Date.now() - tfConfig.ms : null;

        const history = db.archipelago.get('ap_history') ?? [];

        const entries = history.filter(e => {
            if (e.type !== 'item') return false;
            if (cutoff && e.timestamp < cutoff) return false;
            if (typeFilter && e.group !== typeFilter) return false;
            return true;
        }).reverse();

        const typeSuffix = typeFilter ? ` — ${typeFilter} ${FLAG_EMOTES[typeFilter]}` : '';
        const header = `## All Items - ${tfConfig?.name ?? 'All time'}${typeSuffix}`;

        if (entries.length === 0) {
            await interaction.editReply(`${header}\n*No items found.*`);
            return;
        }

        const lines = entries.map(e => {
            const ts = `<t:${Math.floor(e.timestamp / 1000)}:R>`;
            const flagEmote = FLAG_EMOTES[e.group] ?? '';
            const sender = e.sender ? mapEmote(e.sender) : '?';
            const receiver = e.receiver ? mapEmote(e.receiver) : '?';
            return `- **${e.itemName}** ${flagEmote} ${sender} → ${receiver} ${ts}`;
        });

        const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));
        let currentPage = 0;

        const generatePage = (page) => {
            const slice = lines.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
            return `${header}\n${slice.join('\n')}\n-# Page ${page + 1}/${totalPages} | **${entries.length}** items`;
        };

        const generateButtons = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('first').setLabel('⏮️ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
        );

        if (totalPages <= 1) {
            await interaction.editReply(`${header}\n${lines.join('\n')}\n-# **${entries.length}** items`);
            return;
        }

        const response = await interaction.editReply({ content: generatePage(0), components: [generateButtons(0)] });
        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'first') currentPage = 0;
            else if (i.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
            else if (i.customId === 'next') currentPage = Math.min(totalPages - 1, currentPage + 1);
            else if (i.customId === 'last') currentPage = totalPages - 1;
            await i.update({ content: generatePage(currentPage), components: [generateButtons(currentPage)] });
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (_) {}
        });
    },
};
