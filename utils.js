/**
 * Utility functions for the WhatsApp bot
 */

/**
 * Add header and footer to message text
 * @param {string} text - The message text to wrap
 * @param {Object} options - Optional formatting options
 * @returns {string} - Formatted message with header and footer
 */
function formatMessage(text, options = {}) {
    // Default options
    const defaults = {
        showHeader: true,
        showFooter: true,
        headerTitle: '𝐒𝐈𝐑𝐓𝐇𝐄𝐏𝐑𝐎𝐆𝐑𝐀𝐌𝐌𝐄𝐑 𝐁𝐎𝐓',
        footerText: '© 𝐒𝐈𝐑𝐓𝐇𝐄𝐏𝐑𝐎𝐆𝐑𝐀𝐌𝐌𝐄𝐑 • @sirtheprogrammer',
        style: 'default' // Can be 'default', 'fancy', 'minimal', or 'double'
    };

    // Merge provided options with defaults
    const settings = { ...defaults, ...options };

    // Format the message with header and footer
    let formattedMessage = '';

    // Add header if enabled
    if (settings.showHeader) {
        switch (settings.style) {
            case 'fancy':
                formattedMessage += `┏━━━✦ ⋆ ❅ ⋆ ✦━━━┓\n┃ *${settings.headerTitle}* ┃\n┗━━━✦ ⋆ ❅ ⋆ ✦━━━┛\n\n`;
                break;
            case 'minimal':
                formattedMessage += `── *${settings.headerTitle}* ──\n\n`;
                break;
            case 'double':
                formattedMessage += `╔══════════════════╗\n║ *${settings.headerTitle}* ║\n╚══════════════════╝\n\n`;
                break;
            default:
                formattedMessage += `┏━━━『 *${settings.headerTitle}* 』━━━┓\n\n`;
                break;
        }
    }

    // Add main message content
    formattedMessage += text;

    // Add footer if enabled
    if (settings.showFooter) {
        switch (settings.style) {
            case 'fancy':
                formattedMessage += `\n\n┏━━━✦ ⋆ ❅ ⋆ ✦━━━┓\n┃ ${settings.footerText} ┃\n┗━━━✦ ⋆ ❅ ⋆ ✦━━━┛`;
                break;
            case 'minimal':
                formattedMessage += `\n\n── ${settings.footerText} ──`;
                break;
            case 'double':
                formattedMessage += `\n\n╔══════════════════╗\n║ ${settings.footerText} ║\n╚══════════════════╝`;
                break;
            default:
                formattedMessage += `\n\n┗━━━『 ${settings.footerText} 』━━━┛`;
                break;
        }
    }

    return formattedMessage;
}

/**
 * Generate ASCII art text banners for sections
 * @param {string} title - Title text for the banner
 * @param {string} style - Banner style ('single', 'double', 'thick', 'dotted')
 * @returns {string} - Formatted banner
 */
function createBanner(title, style = 'single') {
    const titleText = ` ${title} `;
    
    switch (style) {
        case 'double':
            return `╔═════════${titleText}═════════╗`;
        case 'thick':
            return `┏━━━━━━━━${titleText}━━━━━━━━┓`;
        case 'dotted':
            return `┌┄┄┄┄┄┄┄┄${titleText}┄┄┄┄┄┄┄┄┐`;
        case 'star':
            return `✧･ﾟ: *✧･ﾟ:* ${titleText} *:･ﾟ✧*:･ﾟ✧`;
        default: // single
            return `┌─────────${titleText}─────────┐`;
    }
}

module.exports = {
    formatMessage,
    createBanner
}; 