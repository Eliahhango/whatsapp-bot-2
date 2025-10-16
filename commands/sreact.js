/**
 * Status Auto-Reaction Command
 * Automatically reacts to WhatsApp statuses with random emojis
 */

const { formatMessage } = require('../utils');

// List of emojis to randomly react with
const emojis = ["❤️", "🔥", "😍", "😂", "👍", "🎉", "💯", "😎", "👏", "🤩", 
                "🙌", "💪", "💕", "👌", "💖", "✨", "🌟", "💫", "👑", "🔆"];

// Store the auto-reaction status globally (starts as disabled)
let autoReactEnabled = false;
let reactStats = {
    totalReactions: 0,
    lastReacted: null,
    startTime: null,
    reactionCounts: {} // Track counts of used emojis
};

// Keep track of our own handler
let currentStatusHandler = null;

// Store IDs of statuses we've already reacted to
// This prevents multiple reactions to the same status
const reactedStatusIds = new Set();

/**
 * Setup the status auto-reaction functionality on the socket
 * @param {Object} sock - WhatsApp socket connection
 */
function setupStatusReactor(sock) {
    try {
        // If we have an existing handler, remove it first
        if (currentStatusHandler) {
            console.log('🧹 Removing existing status reaction handler');
            sock.ev.off('messages.upsert', currentStatusHandler);
            currentStatusHandler = null;
        }

        if (autoReactEnabled) {
            // Track when auto-reacting was started
            reactStats.startTime = new Date();
            
            // Create a handler specifically for status updates
            const statusHandler = async (m) => {
                try {
                    if (!autoReactEnabled) return; // Safety check
                    
                    // Only handle notify type updates (new messages)
                    if (m.type !== 'notify') return;
                    
                    if (!m.messages || m.messages.length === 0) return;
                    const message = m.messages[0];
                    
                    if (!message || !message.key || !message.key.remoteJid) return;
                    const from = message.key.remoteJid;

                    // Only process status updates (broadcast messages)
                    if (from.endsWith('@broadcast')) {
                        // Create a unique ID for this status
                        const statusId = `${from}:${message.key.id}`;
                        
                        // Skip if we've already reacted to this status
                        if (reactedStatusIds.has(statusId)) {
                            console.log(`🔄 Already reacted to status ${statusId}, skipping`);
                            return;
                        }
                        
                        const sender = from.replace('@broadcast', '@s.whatsapp.net');
                        console.log(`📱 New status detected for reaction from: ${sender}`);

                        // First view the status to ensure we can react
                        try {
                            await sock.readMessages([message.key]);
                            console.log(`✅ Viewed status before reaction from: ${sender}`);
                        } catch (viewErr) {
                            console.error(`❌ Could not view status before reacting: ${viewErr.message}`);
                        }

                        // Wait a small delay to simulate natural behavior
                        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

                        // Select a random emoji from the list
                        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                        
                        // Track emoji usage
                        reactStats.reactionCounts[randomEmoji] = (reactStats.reactionCounts[randomEmoji] || 0) + 1;

                        // Send a reaction to the status
                        try {
                            // Send a standard message reaction
                            await sock.sendMessage(from, {
                                react: {
                                    text: randomEmoji,
                                    key: message.key,
                                }
                            });
                            
                            // Mark this status as reacted to prevent duplicates
                            reactedStatusIds.add(statusId);
                            
                            // Store only the last 100 reacted statuses to prevent memory leaks
                            if (reactedStatusIds.size > 100) {
                                // Remove the oldest entry
                                const oldest = reactedStatusIds.values().next().value;
                                reactedStatusIds.delete(oldest);
                            }
                            
                            // Update stats on successful reaction
                            reactStats.totalReactions++;
                            reactStats.lastReacted = new Date();
                            
                            console.log(`💖 Successfully reacted to status from ${sender} with '${randomEmoji}'`);
                        } catch (reactErr) {
                            console.error(`❌ Failed to react to status from ${sender}: ${reactErr.message}`);
                            
                            // Try sending a message with the emoji instead if reaction fails
                            try {
                                await sock.sendMessage(sender, { 
                                    text: randomEmoji 
                                });
                                console.log(`⚠️ Couldn't send reaction, sent emoji message instead to ${sender}`);
                                
                                // Still count this as a reaction
                                reactStats.totalReactions++;
                                reactStats.lastReacted = new Date();
                                
                                // Mark as reacted
                                reactedStatusIds.add(statusId);
                            } catch (msgErr) {
                                console.error(`❌ Failed to send emoji message: ${msgErr.message}`);
                            }
                        }
                    }
                } catch (handlerError) {
                    console.error('❌ Error in status reaction handler:', handlerError);
                }
            };
            
            // Save reference to our handler so we can remove it later
            currentStatusHandler = statusHandler;
            
            // Register our handler
            sock.ev.on('messages.upsert', statusHandler);
            
            console.log('💖 Status auto-reactor has been ENABLED and is now listening for status updates');
        } else {
            console.log('🚫 Status auto-reactor has been DISABLED');
            // Clear the reacted status IDs when disabling
            reactedStatusIds.clear();
        }
    } catch (error) {
        console.error('❌ Error setting up status reactor:', error);
    }
}

