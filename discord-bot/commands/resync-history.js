const { SlashCommandBuilder } = require('discord.js');
const db = require('../db.js');

function itemGroup(flags) {
    if (flags & 0b0001) return 'Progression';
    if (flags & 0b0100) return 'Trap';
    if (flags & 0b0010) return 'Useful';
    return 'Junk';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resync-history')
        .setDescription('Rebuild item history by connecting to each slot on Archipelago')
        .setDMPermission(false),

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

        const { Client } = await import('archipelago.js');
        const cachedPackage = db.archipelago.get('package_cache');
        const newItems = [];
        const errors = [];

        for (const slot of playerSlots) {
            try {
                const client = new Client();
                if (cachedPackage) client.package.importPackage(cachedPackage);

                await client.login(`archipelago.gg:${port}`, slot.name, slot.game);
                // ReceivedItems packets arrive shortly after Connected
                await new Promise(resolve => setTimeout(resolve, 2000));

                const received = client.items.received;
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

                try { client.socket.disconnect(); } catch (_) {}
            } catch (err) {
                errors.push(`**${slot.name}**: ${err.message}`);
            }
        }

        // Preserve non-item entries (deaths, etc.) from existing history
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
