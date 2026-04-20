const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const db = require('../db.js');
const { spawn } = require('child_process');
const path = require('path');

const PLAYER_SLOTS = {
    'Aria': ['AriaCeleste', 'AriaChess', 'AriaHollow', 'AriaLilies', 'AriaOri', 'AriaPizza', 'AriaTruck'],
    'Av': ['AvGenshin', 'AvGK', 'AvHat', 'AvNiko', 'AvTy', 'AvWitch'],
    'Ethan': ['Ethan-Celeste', 'Ethan-DKC', 'Ethan-Duck', 'Ethan-Hylics', 'Ethan-Ori', 'Ethan-Peggle', 'Ethan-Taxi', 'Ethan-TOEM', 'Ethan-Yoku'],
    'HDW': ['HDWClique', 'AllFactory', 'AllMinecraft', 'AllRepo'],
    'Jeff': ['Jeff-C64', 'Jeff-COTM', 'Jeff-DUCK', 'Jeff-KH2', 'Jeff-SOL', 'Jeff-SP', 'Jeff-Stardew', 'Jeff-Truck', 'Jeff-TS', 'Jeff-UT'],
    'Kirby': ['KirbyKSS'],
    'Nate': ['NateGK', 'NateGo', 'NateHunie', 'NateMK', 'NateOri', 'NatePvZ', 'NateRabi', 'NateTy', 'NateWitch', 'NateXeno'],
    'Raveel': ['RaveelCeleste', 'RaveelConquest', 'RaveelOri', 'RaveelPizza', 'RaveelXY', 'RaveelZA'],
    'vlad': ['vlad-dd', 'vlad-fm', 'vlad-hk', 'vlad-mini', 'vlad-ref'],
    'Yacob': ['Yacob-HK', 'Yacob-KH', 'Yacob-KH2', 'Yacob-Lies', 'Yacob-MIKU', 'Yacob-OOT', 'Yacob-SOLS', 'Yacob-SUNSHINE', 'Yacob-TP'],
};