/**
 * Clear the reacted status cache
 */
function clearReactedStatuses() {
    const count = reactedStatusIds.size;
    reactedStatusIds.clear();
    return count;
}

/**
 * Execute the status reaction command
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const execute = async (sock, sender, text, context = {}) => {
    const args = text.split(' ').slice(1);
    const subCommand = args[0]?.toLowerCase();
    
    // Only allow owner to use this command
    if (!context.isOwner) {
        await sock.sendMessage(sender, { 
            text: formatMessage('⛔ Only the bot owner can manage status reaction settings')
        });
        return;
    }
    
    // Handle subcommands
    if (subCommand === 'on' || subCommand === 'enable') {
        autoReactEnabled = true;
        setupStatusReactor(sock);
        await sock.sendMessage(sender, { 
            text: formatMessage('💖 Status auto-reactor has been ENABLED. All new status updates will receive random emoji reactions.')
        });
    } 
    else if (subCommand === 'off' || subCommand === 'disable') {
        autoReactEnabled = false;
        setupStatusReactor(sock);
        await sock.sendMessage(sender, { 
            text: formatMessage('🚫 Status auto-reactor has been DISABLED.')
        });
    }
    else if (subCommand === 'stats') {
        // Format the duration if available
        let duration = 'Not active';
        if (reactStats.startTime) {
            const diff = new Date() - reactStats.startTime;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${hours}h ${minutes}m`;
        }
        
        // Format the last reacted date if available
        const lastReacted = reactStats.lastReacted 
            ? reactStats.lastReacted.toLocaleString() 
            : 'None';
        
        // Get top used emojis
        const topEmojis = Object.entries(reactStats.reactionCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([emoji, count]) => `${emoji}: ${count}`)
            .join(', ');
        
        const statsMessage = `📊 *Status Auto-Reactor Stats*\n\n` +
            `💖 Status: ${autoReactEnabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
            `😍 Total Reactions: ${reactStats.totalReactions}\n` +
            `⏱️ Running for: ${duration}\n` +
            `🕒 Last Reacted: ${lastReacted}\n` +
            `🔝 Top Emojis: ${topEmojis || 'None yet'}\n` +
            `🧮 Cached Status IDs: ${reactedStatusIds.size}`;
            
        await sock.sendMessage(sender, { text: formatMessage(statsMessage) });
    }
    else if (subCommand === 'emojis') {
        // Show all available emojis
        const emojiList = emojis.join(' ');
        await sock.sendMessage(sender, { 
            text: formatMessage(`🎭 *Available reaction emojis:*\n\n${emojiList}`)
        });
    }
    else if (subCommand === 'test') {
        // Send a test reaction to test functionality
        const testMessage = await sock.sendMessage(sender, { 
            text: formatMessage('Testing status reaction functionality... Let me try to react to this message!')
        });
        
        // Wait a short delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Select a random emoji for the test
        const testEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        
        try {
            // Try to react to the message we just sent
            await sock.sendMessage(sender, {
                react: {
                    text: testEmoji,
                    key: testMessage.key
                }
            });
            
            await sock.sendMessage(sender, { 
                text: formatMessage(`✅ Reaction test successful! Used emoji: ${testEmoji}\n\nThis means the reaction feature is working properly. Status reactions should work if WhatsApp allows reacting to status updates.`)
            });
        } catch (error) {
            console.error('Reaction test error:', error);
            await sock.sendMessage(sender, { 
                text: formatMessage(`❌ Reaction test failed: ${error.message}\n\nThis could indicate that WhatsApp API has limitations with reactions.`)
            });
        }
    }
    else if (subCommand === 'clear') {
        // Clear the reacted status cache
        const count = clearReactedStatuses();
        await sock.sendMessage(sender, { 
            text: formatMessage(`🧹 Cleared status reaction cache. Removed ${count} cached status IDs.`)
        });
    }
    else {
        // Default help message
        const helpMessage = `*💖 Status Auto-Reactor Help*\n\n` +
            `This feature automatically reacts to WhatsApp status updates with random emojis.\n\n` +
            `*Commands:*\n` +
            `• *.sreact on* - Enable auto-reactions\n` +
            `• *.sreact off* - Disable auto-reactions\n` +
            `• *.sreact stats* - View reaction statistics\n` +
            `• *.sreact emojis* - Show available emojis\n` +
            `• *.sreact test* - Test reaction functionality\n` +
            `• *.sreact clear* - Clear status reaction cache\n\n` +
            `*Current Status:* ${autoReactEnabled ? '✅ ENABLED' : '❌ DISABLED'}`;
            
        await sock.sendMessage(sender, { text: formatMessage(helpMessage) });
    }
};

module.exports = {
    name: 'sreact',
    description: 'Automatically react to WhatsApp status updates with emojis',
    usage: '.sreact [on|off|stats|emojis|test|clear]',
    execute,
    setupStatusReactor, // Export the setup function so it can be initialized
    clearReactedStatuses
};