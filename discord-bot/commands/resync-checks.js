const { SlashCommandBuilder, InteractionContextType } = require('discord.js');
const db = require('../db.js');
const archipelago = require('../archipelago.js');
const { SLOT_NAMES, mapEmoji } = require('../slots.js');

module.exports = {
    // Logs in to the room, so it's refused while Archipelago is disabled
    requiresArchipelago: true,
    data: new SlashCommandBuilder()
        .setName('resync-checks')
        .setDescription('Recount checks by connecting to a slot (or every slot) on Archipelago')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The slot to resync; leave empty to resync every slot')
                .setRequired(false)
                .setAutocomplete(true))
        .setContexts(InteractionContextType.Guild),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = SLOT_NAMES.filter(name => name.toLowerCase().includes(focusedValue));
        await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
    },

    async execute(interaction) {
        await interaction.deferReply();

        if (!db.archipelago.get('server_port')) {
            await interaction.editReply('No Archipelago server port configured.');
            return;
        }

        const slotName = interaction.options.getString('slot-name');
        let slots;
        if (slotName) {
            if (!SLOT_NAMES.includes(slotName)) {
                await interaction.editReply(`**${slotName}** is not a valid Archipelago slot name!`);
                return;
            }
            slots = [slotName];
        } else {
            const slotData = db.archipelago.get('slot_data') ?? {};
            slots = Object.entries(slotData).filter(([, d]) => d.type === 1 && d.game).map(([name]) => name);
            if (slots.length === 0) {
                await interaction.editReply('No player slots found in cache. Try reconnecting the bot first.');
                return;
            }
        }

        await interaction.editReply(`Resyncing check counts for ${slots.length === 1 ? `**${mapEmoji(slots[0])}**` : `${slots.length} slots`}…`);

        const results = await archipelago.mapSlotLogins(slots, async (name) => {
            try {
                return await archipelago.withSlotClient(name, (client) => ({
                    checked: client.room.checkedLocations.length,
                    total: client.room.allLocations.length,
                }));
            } catch (err) {
                return { error: err.message };
            }
        });

        // Re-read so counts that moved during the logins aren't clobbered for slots we didn't touch
        const counts = db.archipelago.get('check_counts') ?? {};
        const lines = [];
        slots.forEach((name, i) => {
            const result = results[i];
            if (result.error) {
                lines.push(`- **${mapEmoji(name)}**: ⚠️ ${result.error}`);
                return;
            }
            const old = counts[name];
            counts[name] = result;
            const changed = old && old.checked !== result.checked ? ` (was ${old.checked}/${old.total})` : '';
            lines.push(`- **${mapEmoji(name)}**: ${result.checked}/${result.total}${changed}`);
        });
        db.archipelago.set('check_counts', counts);

        const synced = results.filter(r => !r.error).length;
        const content = [`Resynced check counts for **${synced}**/**${slots.length}** slots.`, ...lines].join('\n');
        await interaction.editReply(content.length > 2000 ? `${content.slice(0, 1997)}…` : content);
    },
};
