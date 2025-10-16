/**
 * Bot Update Script
 * This script updates the bot.js file to integrate with the new botState and socketManager modules.
 */

const fs = require('fs');
const path = require('path');

// Path to the bot.js file
const botFilePath = path.join(__dirname, 'bot.js');

// Read the bot.js file
let botContent = fs.readFileSync(botFilePath, 'utf8');

// Add imports for the new modules
if (!botContent.includes('const botState = require')) {
    const importPattern = /(const path = require\(['"]path['"]\);)/;
    const newImports = `$1
const botState = require('./utils/botState');
const socketManager = require('./utils/socketManager');
const configManager = require('./utils/configManager');`;
    
    botContent = botContent.replace(importPattern, newImports);
    console.log('Added imports for botState, socketManager, and configManager');
}

// Update console.log calls to use botState.log
botContent = botContent.replace(/console\.log\((['"`])(.*?)\1(.*?)\);/g, (match, quote, message, args) => {
    return `botState.log('info', ${quote}${message}${quote}${args});`;
});

botContent = botContent.replace(/console\.error\((['"`])(.*?)\1(.*?)\);/g, (match, quote, message, args) => {
    return `botState.log('error', ${quote}${message}${quote}${args});`;
});

console.log('Updated console.log and console.error calls to use botState.log');

// Add setupSocketManagerEvents function if it doesn't exist
if (!botContent.includes('function setupSocketManagerEvents')) {
    const functionToAdd = `
// Setup socket manager events for admin panel integration
function setupSocketManagerEvents(sock) {
    // Listen for restart bot requests
    socketManager.on('restart-bot', async () => {
        botState.log('info', 'Restart requested from admin panel');
        
        shutdownInProgress = true;
        
        // Notify the owner
        try {
            await sock.sendMessage(OWNER_NUMBER, { 
                text: formatMessage('🔄 Bot is restarting due to admin panel request...') 
            });
        } catch (error) {
            botState.log('warning', \`Failed to notify owner about restart: \${error.message}\`);
        }
        
        // Clean up before exiting
        await endConnection(sock);
        
        // Exit the process - this will restart if you're using PM2 or a similar process manager
        process.exit(0);
    });
    
    // Listen for refresh QR code requests
    socketManager.on('refresh-qr', async () => {
        botState.log('info', 'QR code refresh requested from admin panel');
        
        // End the current connection to trigger a new QR code
        await endConnection(sock);
        globalSock = null;
        
        // Restart the bot to get a new QR code
        isReconnecting = false;
        startBot();
    });
    
    // Listen for send message requests
    socketManager.on('send-message', async (data) => {
        const { to, message, type = 'text' } = data;
        
        botState.log('info', \`Sending message from admin panel to \${to}\`);
        
        try {
            if (type === 'text') {
                await sock.sendMessage(to, { text: formatMessage(message) });
            } else {
                // Handle other message types if needed
                botState.log('warning', \`Unsupported message type: \${type}\`);
            }
            
            botState.log('info', \`Message sent successfully to \${to}\`);
        } catch (error) {
            botState.log('error', \`Failed to send message to \${to}: \${error.message}\`);
        }
    });
    
    // Listen for config update requests
    socketManager.on('update-config', async (newConfig) => {
        botState.log('info', 'Config update requested from admin panel');
        
        try {
            // Update the config file
            configManager.updateConfig(newConfig);
            
            // Reload the config
            delete require.cache[require.resolve('./config')];
            const updatedConfig = require('./config');
            
            // Update local variable
            PREFIX = updatedConfig.prefix;
            OWNER_NUMBER = updatedConfig.ownerNumber;
            
            botState.log('info', 'Configuration updated successfully');
            
            // Notify the owner
            try {
                await sock.sendMessage(OWNER_NUMBER, { 
                    text: formatMessage('⚙️ Bot configuration has been updated from the admin panel') 
                });
            } catch (error) {
                botState.log('warning', \`Failed to notify owner about config update: \${error.message}\`);
            }
        } catch (error) {
            botState.log('error', \`Failed to update config: \${error.message}\`);
        }
    });
}`;

    // Find a good location to insert the function (before the startBot() call)
    const insertPoint = botContent.indexOf('// Start the bot');
    if (insertPoint !== -1) {
        botContent = botContent.slice(0, insertPoint) + functionToAdd + '\n\n' + botContent.slice(insertPoint);
        console.log('Added setupSocketManagerEvents function');
    } else {
        console.warn('Could not find a good location to insert setupSocketManagerEvents function');
    }
}

// Add call to setupSocketManagerEvents in startBot function
if (!botContent.includes('setupSocketManagerEvents(sock)')) {
    const insertPoint = botContent.indexOf('    } catch (error) {', botContent.indexOf('sock.ev.on(\'messages.upsert\''));
    if (insertPoint !== -1) {
        const insertText = '\n        // Listen for socket manager events\n        setupSocketManagerEvents(sock);\n';
        botContent = botContent.slice(0, insertPoint) + insertText + botContent.slice(insertPoint);
        console.log('Added call to setupSocketManagerEvents in startBot function');
    } else {
        console.warn('Could not find a good location to insert setupSocketManagerEvents call');
    }
}

// Update startTime initialization
const startTimeRegex = /const startTime = new Date\(\);/;
if (startTimeRegex.test(botContent)) {
    botContent = botContent.replace(startTimeRegex, '// Bot start time is tracked by botState');
    console.log('Updated startTime initialization');
}

// Update getUptime function to use botState
const getUptimeRegex = /function getUptime\(\) \{[\s\S]*?return .*?\}/;
if (getUptimeRegex.test(botContent)) {
    botContent = botContent.replace(getUptimeRegex, 'function getUptime() {\n    return botState.getUptime();\n}');
    console.log('Updated getUptime function to use botState');
}

// Update connection.update event handler to use botState
if (botContent.includes('sock.ev.on(\'connection.update\'')) {
    // Add botState.setStatus('connecting') near the start of startBot
    const startBotPattern = /async function startBot\(\) \{[\s\S]*?(try \{)/;
    if (startBotPattern.test(botContent)) {
        botContent = botContent.replace(startBotPattern, 'async function startBot() {\n    $1\n        botState.setStatus(\'connecting\');');
        console.log('Added botState.setStatus(\'connecting\') to startBot');
    }
    
    // Update connection open handler
    const connOpenPattern = /(if \(connection === ['"]open['"].*?\{[^\}]*?)console\.log\(['"]✅ Bot connected to WhatsApp!['"].*?\);/;
    if (connOpenPattern.test(botContent)) {
        botContent = botContent.replace(connOpenPattern, '$1botState.log(\'info\', \'Bot connected to WhatsApp!\');\n                botState.setStatus(\'connected\');');
        console.log('Updated connection open handler to use botState');
    }
    
    // Update user id logging
    const userIdPattern = /(sock\.user\.id && console\.log\([^)]*\);)/;
    if (userIdPattern.test(botContent)) {
        botContent = botContent.replace(userIdPattern, 'if (sock.user && sock.user.id) {\n                    botState.log(\'info\', `Bot connected as: ${sock.user.id}`);\n                    botState.setUser(sock.user);\n                }');
        console.log('Updated user id logging to use botState');
    }
    
    // Update connection close handler
    const connClosePattern = /(else if \(connection === ['"]close['"].*?\{[^\}]*?)console\.log\([^)]*?Connection closed/;
    if (connClosePattern.test(botContent)) {
        botContent = botContent.replace(connClosePattern, '$1botState.log(\'warning\', `Connection closed');
        console.log('Updated connection close handler to use botState');
    }
    
    // Add botState.setStatus('disconnected') to connection close handler
    const afterConnStatus = /(connectionAttempts\+\+;.*?\n)/;
    if (afterConnStatus.test(botContent)) {
        botContent = botContent.replace(afterConnStatus, '$1                botState.setStatus(\'disconnected\');\n                ');
        console.log('Added botState.setStatus(\'disconnected\') to connection close handler');
    }
    
    // Update QR code handler
    const qrPattern = /(if \(qr\) \{)[\s\S]*?(\})/;
    if (qrPattern.test(botContent)) {
        botContent = botContent.replace(qrPattern, '$1\n                botState.log(\'info\', \'New QR code received. Please scan with WhatsApp on your phone.\');\n                botState.setQRCode(qr);\n            $2');
        console.log('Updated QR code handler to use botState');
    }
}

// Update messages.upsert event handler
if (botContent.includes('sock.ev.on(\'messages.upsert\'')) {
    // Add message counter increment
    const msgUpsertPattern = /(const msg = message\.messages\[0\];.*?\n)/;
    if (msgUpsertPattern.test(botContent)) {
        botContent = botContent.replace(msgUpsertPattern, '$1                \n                // Increment message counter\n                botState.incrementMessages();\n                ');
        console.log('Added message counter increment to messages.upsert');
    }
    
    // Add command counter increment
    const cmdPattern = /(if \(text\.startsWith\(PREFIX\)\) \{.*?\n)/;
    if (cmdPattern.test(botContent)) {
        botContent = botContent.replace(cmdPattern, '$1                    \n                    // Increment command counter\n                    botState.incrementCommands();\n                    ');
        console.log('Added command counter increment to command handling');
    }
}

// Write the updated content back to the file
fs.writeFileSync(botFilePath, botContent, 'utf8');
console.log('Successfully updated bot.js to integrate with botState and socketManager');

// Create a backup of the original file
fs.writeFileSync(`${botFilePath}.bak`, fs.readFileSync(botFilePath, 'utf8'), 'utf8');
console.log(`Backup created at ${botFilePath}.bak`); 