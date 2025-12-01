const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db.js');
const { spawn } = require('child_process');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('check-logic')
        .setDescription('Check your in logic checks')
        .addStringOption(option =>
            option.setName('slot-name')
                .setDescription('The archipelago slot name to check')
                .setRequired(true)
                .addChoices(
                    { name: 'Jeff-CRYPT', value: 'Jeff-CRYPT' },
                    { name: 'Jeff-ALTTP', value: 'Jeff-ALTTP' },
                    { name: 'Jeff-C', value: 'Jeff-C' },
                    { name: 'NateCeleste', value: 'NateCeleste' },
                    { name: 'iapg-celeste', value: 'iapg-celeste' },
                    { name: 'Yacob-C', value: 'Yacob-C' },
                    { name: 'Jeff-C64', value: 'Jeff-C64' },
                    { name: 'Jeff-CHESS', value: 'Jeff-CHESS' },
                    { name: 'Jeff-YD', value: 'Jeff-YD' },
                    { name: 'Jeff-ORI', value: 'Jeff-ORI' },
                    { name: 'AvTruck', value: 'AvTruck' },
                    { name: 'Avresa', value: 'Avresa' },
                    { name: 'RaveelGK', value: 'RaveelGK' },
                    { name: 'NateGK', value: 'NateGK' },
                    { name: 'AvHitman', value: 'AvHitman' },
                    { name: 'AvScoob', value: 'AvScoob' },
                    { name: 'AvSimp', value: 'AvSimp' },
                    { name: 'AvSWCS', value: 'AvSWCS' },
                    { name: 'AvTyger', value: 'AvTyger' },
                    { name: 'NateTy', value: 'NateTy' },
                    { name: 'AvOri', value: 'AvOri' },
                    { name: 'Yacob-ORI', value: 'Yacob-ORI' },
                    { name: 'NateOri', value: 'NateOri' },
                    { name: 'Ethan-K64', value: 'Ethan-K64' },
                    { name: 'Ethan-PSY', value: 'Ethan-PSY' },
                    { name: 'Ethan-Paint', value: 'Ethan-Paint' },
                    { name: 'Ethan-LGG', value: 'Ethan-LGG' },
                    { name: 'Ethan-BW', value: 'Ethan-BW' },
                    { name: 'AriaPokemon', value: 'AriaPokemon' },
                    { name: 'NateWord', value: 'NateWord' },
                    { name: 'NateClique', value: 'NateClique' },
                    { name: 'HDWClique', value: 'HDWClique' },
                    { name: 'NateWitness', value: 'NateWitness' },
                    { name: 'NateGenshin', value: 'NateGenshin' },
                    { name: 'vlad-ash', value: 'vlad-ash' },
                    { name: 'vlad-sha', value: 'vlad-sha' },
                    { name: 'vlad-dd', value: 'vlad-dd' },
                    { name: 'vlad-ter', value: 'vlad-ter' },
                    { name: 'vlad-blas', value: 'vlad-blas' },
                    { name: 'vlad-ultra', value: 'vlad-ultra' },
                    { name: 'Yacob-ULTRA', value: 'Yacob-ULTRA' },
                    { name: 'RaveelInscryptio', value: 'RaveelInscryptio' },
                    { name: 'RaveelFFPS', value: 'RaveelFFPS' },
                    { name: 'RaveelBW', value: 'RaveelBW' },
                    { name: 'iapg-HK', value: 'iapg-HK' },
                    { name: 'iapg-UT', value: 'iapg-UT' },
                    { name: 'Yacob-KH2', value: 'Yacob-KH2' },
                    { name: 'Yacob-SOL', value: 'Yacob-SOL' },
                    { name: 'Yacob-DS3', value: 'Yacob-DS3' },
                    { name: 'Yacob-MIKU', value: 'Yacob-MIKU' },
                ))
        .setDMPermission(false),
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