const { SlashCommandBuilder } = require('discord.js');
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
                .setRequired(true))
        .setDMPermission(false),
    async execute(interaction) {
        await interaction.deferReply();
        await interaction.editReply(`Gathering Universal Tracker data, this may take a moment...`);

        const slotName = interaction.options.getString('slot-name');
        const launcherScript = path.join(__dirname, '../../Archipelago-0.6.4/Launcher.py');
        // Use the venv's Python interpreter instead of system python3
        const pythonPath = path.join(__dirname, '../../Archipelago-0.6.4/venv/bin/python3');
        const pythonProcess = spawn(pythonPath, [launcherScript, 'Universal Tracker', '--', '--nogui', '--list', `archipelago://${slotName}:None@archipelago.gg:52913`]);

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

            // Trim message array to a maximum of 100 elements to avoid overly long replies
            if (message.length > 100) {
                const removedCount = message.length - 100;
                // keep first 100 entries
                message = message.slice(0, 100);
                // add a short footer noting the number of omitted items
                message.push(`... (omitted ${removedCount} additional items)`);
            }

            // Add a short summary line with the final count of displayed items
            message.push(`-# (**${checks}** In Logic)`);
            await finishReply(message);
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