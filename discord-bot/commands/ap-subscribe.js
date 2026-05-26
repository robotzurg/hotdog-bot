const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');
const { SLOT_NAMES } = require('../slots.js');

const GROUPS = ['Progression', 'Useful', 'Trap', 'Junk'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ap-subscribe')
        .setDescription('Subscribe (or unsubscribe) to DMs when a slot receives a specific item or item group')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The slot to watch')
                .setRequired(true)
                .setAutocomplete(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Subscribe to a specific item name or an item group')
                .setRequired(true)
                .addChoices(
                    { name: 'Item', value: 'item' },
                    { name: 'Group', value: 'group' },
                ))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('Item name, or group: Progression / Useful / Trap / Junk')
                .setRequired(true)
                .setAutocomplete(true))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);

        if (focused.name === 'slot-name') {
            const query = focused.value.toLowerCase();
            const filtered = SLOT_NAMES.filter(n => n.toLowerCase().includes(query));
            await interaction.respond(filtered.slice(0, 25).map(n => ({ name: n, value: n })));
        } else if (focused.name === 'value') {
            const type = interaction.options.getString('type');
            const query = focused.value.toLowerCase();
            if (type === 'group') {
                const filtered = GROUPS.filter(g => g.toLowerCase().includes(query));
                await interaction.respond(filtered.map(g => ({ name: g, value: g })));
            } else {
                const slotName = interaction.options.getString('slot-name');
                const slotData = db.archipelago.get('slot_data') ?? {};
                const items = slotData[slotName]?.items ?? [];
                const filtered = items.filter(name => name.toLowerCase().includes(query));
                await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
            }
        }
    },

    async execute(interaction) {
        const userId = interaction.user.id;
        const slot = interaction.options.getString('slot-name');
        const type = interaction.options.getString('type');
        const value = interaction.options.getString('value');

        if (type === 'group' && !GROUPS.includes(value)) {
            await interaction.reply({ content: `Invalid group. Choose from: ${GROUPS.join(', ')}`, ephemeral: true });
            return;
        }

        const subscriptions = db.archipelago.get('subscriptions') ?? [];
        const existingIdx = subscriptions.findIndex(
            s => s.userId === userId && s.slot === slot && s.type === type && s.value.toLowerCase() === value.toLowerCase()
        );

        if (existingIdx !== -1) {
            subscriptions.splice(existingIdx, 1);
            db.archipelago.set('subscriptions', subscriptions);
            await interaction.reply({
                content: `Unsubscribed from **${value}** (${type}) for **${slot}**.`,
                ephemeral: true,
            });
        } else {
            subscriptions.push({ userId, slot, type, value: type === 'group' ? value : value });
            db.archipelago.set('subscriptions', subscriptions);
            await interaction.reply({
                content: `Subscribed! You'll get a DM when **${slot}** receives ${type === 'group' ? `a **${value}** item` : `**${value}**`}.`,
                ephemeral: true,
            });
        }
    },
};
