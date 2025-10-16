const fs = require('fs');
const path = require('path');

const loadCommands = () => {
    const commands = new Map();
    const commandFiles = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.js') && file !== 'index.js');
    
    console.log('📚 Loading bot commands...');
    
    for (const file of commandFiles) {
        try {
            const command = require(path.join(__dirname, file));
            // Register command with the prefix removed
            commands.set(command.name, command);
            console.log(`✅ Loaded command: ${command.name}`);
        } catch (error) {
            console.error(`❌ Error loading command from ${file}:`, error);
        }
    }
    
    console.log(`🤖 Loaded ${commands.size} commands in total`);
    return commands;
};

module.exports = loadCommands(); 