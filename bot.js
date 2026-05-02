const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const { Boom } = require('@hapi/boom');
const { formatMessage, createBanner } = require('./utils');
const { simulatePresence, detectMessageType } = require('./utils/autoPresence');
const config = require('./config');
const path = require('path');
const botState = require('./utils/botState');
const socketManager = require('./utils/socketManager');
const configManager = require('./utils/configManager');

// Set up process-level error handling immediately
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    botState.log('error', `Unhandled Rejection: ${reason}`);
});

// Single global error handler for the entire application
process.on('uncaughtException', (err) => {
    console.error('Caught exception:', err);
    botState.log('error', `Uncaught Exception: ${err.message}`);
    
    // Don't auto-restart on uncaught exceptions - this can cause loops
    // Just log the error and let PM2 or manual restart handle it
    botState.log('error', 'Bot stopped due to uncaught exception. Please check logs and restart manually if needed.');
    
    // Try to shutdown gracefully
    if (typeof endConnection === 'function' && globalSock) {
        try {
            endConnection(globalSock).catch(e => console.error('Error shutting down connection:', e));
        } catch (shutdownErr) {
            console.error('Error during emergency shutdown:', shutdownErr);
        }
    }
    
    // Exit cleanly - let process manager handle restart if configured
    process.exit(1);
});

// Enable verbose debugging for node
process.env.NODE_DEBUG = 'net,http,tls';

// Load commands from the commands directory
try {
    console.log('📚 Loading bot commands...');
    const commands = require('./commands');
    console.log(`🤖 Loaded ${commands.size} commands in total`);
    module.exports.commands = commands;
} catch (cmdError) {
    console.error('❌ Error loading commands:', cmdError);
    process.exit(1);
}

// Define the command prefix from config
const PREFIX = config.prefix;

// Bot owner configuration from config
const OWNER_NUMBER = config.ownerNumber;

// Track bot start time for uptime calculation
// Bot start time is tracked by botState
let connectionAttempts = 0;
const maxConnectionAttempts = 3; // Reduced from 5 to detect problems faster
let isReconnecting = false;
const reconnectDelay = 20000; // 20 seconds delay between reconnect attempts
let shutdownInProgress = false;

// Store socket globally to access it from anywhere
let globalSock = null;

// Track QR code attempts
let qrAttempts = 0;
const maxQrAttempts = 5;

// Clean up temp files that might be causing issues
function cleanupTempFiles() {
    try {
        const tmpDir = path.join(__dirname, 'auth_info', 'tmp');
        if (fs.existsSync(tmpDir)) {
            const files = fs.readdirSync(tmpDir);
            botState.log('info', `Cleaning up ${files.length} temporary files...`);
            files.forEach(file => {
                try {
                    fs.unlinkSync(path.join(tmpDir, file));
                } catch (err) {
                    botState.log('warning', `Could not delete temp file ${file}: ${err.message}`);
                }
            });
        }
    } catch (err) {
        botState.log('error', `Error cleaning up temp files: ${err.message}`);
    }
}

// Function to properly end the socket connection
async function endConnection(sock) {
    if (!sock) return;
    try {
        // Remove all listeners to prevent memory leaks
        sock.ev.removeAllListeners('connection.update');
        sock.ev.removeAllListeners('messages.upsert');
        sock.ev.removeAllListeners('creds.update');
        
        // End the socket connection gracefully
        await sock.end();
        botState.log('info', 'WhatsApp connection ended gracefully');
    } catch (err) {
        botState.log('error', `Error ending connection: ${err.message}`);
    }
}