const noisePatterns = [
    /^Shop Upgrade total:/,
    /^Location id:/,
    /^Adding rule for/,
    /^Creating \d+/,
    /^Making /,
    /^Excluding /,
    /Pelly (Added|added)/,
    /^(Loaction|Location|Item) Count:/,
    /^(Total Filler|Filler needed):/,
    /^\[/,
    /^\d+$/,
];

function runTrackerForSlot(slotName, port) {
    return new Promise((resolve) => {
        const launcherScript = path.join(__dirname, '../../Archipelago-0.6.6/Launcher.py');
        const pythonPath = process.platform === 'win32'
            ? path.join(__dirname, '../../Archipelago-0.6.6/venv/Scripts/python.exe')
            : path.join(__dirname, '../../Archipelago-0.6.6/venv/bin/python3');

        const pythonProcess = spawn(pythonPath, [
            launcherScript,
            'Universal Tracker',
            '--',
            '--nogui',
            '--list',
            `archipelago://${slotName}:None@archipelago.gg:${port}`
        ], {
            env: {
                ...process.env,
                SDL_AUDIODRIVER: 'dummy',
                SDL_VIDEODRIVER: 'dummy',
                QT_QPA_PLATFORM: 'offscreen',
                DISPLAY: '',
                MPLBACKEND: 'Agg'
            }
        });

        const items = [];

        pythonProcess.stdout.on('data', (data) => {
            const s = data instanceof Buffer ? data.toString('utf8') : String(data);
            if (s.toLowerCase().includes('press enter to install')) {
                pythonProcess.stdin.write('\n');
            }
            if (!s.includes('Archipelago (0.6.6)') && !s.includes('enter to exit') && !s.includes('found cached multiworld')) {
                const parts = s.split(/[\r\n]+/)
                    .map(p => p.trim())
                    .filter(p => p && !noisePatterns.some(re => re.test(p)));
                if (parts.length) items.push(...parts);
            }
            if (s.toLowerCase().includes('enter to exit')) {
                try { pythonProcess.kill(); } catch (e) {}
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error(`[${slotName}] stderr:`, data.toString('utf8'));
        });

        pythonProcess.on('close', () => resolve({ slotName, items }));
        pythonProcess.on('error', (err) => {
            console.error(`[${slotName}] spawn error:`, err);
            resolve({ slotName, items: [] });
        });
    });
}

const ITEMS_PER_PAGE = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-logic-all')
        .setDescription('Check in-logic items for all slots of a player, with side-by-side overview')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('The player whose slots to check')
                .setRequired(true)
                .setAutocomplete(true))
        .setDMPermission(false),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = Object.keys(PLAYER_SLOTS).filter(name => name.toLowerCase().includes(focusedValue));
        await interaction.respond(filtered.slice(0, 25).map(name => ({ name, value: name })));
    },

    async execute(interaction) {
        await interaction.deferReply();

        const player = interaction.options.getString('player');
        const slots = PLAYER_SLOTS[player];
        if (!slots) {
            await interaction.editReply(`Unknown player: **${player}**`);
            return;
        }

        const port = db.archipelago.get('server_port');
        await interaction.editReply(`Gathering Universal Tracker data for all **${player}** slots (${slots.length} slots), this may take a moment...`);

        const results = await Promise.all(slots.map(slot => runTrackerForSlot(slot, port)));

        const slotResults = Object.fromEntries(results.map(({ slotName, items }) => [slotName, items]));

        const buildOverview = () => {
            const lines = [`## Logic Check Overview: ${player}`];
            for (const slot of slots) {
                const count = slotResults[slot]?.length ?? 0;
                lines.push(`- **${slot}**: ${count} in logic`);
            }
            return lines.join('\n');
        };

        const buildSelectMenu = () => {
            const select = new StringSelectMenuBuilder()
                .setCustomId('slot_select')
                .setPlaceholder('Select a slot to view details...')
                .addOptions(slots.map(slot =>
                    new StringSelectMenuOptionBuilder()
                        .setLabel(slot)
                        .setValue(slot)
                        .setDescription(`${slotResults[slot]?.length ?? 0} in logic`)
                ));
            return new ActionRowBuilder().addComponents(select);
        };

        const buildDetailContent = (slotName, page) => {
            const items = slotResults[slotName] ?? [];
            const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
            const start = page * ITEMS_PER_PAGE;
            const pageItems = items.slice(start, start + ITEMS_PER_PAGE).map(i => `- ${i}`);
            const content = [
                `## In Logic Checks For ${slotName}`,
                ...pageItems,
                `\n-# Page ${page + 1}/${totalPages} | **${items.length}** In Logic`
            ].join('\n');
            return { content, totalPages };
        };

        const buildDetailComponents = (page, totalPages) => [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('back_overview')
                    .setLabel('Logic Overview')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            )
        ];

        const response = await interaction.editReply({
            content: buildOverview(),
            components: [buildSelectMenu()]
        });

        let currentSlot = null;
        let currentPage = 0;

        const collector = response.createMessageComponentCollector({ time: 600000 });

        collector.on('collect', async i => {
            if (i.customId === 'slot_select') {
                currentSlot = i.values[0];
                currentPage = 0;
                const { content, totalPages } = buildDetailContent(currentSlot, currentPage);
                await i.update({ content, components: buildDetailComponents(currentPage, totalPages) });
            } else if (i.customId === 'back_overview') {
                currentSlot = null;
                await i.update({ content: buildOverview(), components: [buildSelectMenu()] });
            } else if (i.customId === 'prev' || i.customId === 'next') {
                const items = slotResults[currentSlot] ?? [];
                const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE));
                currentPage = i.customId === 'prev'
                    ? Math.max(0, currentPage - 1)
                    : Math.min(totalPages - 1, currentPage + 1);
                const { content } = buildDetailContent(currentSlot, currentPage);
                await i.update({ content, components: buildDetailComponents(currentPage, totalPages) });
            }
        });

        collector.on('end', async () => {
            try { await interaction.editReply({ components: [] }); } catch (e) {}
        });
    },
};
