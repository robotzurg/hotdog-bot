const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_EMOTES } = require('../slots.js');
const { PLAYER_SLOTS } = require('../players.js');

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

const ITEMS_PER_PAGE = 10;
const MAX_CONTENT = 1990;

const safeContent = (str) => str.length > MAX_CONTENT ? str.slice(0, MAX_CONTENT - 3) + '...' : str;

function parseEmote(emoteStr) {
    if (!emoteStr) return null;
    const match = emoteStr.match(/^<:(\w+):(\d+)>$/);
    return match ? { name: match[1], id: match[2] } : null;
}

const mapEmote = (name) => {
    const emote = SLOT_EMOTES[name];
    return emote ? `${name} ${emote}` : `**${name}**`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('recent-items-all')
        .setDescription('View item history for all slots of a player')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('The player whose slots to check')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('How far back to look (default: all time)')
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

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        const filtered = Object.keys(PLAYER_SLOTS).filter(n => n.toLowerCase().includes(focused));
        await interaction.respond(filtered.slice(0, 25).map(n => ({ name: n, value: n })));
    },

    async execute(interaction) {
        await interaction.deferReply();

        const player     = interaction.options.getString('player');
        const timeframe  = interaction.options.getString('timeframe') ?? 'all';
        const typeFilter = interaction.options.getString('type');

        const slots = PLAYER_SLOTS[player];
        if (!slots) {
            await interaction.editReply(`Unknown player: **${player}**`);
            return;
        }

        const tfConfig = TIMEFRAMES.find(t => t.value === timeframe);
        const cutoff = tfConfig?.ms ? Date.now() - tfConfig.ms : null;
        const typeSuffix = typeFilter ? ` - ${typeFilter} ${FLAG_EMOTES[typeFilter]}` : '';
        const timeLabel = tfConfig?.name ?? 'All time';

        const history = db.archipelago.get('ap_history') ?? [];

        const allEntries = history.filter(e => {
            if (e.type !== 'item') return false;
            if (cutoff && e.timestamp < cutoff) return false;
            if (typeFilter && e.group !== typeFilter) return false;
            return slots.includes(e.receiver);
        }).reverse();

        if (allEntries.length === 0) {
            await interaction.editReply(`## ${player} - Recent Items - ${timeLabel}${typeSuffix}\n*No items found.*`);
            return;
        }

        // Group by receiver for slot drill-down
        const bySlot = {};
        for (const slot of slots) bySlot[slot] = [];
        for (const e of allEntries) {
            if (bySlot[e.receiver]) bySlot[e.receiver].push(e);
        }
        const slotsWithItems = slots.filter(s => bySlot[s].length > 0);

        // --- line builders ---

        const combinedLines = () => allEntries.map(e => {
            const ts = `<t:${Math.floor(e.timestamp / 1000)}:R>`;
            const flagEmote = FLAG_EMOTES[e.group] ?? '';
            const sender   = e.sender   ? mapEmote(e.sender)   : '?';
            const receiver = e.receiver ? mapEmote(e.receiver) : '?';
            return `- **${e.itemName}** ${flagEmote} ${sender} -> ${receiver} ${ts}`;
        });

        const slotLines = (slot) => bySlot[slot].map(e => {
            const ts = `<t:${Math.floor(e.timestamp / 1000)}:R>`;
            const flagEmote = FLAG_EMOTES[e.group] ?? '';
            const sender = e.sender ? mapEmote(e.sender) : '?';
            return `- **${e.itemName}** ${flagEmote} from ${sender} ${ts}`;
        });

        // --- content builders ---

        const buildCombinedContent = (page) => {
            const lines = combinedLines();
            const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));
            const slice = lines.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
            return {
                content: safeContent(`## ${player} - All Items - ${timeLabel}${typeSuffix}\n${slice.join('\n')}\n-# Page ${page + 1}/${totalPages} | **${lines.length}** items`),
                totalPages,
            };
        };

        const buildDetailContent = (slot, page) => {
            const lines = slotLines(slot);
            const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));
            const slice = lines.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);
            const emote = SLOT_EMOTES[slot] ? ` ${SLOT_EMOTES[slot]}` : '';
            return {
                content: safeContent(`## ${slot}${emote} - ${timeLabel}${typeSuffix}\n${slice.join('\n')}\n-# Page ${page + 1}/${totalPages} | **${lines.length}** items`),
                totalPages,
            };
        };

        // --- component builders ---

        const buildSelectMenu = (selectedSlot = null) => {
            const options = slotsWithItems.slice(0, 25).map(slot => {
                const count = bySlot[slot].length;
                const emoji = parseEmote(SLOT_EMOTES[slot]);
                const option = new StringSelectMenuOptionBuilder()
                    .setLabel(slot)
                    .setValue(slot)
                    .setDescription(`${count} item${count !== 1 ? 's' : ''}`)
                    .setDefault(slot === selectedSlot);
                if (emoji) option.setEmoji(emoji);
                return option;
            });
            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('slot_select')
                    .setPlaceholder('Select a slot to view details...')
                    .addOptions(options)
            );
        };

        const combinedComponents = (page, totalPages) => [
            buildSelectMenu(),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('◀️ Prev').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
                new ButtonBuilder().setCustomId('last').setLabel('Last ⏭️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            ),
        ];

        const detailComponents = (slot, page, totalPages) => [
            buildSelectMenu(slot),
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('back_combined').setLabel('All Items').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('prev').setLabel('◀️ Prev').setStyle(ButtonStyle.Primary).setDisabled(page === 0),
                new ButtonBuilder().setCustomId('next').setLabel('Next ▶️').setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1),
            ),
        ];

        // --- initial render (combined) ---

        let mode = 'combined';
        let currentSlot = null;
        let currentPage = 0;

        const { content: initContent, totalPages: initTotal } = buildCombinedContent(0);
        const response = await interaction.editReply({
            content: initContent,
            components: slotsWithItems.length > 0 ? combinedComponents(0, initTotal) : [],
        });

        if (slotsWithItems.length === 0) return;

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'slot_select') {
                mode = 'slot';
                currentSlot = i.values[0];
                currentPage = 0;
                const { content, totalPages } = buildDetailContent(currentSlot, currentPage);
                await i.update({ content, components: detailComponents(currentSlot, currentPage, totalPages) });

            } else if (i.customId === 'back_combined') {
                mode = 'combined';
                currentSlot = null;
                currentPage = 0;
                const { content, totalPages } = buildCombinedContent(currentPage);
                await i.update({ content, components: combinedComponents(currentPage, totalPages) });

            } else if (i.customId === 'prev' || i.customId === 'next' || i.customId === 'last') {
                if (mode === 'slot' && currentSlot) {
                    const lines = slotLines(currentSlot);
                    const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));
                    if (i.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
                    else currentPage = Math.min(totalPages - 1, currentPage + 1);
                    const { content } = buildDetailContent(currentSlot, currentPage);
                    await i.update({ content, components: detailComponents(currentSlot, currentPage, totalPages) });
                } else if (mode === 'combined') {
                    const lines = combinedLines();
                    const totalPages = Math.max(1, Math.ceil(lines.length / ITEMS_PER_PAGE));
                    if (i.customId === 'prev') currentPage = Math.max(0, currentPage - 1);
                    else if (i.customId === 'last') currentPage = totalPages - 1;
                    else currentPage = Math.min(totalPages - 1, currentPage + 1);
                    const { content } = buildCombinedContent(currentPage);
                    await i.update({ content, components: combinedComponents(currentPage, totalPages) });
                }
            }
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (_) {}
        });
    },
};
