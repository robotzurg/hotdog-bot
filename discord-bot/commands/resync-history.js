const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const db = require('../db.js');
const archipelago = require('../archipelago.js');
const { itemGroup } = require('../slots.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resync-history')
        .setDescription('Rebuild item history by connecting to each slot on Archipelago')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        await interaction.deferReply();

        const port = db.archipelago.get('server_port');
        if (!port) {
            await interaction.editReply('No Archipelago server port configured.');
            return;
        }

        const slotData = db.archipelago.get('slot_data') ?? {};
        const playerSlots = Object.entries(slotData)
            .filter(([, d]) => d.type === 1 && d.game)
            .map(([name, d]) => ({ name, game: d.game }));

        if (playerSlots.length === 0) {
            await interaction.editReply('No player slots found in cache. Try reconnecting the bot first.');
            return;
        }

        await interaction.editReply(`Resyncing ${playerSlots.length} slots…`);

        const newItems = [];
        const errors = [];

        for (const slot of playerSlots) {
            try {
                // ReceivedItems packets arrive shortly after Connected
                const received = await archipelago.withSlotClient(slot.name, (client) => [...client.items.received], { settleMs: 2000 });
                for (const item of received) {
                    newItems.push({
                        type: 'item',
                        receiver: slot.name,
                        sender: item.sender?.name ?? null,
                        itemName: item.name,
                        locationName: item.locationName ?? null,
                        flags: item.flags ?? 0,
                        group: itemGroup(item.flags ?? 0),
                        timestamp: null,
                    });
                }
            } catch (err) {
                errors.push(`**${slot.name}**: ${err.message}`);
            }
        }

        // Preserve non-item entries (deaths, etc.) from existing history
        archipelago.flushHistory();
        const existing = db.archipelago.get('ap_history') ?? [];
        const nonItems = existing.filter(e => e.type !== 'item');
        db.archipelago.set('ap_history', [...nonItems, ...newItems]);

        const lines = [
            `Resynced **${newItems.length}** items across **${playerSlots.length - errors.length}**/**${playerSlots.length}** slots.`,
            ...errors,
        ];
        await interaction.editReply(lines.join('\n'));
    },
};