async function startBot() {
    try {
        // Add explicit debugging
        console.log("🚀 Starting WhatsApp bot connection process...");
        botState.log('info', 'Initializing WhatsApp connection...');
        
        // Set the initial status
        botState.setStatus('connecting');
        
        // Don't try to reconnect if already reconnecting or shutting down
        if (isReconnecting || shutdownInProgress) {
            botState.log('warning', 'Already attempting to reconnect or shutting down. Skipping duplicate reconnection.');
            return;
        }
        
        // CRITICAL: Check if we already have an active connected socket
        if (globalSock && botState.state.status === 'connected') {
            botState.log('warning', 'Bot is already connected! Ignoring duplicate connection attempt.');
            return;
        }
        
        isReconnecting = true;
        
        // If we have an existing connection, end it properly first
        if (globalSock) {
            botState.log('info', 'Cleaning up previous connection before reconnecting...');
            try {
                // Don't await - just fire and forget to avoid blocking
                endConnection(globalSock).catch(e => 
                    botState.log('warning', `Error during connection cleanup: ${e.message}`)
                );
            } catch (e) {
                botState.log('warning', `Error initiating cleanup: ${e.message}`);
            }
            globalSock = null;
            
            // Wait a moment for cleanup to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Clean up temporary files that might be causing conflicts
        cleanupTempFiles();
        
        // Ensure the auth_info directory exists with explicit permissions
        console.log("📁 Checking auth directory...");
        if (!fs.existsSync('./auth_info')) {
            fs.mkdirSync('./auth_info', { recursive: true, mode: 0o755 });
            botState.log('info', 'Created auth_info directory for session persistence');
        } else {
            botState.log('info', 'Using existing auth_info directory');
        }

        console.log("🔑 Loading authentication state...");
        // Use a try/catch specifically for the auth state loading
        let state, saveCreds;
        try {
            const authResult = await useMultiFileAuthState('auth_info'); 
            state = authResult.state;
            saveCreds = authResult.saveCreds;
            console.log("✅ Authentication state loaded successfully");
        } catch (authError) {
            console.error("❌ Failed to load authentication state:", authError);
            botState.log('error', `Authentication state error: ${authError.message}`);
            
            // REMOVED: Session deletion - just log and continue
            botState.log('warning', 'Authentication state error occurred, but keeping session files intact');
            return;
        }
        
        // Get phone number in proper international format
        // IMPORTANT: Only use OWNER_NUMBER for NEW connections (when not already logged in)
        // If we already have auth state with a logged-in user, DON'T try to pair with a different number
        const phoneNumber = OWNER_NUMBER.startsWith('+') 
            ? OWNER_NUMBER.substring(1) // Remove + if present
            : OWNER_NUMBER.replace(/[^\d]/g, ''); // Remove any non-digit characters

        console.log("📱 Creating WhatsApp connection...");
        
        // Check if we already have a logged-in session
        if (state.creds && state.creds.me) {
            console.log(`🔐 Found existing session for: ${state.creds.me.id}`);
            console.log(`⚠️ Note: Your config owner number is ${phoneNumber}, but session is for ${state.creds.me.id}`);
            console.log(`💡 If these don't match, you may need to delete auth_info and login with the correct number`);
        } else {
            console.log(`🔗 Will request pairing code for phone: ${phoneNumber}`);
        }

        // Create socket with minimal settings
        try {
            console.log("⚙️ Starting connection...");
            
            // REMOVED: Auth directory cleaning/deletion
            
            // Using absolute minimum settings to avoid any compatibility issues
            const sock = makeWASocket({
                auth: state,
                // Removed printQRInTerminal - handle QR in connection.update event
                syncFullHistory: false,
                getMessage: async () => {
                    return { conversation: '' };
                }
            });

            // Store socket globally
            globalSock = sock;
            
            console.log('✅ Socket created and stored globally');

            // Save credentials
            sock.ev.on('creds.update', saveCreds);
            
            console.log('✅ Credentials handler registered');

            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                
                // Log all connection updates
                console.log(`🔄 Connection update: ${connection || 'No connection status change'}`);
                
                if (qr) {
                    console.log('\n======================================================');
                    console.log('📱 SCAN THIS QR CODE WITH YOUR PHONE:');
                    console.log('1. Open WhatsApp on your phone');
                    console.log('2. Go to Settings > Linked Devices');
                    console.log('3. Tap on "Link a Device"');
                    console.log('4. Point your phone camera at the QR code in the terminal');
                    console.log('======================================================\n');
                    
                    // Generate QR code in terminal manually
                    qrcode.generate(qr, { small: true });
                    
                    botState.setQRCode(qr);
                }
                
                if (connection === 'open') {
                    console.log('🟢 Connection opened successfully!');
                    botState.setStatus('connected');
                    
                    connectionAttempts = 0;
                    isReconnecting = false;
                    
                    // Show connected user information
                    if (sock.user) {
                        console.log(`✅ Connected as: ${sock.user.id}`);
                        botState.setUser(sock.user);
                    }
                    
                    // Mark that we have a successful connection
                    console.log('✅ Connection is now stable and ready to receive messages');
                    
                } else if (connection === 'close') {
                    console.log('⚠️ Connection closed event received');
                    console.log(`📊 Status: isReconnecting=${isReconnecting}, shutdownInProgress=${shutdownInProgress}`);
                    
                    // If we're in the middle of waiting for pairing, don't immediately disconnect
                    if (qr && !botState.state.pairingTimedOut) {
                        console.log('⚠️ Connection closed, but we\'re waiting for pairing. Will continue waiting.');
                        return; // Don't proceed with reconnection yet, give user time to enter code
                    }
                    
                    connectionAttempts++;
                    botState.setStatus('disconnected');
                    
                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const reasonPayload = lastDisconnect?.error?.output?.payload;
                    const reason = reasonPayload ? reasonPayload.error || reasonPayload.message : 'Unknown';
                    const errorStack = lastDisconnect?.error?.stack || 'No stack trace';
                    
                    botState.log('warning', `Connection closed. Status: ${statusCode}, Reason: ${reason}`);
                    
                    // Save the last disconnect info for diagnostics
                    botState.state.lastDisconnect = {
                        time: Date.now(),
                        statusCode,
                        reason,
                        attempts: connectionAttempts
                    };
                    
                    // Check if we're logged out or banned
                    if (statusCode === DisconnectReason.loggedOut || 
                        statusCode === DisconnectReason.connectionReplaced || 
                        statusCode === 401 || 
                        statusCode === 403 || 
                        statusCode === 408 || 
                        statusCode === 440 || 
                        reason.includes('logout') || 
                        reason.includes('forbidden') || 
                        reason.includes('replaced')) {
                        
                        botState.log('error', '❌ Critical connection issue detected: ' + reason);
                        
                        // REMOVED: Session deletion on critical errors
                        // Just log the error and stop reconnection attempts
                        botState.log('error', 'Bot stopped due to critical error. Session files preserved. Please check the issue and restart manually if needed.');
                        shutdownInProgress = true;
                        return;
                    }
                    
                    // Check if we should try to reconnect
                    if (connectionAttempts < maxConnectionAttempts && !shutdownInProgress) {
                        const timeoutDuration = reconnectDelay * Math.min(3, connectionAttempts); // Exponential backoff
                        
                        botState.log('info', `Attempting to reconnect in ${timeoutDuration/1000} seconds... (Attempt ${connectionAttempts}/${maxConnectionAttempts})`);
                        
                        // Wait before reconnecting to avoid rapid reconnect loop
                        setTimeout(async () => {
                            botState.log('info', `Reconnecting now... (Attempt ${connectionAttempts}/${maxConnectionAttempts})`);
                            isReconnecting = false;
                            await startBot();
                        }, timeoutDuration);
                    } else if (connectionAttempts >= maxConnectionAttempts && !shutdownInProgress) {
                        botState.log('error', `Maximum reconnection attempts (${maxConnectionAttempts}) reached. Session files preserved. Please check the connection and restart manually.`);
                        
                        // REMOVED: Session deletion on max attempts
                        shutdownInProgress = true;
                    }
                }
            });

            // Handle messages
            sock.ev.on('messages.upsert', async ({ messages, type }) => {
                try {
                    // Update message stats
                    botState.incrementMessages();
                    
                    // Process each message
                    for (const message of messages) {
                        // Ignore update types that are not chat messages
                        if (message.type !== 'notify') continue;
                        
                        // Skip messages without content
                        if (!message.message) continue;
                        
                        const sender = message.key.remoteJid;
                        
                        // Log the message details for debugging
                        botState.log('info', `Message received: remoteJid=${sender}, fromMe=${message.key.fromMe}, messageType=${Object.keys(message.message)[0]}`);
                        
                        // Skip status messages as they're handled by the status modules
                        if (sender.endsWith('@broadcast')) continue;
                        
                        // Store message for anti-delete feature if available
                        if (commands.has('antidelete')) {
                            commands.get('antidelete').storeMessage(message, OWNER_NUMBER);
                        }
                        
                        // Extract the message text from different message types
                        const text = message.message.conversation || 
                                    message.message.extendedTextMessage?.text || 
                                    message.message.imageMessage?.caption ||
                                    message.message.videoMessage?.caption;
                        
                        // Skip empty messages
                        if (!text) continue;
                        
                        // Get the actual sender ID, which might be different from remoteJid in group chats
                        const actualSender = message.key.participant || message.key.remoteJid;
                        
                        // Check if message is from the owner (in any chat)
                        const isOwner = actualSender === OWNER_NUMBER;
                        
                        // Skip messages from the bot itself unless it's from the owner
                        if (message.key.fromMe && !isOwner) continue;
                        
                        // Check if this is a private chat (not a group) and not from the bot itself
                        const isPrivateChat = !sender.endsWith('@g.us') && !sender.endsWith('@broadcast');
                        const isGroupChat = sender.endsWith('@g.us');
                        
                        // Log where the message is coming from
                        const chatType = isGroupChat ? 'GROUP' : 'PRIVATE';
                        botState.log('info', `Message from ${isOwner ? 'OWNER' : actualSender} in ${chatType} chat: ${text}`);

                        // Simulate presence (typing/recording) for all messages if the feature is enabled
                        if (config.presenceSettings && config.presenceSettings.enabled) {
                            // Detect message type and simulate appropriate presence
                            const messageType = detectMessageType(message);
                            
                            // Queue the presence simulation asynchronously so we don't block processing
                            simulatePresence(sock, sender, text, messageType, config.presenceSettings)
                                .catch(err => botState.log('error', `Error in presence simulation: ${err.message}`));
                        }
                        
                        // Check if this is a command and process it
                        if (text && text.startsWith(PREFIX)) {
                            botState.incrementCommands();
                            
                            // Parse the command and arguments
                            const args = text.slice(PREFIX.length).trim().split(/ +/);
                            const command = args.shift().toLowerCase();
                            
                            botState.log('info', `Command detected: ${command}, args: ${args.join(', ')}`);
                            
                            // Check if the command exists
                            if (commands.has(command)) {
                                try {
                                    // Get the command handler
                                    const cmd = commands.get(command);
                                    
                                    // Check owner-only commands
                                    if (cmd.ownerOnly && !isOwner) {
                                        await sock.sendMessage(sender, { text: '⛔ This command can only be used by the bot owner.' });
                                        continue;
                                    }
                                    
                                    // Execute the command with error handling
                                    botState.log('info', `Executing command: ${command}`);
                                    await cmd.execute(sock, message, args, isOwner);
                                    botState.log('info', `Command ${command} executed successfully`);
                                } catch (cmdError) {
                                    botState.log('error', `Error executing command ${command}: ${cmdError.message}`);
                                    // Send error message to user
                                    await sock.sendMessage(sender, { 
                                        text: `⚠️ Error executing command: ${cmdError.message}\nPlease try again or contact the bot owner.` 
                                    });
                                }
                            } else {
                                // Unknown command
                                await sock.sendMessage(sender, { 
                                    text: `⚠️ Unknown command: ${command}\nType ${PREFIX}help to see available commands.` 
                                });
                            }
                        }
                    }
                } catch (error) {
                    botState.log('error', `Error processing message: ${error.message}`);
                    botState.incrementErrors();
                }
            });

            // Listen for socket manager events
            setupSocketManagerEvents(sock);

        } catch (error) {
            botState.log('error', `Failed to start bot: ${error.message}`);
            botState.setStatus('disconnected');
            
            // Try to reconnect
            if (connectionAttempts < maxConnectionAttempts) {
                connectionAttempts++;
                botState.log('info', `Reconnection attempt ${connectionAttempts}/${maxConnectionAttempts}`);
                
                setTimeout(() => {
                    isReconnecting = false;
                    startBot();
                }, 5000); // Wait 5 seconds before reconnecting
            } else {
                botState.log('error', 'Maximum reconnection attempts reached. Session files preserved. Please restart the bot manually.');
            }
        }
    } catch (error) {
        botState.log('error', `Failed to start bot: ${error.message}`);
        botState.setStatus('disconnected');
        
        // Try to reconnect
        if (connectionAttempts < maxConnectionAttempts) {
            connectionAttempts++;
            botState.log('info', `Reconnection attempt ${connectionAttempts}/${maxConnectionAttempts}`);
            
            setTimeout(() => {
                isReconnecting = false;
                startBot();
            }, 5000); // Wait 5 seconds before reconnecting
        } else {
            botState.log('error', 'Maximum reconnection attempts reached. Session files preserved. Please restart the bot manually.');
        }
    }
}

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
            botState.log('warning', `Failed to notify owner about restart: ${error.message}`);
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
        
        botState.log('info', `Sending message from admin panel to ${to}`);
        
        try {
            if (type === 'text') {
                await sock.sendMessage(to, { text: formatMessage(message) });
            } else {
                // Handle other message types if needed
                botState.log('warning', `Unsupported message type: ${type}`);
            }
            
            botState.log('info', `Message sent successfully to ${to}`);
        } catch (error) {
            botState.log('error', `Failed to send message to ${to}: ${error.message}`);
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
                botState.log('warning', `Failed to notify owner about config update: ${error.message}`);
            }
        } catch (error) {
            botState.log('error', `Failed to update config: ${error.message}`);
        }
    });
}

