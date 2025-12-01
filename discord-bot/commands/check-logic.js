const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { spawn } = require('child_process');
const path = require('path');

const SLOT_NAMES = [
    'Jeff-CRYPT', 'Jeff-ALTTP', 'Jeff-C', 'NateCeleste', 'iapg-celeste', 'Yacob-C',
    'Jeff-C64', 'Jeff-CHESS', 'Jeff-YD', 'Jeff-ORI', 'AvTruck', 'Avresa',
    'RaveelGK', 'NateGK', 'AvHitman', 'AvScoob', 'AvSimp', 'AvSWCS',
    'AvTyger', 'NateTy', 'AvOri', 'Yacob-ORI', 'NateOri', 'Ethan-K64',
    'Ethan-PSY', 'Ethan-Paint', 'Ethan-LGG', 'Ethan-BW', 'AriaPokemon', 'NateWord',
    'NateClique', 'HDWClique', 'NateWitness', 'NateGenshin', 'vlad-ash', 'vlad-sha',
    'vlad-dd', 'vlad-ter', 'vlad-blas', 'vlad-ultra', 'Yacob-ULTRA', 'RaveelInscryptio',
    'RaveelFFPS', 'RaveelBW', 'iapg-HK', 'iapg-UT', 'Yacob-KH2', 'Yacob-SOL',
    'Yacob-DS3', 'Yacob-MIKU'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-logic')
        .setDescription('Check your in logic checks')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The archipelago slot name to check')
                .setRequired(true)
                .setAutocomplete(true))
        .setDMPermission(false),
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = SLOT_NAMES.filter(name => name.toLowerCase().includes(focusedValue));
        await interaction.respond(
            filtered.slice(0, 25).map(name => ({ name: name, value: name }))
        );
    },
    async execute(interaction) {
        await interaction.deferReply();
        await interaction.editReply(`Gathering Universal Tracker data, this may take a moment...`);

        const slotName = interaction.options.getString('slot-name');
        const launcherScript = path.join(__dirname, '../../Archipelago-0.6.4/Launcher.py');
        // Use the venv's Python interpreter instead of system python3
        const pythonPath = path.join(__dirname, '../../Archipelago-0.6.4/venv/bin/python3');
        const pythonProcess = spawn(pythonPath, [
            launcherScript, 
            'Universal Tracker', 
            '--', 
            '--nogui', 
            '--list', 
            `archipelago://${slotName}:None@archipelago.gg:52913`
        ], {
            env: {
                ...process.env,
                SDL_AUDIODRIVER: 'dummy',
                SDL_VIDEODRIVER: 'dummy',
                QT_QPA_PLATFORM: 'offscreen',
                DISPLAY: '',  // Empty string to prevent X connection attempts
                MPLBACKEND: 'Agg'  // Non-interactive matplotlib backend
            }
        });

        // Track whether we've already replied to avoid duplicate replies
        let replied = false;
        let message = [`## In Logic Checks For ${slotName}`];

        const finishReply = async (message) => {
            if (replied) return;
            replied = true;
            try {
                const out = Array.isArray(message) ? message.join('\n') : String(message);
                await interaction.editReply(out);
            } catch (err) {
                console.error('Failed to reply to interaction:', err);
            }
        };

        pythonProcess.stdout.on('data', (data) => {
            const s = data instanceof Buffer ? data.toString('utf8') : String(data);
            if (!s.includes('Archipelago (0.6.4)') && !s.includes('enter to exit')) {
                const parts = s.split(/[\r\n,]+/).map(p => p.trim()).filter(Boolean);
                if (parts.length) message.push(...parts);
            }

            // If the launcher prints 'enter' we assume it's finished gathering and will exit
            if (s.toLowerCase().includes('enter to exit')) {
                // Ask the process to exit and mark completion — the 'close' handler will reply
                try {
                    pythonProcess.kill();
                } catch (err) {
                    console.error('Error killing python process on enter:', err);
                }
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            const s = data instanceof Buffer ? data.toString('utf8') : String(data);
            console.error('Python stderr:', s);
        });

        // When the process exits (either normally or after being killed), reply to the interaction
        pythonProcess.on('close', async (code, signal) => {
            console.log(`Ending python, ${code}, ${signal}`)
            let checks = message.length - 1;
            message = message.map(v => `- ${v}`)
            message[0] = message[0].replace(`- `, '');

            const itemsPerPage = 10;
            const totalPages = Math.ceil((message.length - 1) / itemsPerPage);
            let currentPage = 0;

            const generatePage = (page) => {
                const start = page * itemsPerPage + 1; // +1 to skip the header
                const end = Math.min(start + itemsPerPage, message.length);
                const pageItems = message.slice(start, end);

                const pageContent = [
                    message[0], // Header
                    ...pageItems,
                    `\n-# Page ${page + 1}/${totalPages} | **${checks}** In Logic`
                ];

                return pageContent.join('\n');
            };

            const generateButtons = (page) => {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('first')
                            .setLabel('⏮️ First')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('prev')
                            .setLabel('◀️ Previous')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === 0),
                        new ButtonBuilder()
                            .setCustomId('next')
                            .setLabel('Next ▶️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1),
                        new ButtonBuilder()
                            .setCustomId('last')
                            .setLabel('Last ⏭️')
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(page === totalPages - 1)
                    );
                return row;
            };

            if (totalPages <= 1) {
                // No pagination needed
                message.push(`-# (**${checks}** In Logic)`);
                await finishReply(message);
            } else {
                // Send initial page with buttons
                const response = await interaction.editReply({
                    content: generatePage(currentPage),
                    components: [generateButtons(currentPage)]
                });
                replied = true;

                // Create collector for button interactions
                const collector = response.createMessageComponentCollector({
                    time: 600000 // 10 minutes
                });

                collector.on('collect', async i => {
                    switch (i.customId) {
                        case 'first':
                            currentPage = 0;
                            break;
                        case 'prev':
                            currentPage = Math.max(0, currentPage - 1);
                            break;
                        case 'next':
                            currentPage = Math.min(totalPages - 1, currentPage + 1);
                            break;
                        case 'last':
                            currentPage = totalPages - 1;
                            break;
                    }

                    await i.update({
                        content: generatePage(currentPage),
                        components: [generateButtons(currentPage)]
                    });
                });

                collector.on('end', async () => {
                    try {
                        await interaction.editReply({
                            components: []
                        });
                    } catch (err) {
                        console.error('Failed to remove buttons:', err);
                    }
                });
            }
        });

        // In case the process errors during spawn
        pythonProcess.on('error', async (err) => {
            console.error('Failed to start python process:', err);
            await finishReply(`Launcher failed to start: ${err.message}`);
        });

        // Return immediately; reply will be sent when the process closes
        return;
    },
};