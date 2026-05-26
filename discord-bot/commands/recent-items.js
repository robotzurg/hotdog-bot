const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES, SLOT_EMOTES } = require('../slots.js');

const FLAG_EMOTES = {
    Progression: '<:Progression:1495879488716668988>',
    Useful:      '<:Useful:1495879485407494354>',
    Trap:        '<:Trap:1495879486346887238>',
    Junk:        '<:Junk:1495879487538204804>',
};

const TIMEFRAMES = [
    { name: 'Last 15 minutes', value: '15m',  ms: 15 * 60 * 1000 },
    { name: 'Last hour',       value: '1h',   ms: 60 * 60 * 1000 },
    { name: 'Last 6 hours',    value: '6h',   ms: 6 * 60 * 60 * 1000 },
    { name: 'Last 24 hours',   value: '24h',  ms: 24 * 60 * 60 * 1000 },
    { name: 'Last 7 days',     value: '7d',   ms: 7 * 24 * 60 * 60 * 1000 },
    { name: 'All time',        value: 'all',  ms: null },
];

const ITEMS_PER_PAGE = 15;

const mapEmote = (name) => {
    const emote = SLOT_EMOTES[name];
    return emote ? `${name} ${emote}` : `**${name}**`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recent-items')
        .setDescription('View history for a slot')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The slot to look up')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('role')
                .setDescription('Show items received by or sent from this slot (default: received)')
                .setRequired(false)
                .addChoices(
                    { name: 'Received', value: 'received' },
                    { name: 'Sent', value: 'sent' },
                ))
        .addStringOption(option =>
            option.setName('event-type')
                .setDescription('Which events to show (default: all)')
                .setRequired(false)
                .addChoices(
                    { name: 'All', value: 'all' },
                    { name: 'Items only', value: 'items' },
                    { name: 'Deaths only', value: 'deaths' },
                ))
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('How far back to look (default: all time)')
                .setRequired(false)
                .addChoices(...TIMEFRAMES.map(t => ({ name: t.name, value: t.value }))))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const query = interaction.options.getFocused().toLowerCase();
        const filtered = SLOT_NAMES.filter(n => n.toLowerCase().includes(query));
        await interaction.respond(filtered.slice(0, 25).map(n => ({ name: n, value: n })));
    },

    async execute(interaction) {
        await interaction.deferReply();

        const slotName  = interaction.options.getString('slot-name');
        const role      = interaction.options.getString('role') ?? 'received';
        const eventType = interaction.options.getString('event-type') ?? 'all';
        const timeframe = interaction.options.getString('timeframe') ?? 'all';

        const tfConfig = TIMEFRAMES.find(t => t.value === timeframe);
        const cutoff = tfConfig?.ms ? Date.now() - tfConfig.ms : null;

        const history = db.archipelago.get('ap_history') ?? [];

        const entries = history.filter(e => {
            if (cutoff && e.timestamp < cutoff) return false;
            if (e.type === 'item') {
                if (eventType === 'deaths') return false;
                return role === 'received' ? e.receiver === slotName : e.sender === slotName;
            }
            if (e.type === 'death') {
                if (eventType === 'items') return false;
                return e.source === slotName;
            }
            return false;
        }).reverse();

        const slotEmote = SLOT_EMOTES[slotName] ? ` ${SLOT_EMOTES[slotName]}` : '';
        const roleLabel = role === 'received' ? 'Received by' : 'Sent from';
        const tfLabel = tfConfig?.name ?? 'All time';
        let header = `## ${roleLabel} ${slotName}${slotEmote}`;
        if (eventType === 'deaths') header = `## Deaths for ${slotName}${slotEmote}`;
        else if (eventType === 'all') header = `## History for ${slotName}${slotEmote}`;
        header += ` — ${tfLabel}`;

        if (entries.length === 0) {
            await interaction.editReply(`${header}\n*No events found.*`);
            return;
        }

        const lines = entries.map(e => {
            const ts = `<t:${Math.floor(e.timestamp / 1000)}:R>`;
            if (e.type === 'item') {
                const flagEmote = FLAG_EMOTES[e.group] ?? '';
                const other = role === 'received'
                    ? (e.sender ? `from ${mapEmote(e.sender)}` : '')
                    : `to ${mapEmote(e.receiver)}`;
                return `- **${e.itemName}** ${flagEmote} ${other} · ${ts}`;
            }
            const cause = e.cause ? `: ${e.cause}` : '';
            return `- 🪦 Died${cause} · ${ts}`;
        });

        const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));
        let currentPage = 0;

        const generatePage = (page) => {
            const slice = lines.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
            return `${header}\n${slice.join('\n')}\n-# Page ${page + 1}/${totalPages} | **${entries.length}** events`;
        };

        const generateButtons = (page) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('first').setLabel('⏮️ First').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('prev').setLabel('◀️ Previous').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
            new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
        );

        if (totalPages <= 1) {
            await interaction.editReply(`${header}\n${lines.join('\n')}\n-# **${entries.length}** events`);
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