// Handler for the ping command
async function handlePingCommand(sock, jid) {
    const start = new Date().getTime();
    
    // Send the initial message
    const msg = await sock.sendMessage(jid, { text: formatMessage('🔡 Measuring response time...') });
    
    // Calculate time difference
    const end = new Date().getTime();
    const responseTime = end - start;
    
    // Send the response time
    await sock.sendMessage(jid, { 
        text: formatMessage(`🏓 Pong!\nResponse time: ${responseTime}ms`) 
    });
}

// Handler for the help command
async function handleHelpCommand(sock, jid, isOwner) {
    // Create a list of available commands
    let helpText = createBanner('Help Menu', 'elegant');
    
    // Built-in commands
    helpText += '\n*Built-in Commands:*\n';
    helpText += `• ${PREFIX}ping - Test bot response time\n`;
    helpText += `• ${PREFIX}help - Show this help menu\n`;
    
    // Owner-only built-in commands
    if (isOwner) {
        helpText += '\n*Owner Commands:*\n';
        helpText += `• ${PREFIX}restart - Restart the bot\n`;
        helpText += `• ${PREFIX}stats - Show bot statistics\n`;
    }
    
    // Get help text for other commands
    const commandCategories = new Map();
    
    commands.forEach((command, name) => {
        // Skip commands that require owner if user is not owner
        if (command.ownerOnly && !isOwner) return;
        
        // Create category if it doesn't exist
        if (!commandCategories.has(command.category)) {
            commandCategories.set(command.category, []);
        }
        
        // Add command to category
        commandCategories.get(command.category).push({
            name,
            description: command.description
        });
    });
    
    // Sort categories
    const sortedCategories = [...commandCategories.entries()].sort();
    
    // Add commands by category
    for (const [category, cmds] of sortedCategories) {
        helpText += `\n*${category}:*\n`;
        
        // Sort commands within category
        cmds.sort((a, b) => a.name.localeCompare(b.name));
        
        for (const cmd of cmds) {
            helpText += `• ${PREFIX}${cmd.name} - ${cmd.description}\n`;
        }
    }
    
    // Send the help message
    await sock.sendMessage(jid, { text: formatMessage(helpText) });
}

