/**
 * Menu Command
 * Displays a beautiful and well-organized bot menu with elegant styling
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Execute the menu command
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const execute = async (sock, sender, text, context = {}) => {
    try {
        // Get commands directly from the imported commands module
        const commands = require('./index.js');
        
        // Get bot stats
        const uptime = process.uptime();
        const uptimeString = formatUptime(uptime);
        const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });
        const currentDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const ramUsage = Math.round(process.memoryUsage().heapUsed / (1024 * 1024) * 100) / 100;
        const commandCount = Object.keys(commands).length + 3; // Add built-in commands
        
        // Create categories
        const iaCommands = [];
        const funCommands = [];
        const downloaderCommands = [];
        const utilsCommands = [];
        
        // Categorize commands
        commands.forEach((cmd, name) => {
            if (name.includes('gemini') || name.includes('ytsearch')) {
                iaCommands.push(cmd);
            } else if (name.includes('play') || name.includes('spotify')) {
                downloaderCommands.push(cmd);
            } else if (name.includes('status') || name.includes('sreact')) {
                funCommands.push(cmd);
            } else {
                utilsCommands.push(cmd);
            }
        });

        // Create an elegant styled menu with the requested theme
        let menuText = `╔══✧『 𝓢𝓲𝓻𝓣𝓱𝓮𝓟𝓻𝓸𝓰𝓻𝓪𝓶𝓶𝓮𝓻-𝓥1 』✧══❖
║ ❐┌─────────────────┐
║ ❐│    ⚡ BOT STATUS ⚡    
║ ❐│ ✦ 𝙾𝚠𝚗𝚎𝚛 : SirTheProgrammer
║ ❐│ ✦ 𝙿𝚛𝚎𝚏𝚒𝚡 : [ . ]
║ ❐│ ✦ 𝙼𝚘𝚍𝚎 : public
║ ❐│ ✦ 𝚃𝚒𝚖𝚎 : ${currentTime}
║ ❐│ ✦ 𝚁𝚊𝚖 : ${ramUsage}MB
║ ❐│ ✦ 𝙳𝚊𝚝𝚎 : ${currentDate}
║ ❐│ ✦ 𝚄𝚙𝚝𝚒𝚖𝚎 : ${uptimeString}
║ ❐│ ✦ 𝙲𝚘𝚖𝚖𝚊𝚗𝚍𝚜 : ${commandCount}
║ ❐└─────────────────┘
╚══✧『 COMMANDS LIST 』✧══❖`;

        // Add IA commands section
        if (iaCommands.length > 0) {
            menuText += `

╔══✧『 AI FEATURES 』✧══❖`;
            // Add IA commands
            iaCommands.forEach(cmd => {
                menuText += `
║ ✦ ${cmd.usage || '.' + cmd.name}`;
            });
            menuText += `
╚══════════════════❖`;
        }
        
        // Add downloader commands section
        if (downloaderCommands.length > 0) {
            menuText += `

╔══✧『 DOWNLOADER 』✧══❖`;
            // Add downloader commands
            downloaderCommands.forEach(cmd => {
                menuText += `
║ ✦ ${cmd.usage || '.' + cmd.name}`;
            });
            menuText += `
╚══════════════════❖`;
        }
        
        // Add fun commands section
        if (funCommands.length > 0) {
            menuText += `

╔══✧『 FUN & STATUS 』✧══❖`;
            // Add fun commands
            funCommands.forEach(cmd => {
                menuText += `
║ ✦ ${cmd.usage || '.' + cmd.name}`;
            });
            menuText += `
╚══════════════════❖`;
        }
        
        // Add utility commands section
        if (utilsCommands.length > 0 || true) { // Always show Utils section for built-in commands
            menuText += `

╔══✧『 UTILITIES 』✧══❖`;
            
            // Add utility commands
            utilsCommands.forEach(cmd => {
                menuText += `
║ ✦ ${cmd.usage || '.' + cmd.name}`;
            });
            
            // Add built-in commands
            menuText += `
║ ✦ .menu
║ ✦ .help
║ ✦ .ping`;
            menuText += `
╚══════════════════❖`;
        }
        
        // Add footer with credits
        menuText += `

╔══✧『 THANK YOU 』✧══════❖
║ Creator: *SirTheProgrammer*
╚═════════════════════════❖`;
        
        // Try to send with thumbnail
        try {
            // Use local image path - make sure the directory exists
            const imagePath = path.join(__dirname, '..', 'pic', 'index.png');
            
            if (fs.existsSync(imagePath)) {
                try {
                    const imageBuffer = fs.readFileSync(imagePath);
                    
                    await sock.sendMessage(sender, {
                        image: imageBuffer,
                        caption: menuText,
                        jpegThumbnail: imageBuffer.toString('base64')
                    });
                } catch (imgError) {
                    console.log('Error processing image:', imgError.message);
                    throw imgError; // Rethrow to trigger fallback
                }
            } else {
                throw new Error('Image not found'); // Trigger fallback
            }
        } catch (thumbnailError) {
            console.log('Error sending menu with image, falling back to text menu:', thumbnailError.message);
            
            // Try with a web image as backup
            try {
                await sock.sendMessage(sender, {
                    image: { url: 'https://i.ibb.co/mNB2R5K/sirtheprogrammer-bot.png' },
                    caption: menuText
                });
            } catch (webImageError) {
                console.log('Web image failed too, sending text-only menu');
                // Fallback to text-only menu
                await sock.sendMessage(sender, { text: menuText });
            }
        }

    } catch (error) {
        console.error('Error in menu command:', error);
        await sock.sendMessage(sender, { 
            text: '❌ An error occurred while generating the menu. Please try again.'
        });
    }
};

/**
 * Format uptime in a readable way
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / (3600 * 24));
    const hours = Math.floor((seconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = {
    name: 'menu',
    description: 'Shows bot menu with all commands',
    usage: '.menu',
    execute
};
