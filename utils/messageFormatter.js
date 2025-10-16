/**
 * Message Formatter Utility
 * Provides functions for formatting WhatsApp messages with elegant styling
 */

/**
 * Creates an elegant header section with fancy styling
 * @param {string} text - The text to display in the header
 * @param {boolean} isMainTitle - Whether this is a main title header
 * @returns {string} Formatted elegant header
 */
function createElegantHeader(text, isMainTitle = false) {
    if (isMainTitle) {
        // Convert to fancy text if needed
        const fancyText = convertToFancyText(text);
        return `╔══✧『 ${fancyText} 』✧══❖`;
    } else {
        return `╔══✧『 ${text} 』✧══❖`;
    }
}

/**
 * Creates a section footer
 * @returns {string} Formatted footer
 */
function createElegantFooter() {
    return `╚══════════════════❖`;
}

/**
 * Creates a credits section
 * @param {string} author - Creator name
 * @returns {string} Formatted credits section
 */
function createCredits(author = 'SirTheProgrammer') {
    return `
╔══✧『 THANK YOU 』✧══❖
║ Creator: *${author}*
╚══════════════════❖`;
}

/**
 * Creates an error message with elegant formatting
 * @param {string} errorText - The error message
 * @param {string} example - Example of correct usage
 * @returns {string} Formatted error message
 */
function createErrorMessage(errorText, example = '') {
    let message = `╔══✧『 ERROR 』✧══❖
║ ${errorText}
╚══════════════════❖`;

    if (example) {
        message += `\n\nExample usage: ${example}`;
    }

    return message;
}

/**
 * Formats a list of command items with bullet points
 * @param {Array} items - Array of command texts
 * @param {string} bulletStyle - Style of bullet point to use
 * @returns {string} Formatted command list
 */
function formatCommandList(items, bulletStyle = '✦') {
    return items.map(item => `║ ${bulletStyle} ${item}`).join('\n');
}

/**
 * Create a box style status display
 * @param {Array} items - Array of status items as {label, value} objects
 * @returns {string} Formatted status box
 */
function createStatusBox(items) {
    let result = `║ ❐┌─────────────────┐\n`;
    result += `║ ❐│    ⚡ BOT STATUS ⚡    \n`;
    
    items.forEach(item => {
        result += `║ ❐│ ✦ ${item.label} : ${item.value}\n`;
    });
    
    result += `║ ❐└─────────────────┘`;
    return result;
}

/**
 * Convert regular text to fancy Unicode text (mathematical monospace style)
 * @param {string} text - The text to convert
 * @returns {string} The converted fancy text
 */
function convertToFancyText(text) {
    const normalChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const fancyChars = '𝓐𝓑𝓒𝓓𝓔𝓕𝓖𝓗𝓘𝓙𝓚𝓛𝓜𝓝𝓞𝓟𝓠𝓡𝓢𝓣𝓤𝓥𝓦𝓧𝓨𝓩𝓪𝓫𝓬𝓭𝓮𝓯𝓰𝓱𝓲𝓳𝓴𝓵𝓶𝓷𝓸𝓹𝓺𝓻𝓼𝓽𝓾𝓿𝔀𝔁𝔂𝔃𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗';
    
    return text.split('').map(char => {
        const index = normalChars.indexOf(char);
        return index !== -1 ? fancyChars[index] : char;
    }).join('');
}

/**
 * Convert regular text to monospace style text
 * @param {string} text - The text to convert 
 * @returns {string} The converted monospace text
 */
function convertToMonospace(text) {
    const normalChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const monoChars = '𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿';
    
    return text.split('').map(char => {
        const index = normalChars.indexOf(char);
        return index !== -1 ? monoChars[index] : char;
    }).join('');
}

module.exports = {
    createElegantHeader,
    createElegantFooter,
    createCredits,
    createErrorMessage,
    formatCommandList,
    createStatusBox,
    convertToFancyText,
    convertToMonospace
}; 