// Calculate and format uptime
function getUptime() {
    return botState.getUptime();
}

// Print a console banner
console.log(createBanner('WhatsApp Bot', 'blocks'));
botState.log('info', 'Bot starting up...');

// IMPORTANT: Only start the bot once when the module first loads
// Use a flag to prevent duplicate initialization
let botStarted = false;

if (!botStarted) {
    botStarted = true;
    startBot();
} else {
    console.log('⚠️ Bot already started, skipping duplicate initialization');
}

// Handle process termination
process.on('SIGINT', async () => {
    shutdownInProgress = true;
    botState.log('info', 'Bot shutdown initiated by SIGINT signal');
    
    try {
        await endConnection(globalSock);
    } catch (err) {
        botState.log('error', `Error during shutdown: ${err.message}`);
    }
    
    process.exit(0);
});

// REMOVED: deleteAuthAndRestart function entirely - no longer needed

// Add helper function to manually request pairing code
async function requestPairingCodeManually() {
    if (!globalSock) {
        console.log('❌ No active connection to request pairing code');
        return;
    }
    
    try {
        const phoneNumber = OWNER_NUMBER.startsWith('+') 
            ? OWNER_NUMBER.substring(1) // Remove + if present
            : OWNER_NUMBER.replace(/[^\d]/g, ''); // Remove any non-digit characters
            
        console.log('\n-------------------------------------------------------------');
        console.log('🔄 Manually requesting new pairing code...');
        console.log(`📱 For phone number: ${phoneNumber}`);
        console.log('-------------------------------------------------------------\n');
        
        const code = await globalSock.requestPairingCode(phoneNumber);
        
        console.log('\n-------------------------------------------------------------');
        console.log('✅ NEW PAIRING CODE RECEIVED!');
        console.log(`📲 Your pairing code: ${code}`);
        console.log('📝 Enter this code on your WhatsApp mobile app:');
        console.log('   1. Open WhatsApp on your phone');
        console.log('   2. Go to Settings > Linked Devices');
        console.log('   3. Tap on "Link a Device"');
        console.log('   4. When it shows the QR scanner, tap "Link with phone number"');
        console.log('   5. Enter the pairing code shown above');
        console.log('-------------------------------------------------------------\n');
        
        // Reset pairing timeout
        if (botState.state.pairingTimeout) {
            clearTimeout(botState.state.pairingTimeout);
        }
        
        // Set a longer timeout for pairing - give the user 2 minutes to enter the code
        botState.state.pairingTimeout = setTimeout(() => {
            if (globalSock && !botState.state.connected) {
                console.log('⏱️ Pairing code timeout - no response received after 2 minutes');
                console.log('If you need more time, please request a new pairing code by typing "r" and pressing Enter.');
            }
        }, 120000); // 2 minutes
        
        return true;
    } catch (error) {
        console.error('❌ Failed to request pairing code:', error);
        return false;
    }
}

// Add manual pairing code request on console input
process.stdin.on('data', async (data) => {
    const input = data.toString().trim().toLowerCase();
    
    if (input === 'r' || input === 'refresh' || input === 'renew') {
        console.log('🔄 Manual refresh requested...');
        await requestPairingCodeManually();
    } else if (input === 'q' || input === 'quit' || input === 'exit') {
        console.log('👋 Manual exit requested...');
        process.exit(0);
    } else if (input === 'help' || input === 'h' || input === '?') {
        console.log('\n-------------------------------------------------------------');
        console.log('Available commands:');
        console.log('r/refresh/renew - Request a new pairing code');
        console.log('q/quit/exit - Exit the bot');
        console.log('help/h/? - Show this help message');
        console.log('-------------------------------------------------------------\n');
    }
});
