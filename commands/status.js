/**
 * Status Auto-Viewer Command
 * Allows toggling automatic viewing of WhatsApp statuses
 */

const { formatMessage } = require('../utils');

// Store the auto-view status globally (starts as disabled)
let autoViewEnabled = false;
let autoViewStats = {
    totalViewed: 0,
    lastViewed: null,
    startTime: null
};

/**
 * Setup the status auto-viewer functionality on the socket
 * @param {Object} sock - WhatsApp socket connection
 */
function setupStatusViewer(sock) {
    // Remove any existing listener first to avoid duplicates
    sock.ev.removeAllListeners('messages.upsert.status');

    if (autoViewEnabled) {
        // Track when auto-viewing was started
        autoViewStats.startTime = new Date();
        
        // Listen for status updates
        sock.ev.on('messages.upsert', async (m) => {
            if (!autoViewEnabled) return; // Check if still enabled
            
            const message = m.messages[0];
            if (!message || !message.key || !message.key.remoteJid) return;

            const from = message.key.remoteJid;

            // Detect if the message is a status update
            if (from.endsWith('@broadcast')) {
                const sender = from.replace('@broadcast', '@s.whatsapp.net');
                console.log(`📱 New status detected from: ${sender}`);

                // Automatically mark the status as "viewed"
                try {
                    await sock.readMessages([message.key]);
                    
                    // Update stats
                    autoViewStats.totalViewed++;
                    autoViewStats.lastViewed = new Date();
                    
                    console.log(`✅ Viewed status from: ${sender}`);
                } catch (err) {
                    console.error(`❌ Failed to view status from: ${sender}`, err);
                }
            }
        });
        
        console.log('🔔 Status auto-viewer has been ENABLED');
    } else {
        console.log('🔕 Status auto-viewer has been DISABLED');
        // Reset stats if disabled
        autoViewStats = {
            totalViewed: 0,
            lastViewed: null,
            startTime: null
        };
    }
}

/**
 * Execute the status command
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
            text: formatMessage('⛔ Only the bot owner can manage status auto-viewing settings')
        });
        return;
    }
    
    // Handle subcommands
    if (subCommand === 'on' || subCommand === 'enable') {
        autoViewEnabled = true;
        setupStatusViewer(sock);
        await sock.sendMessage(sender, { 
            text: formatMessage('✅ Status auto-viewing has been ENABLED. All new status updates will be marked as viewed automatically.')
        });
    } 
    else if (subCommand === 'off' || subCommand === 'disable') {
        autoViewEnabled = false;
        setupStatusViewer(sock);
        await sock.sendMessage(sender, { 
            text: formatMessage('🔕 Status auto-viewing has been DISABLED.')
        });
    }
    else if (subCommand === 'stats') {
        // Format the duration if available
        let duration = 'Not active';
        if (autoViewStats.startTime) {
            const diff = new Date() - autoViewStats.startTime;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            duration = `${hours}h ${minutes}m`;
        }
        
        // Format the last viewed date if available
        const lastViewed = autoViewStats.lastViewed 
            ? autoViewStats.lastViewed.toLocaleString() 
            : 'None';
        
        const statsMessage = `📊 *Status Auto-Viewer Stats*\n\n` +
            `👁️ Status: ${autoViewEnabled ? '✅ ENABLED' : '❌ DISABLED'}\n` +
            `👀 Total Viewed: ${autoViewStats.totalViewed}\n` +
            `⏱️ Running for: ${duration}\n` +
            `🕒 Last Viewed: ${lastViewed}`;
            
        await sock.sendMessage(sender, { text: formatMessage(statsMessage) });
    }
    else {
        // Default help message
        const helpMessage = `*🔍 Status Auto-Viewer Help*\n\n` +
            `This feature automatically marks all WhatsApp status updates as "viewed".\n\n` +
            `*Commands:*\n` +
            `• *.status on* - Enable auto-viewing\n` +
            `• *.status off* - Disable auto-viewing\n` +
            `• *.status stats* - View statistics\n\n` +
            `*Current Status:* ${autoViewEnabled ? '✅ ENABLED' : '❌ DISABLED'}`;
            
        await sock.sendMessage(sender, { text: formatMessage(helpMessage) });
    }
};

module.exports = {
    name: 'status',
    description: 'Automatically view WhatsApp status updates',
    usage: '.status [on|off|stats]',
    execute,
    setupStatusViewer // Export the setup function so it can be initialized
}; 