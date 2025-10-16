/**
 * Auto Presence Utility
 * Provides functions for simulating typing and recording presence for the WhatsApp bot
 */

/**
 * Default presence delay ranges in milliseconds
 */
const DEFAULT_SETTINGS = {
    // Text message typing simulation
    typingDelay: {
        min: 1000,    // Minimum typing time (1 second)
        max: 8000,    // Maximum typing time (8 seconds)
        perChar: 50   // Additional milliseconds per character
    },
    
    // Voice message recording simulation
    recordingDelay: {
        min: 3000,    // Minimum recording time (3 seconds) 
        max: 10000    // Maximum recording time (10 seconds)
    },
    
    // Image/media message upload simulation
    uploadingDelay: {
        min: 2000,    // Minimum upload time (2 seconds)
        max: 7000     // Maximum upload time (7 seconds)
    }
};

/**
 * Generate a random delay based on content length and type
 * @param {string} messageContent - The message content to analyze
 * @param {string} mediaType - Type of media ('text', 'voice', 'image', 'video')
 * @param {Object} settings - Custom delay settings (optional)
 * @returns {number} - Delay in milliseconds
 */
function calculateDelay(messageContent = '', mediaType = 'text', settings = {}) {
    // Merge provided settings with defaults
    const config = {
        typingDelay: { ...DEFAULT_SETTINGS.typingDelay, ...settings.typingDelay },
        recordingDelay: { ...DEFAULT_SETTINGS.recordingDelay, ...settings.recordingDelay },
        uploadingDelay: { ...DEFAULT_SETTINGS.uploadingDelay, ...settings.uploadingDelay }
    };
    
    // Calculate appropriate delay based on message type
    switch (mediaType) {
        case 'voice':
        case 'audio':
            // Random duration for recording voice
            return Math.floor(
                Math.random() * (config.recordingDelay.max - config.recordingDelay.min) + 
                config.recordingDelay.min
            );
            
        case 'image':
        case 'video':
        case 'document':
        case 'sticker':
            // Random duration for uploading media
            return Math.floor(
                Math.random() * (config.uploadingDelay.max - config.uploadingDelay.min) + 
                config.uploadingDelay.min
            );
            
        case 'text':
        default:
            // Calculate typing time based on message length
            const contentLength = messageContent.length;
            const baseDelay = Math.floor(
                Math.random() * (config.typingDelay.max - config.typingDelay.min) + 
                config.typingDelay.min
            );
            
            // Add extra time based on message length (with a cap)
            const charBasedDelay = Math.min(
                contentLength * config.typingDelay.perChar,
                10000 // Cap at 10 seconds for very long messages
            );
            
            return baseDelay + charBasedDelay;
    }
}

/**
 * Simulate typing, recording, or uploading based on content type
 * @param {Object} sock - WhatsApp socket connection
 * @param {string} chatId - Chat ID to show presence in
 * @param {string} messageContent - Content to analyze (for typing duration)
 * @param {string} mediaType - Type of content ('text', 'voice', 'image', etc)
 * @param {Object} settings - Custom delay settings (optional)
 * @returns {Promise<void>} - Resolves after typing simulation completes
 */
async function simulatePresence(sock, chatId, messageContent = '', mediaType = 'text', settings = {}) {
    try {
        // Calculate appropriate delay based on content
        const presenceDelay = calculateDelay(messageContent, mediaType, settings);
        
        // Set the appropriate presence state
        let presenceType;
        
        switch (mediaType) {
            case 'voice':
            case 'audio':
                presenceType = 'recording';
                break;
                
            case 'text':
                presenceType = 'composing';
                break;
                
            default:
                // For other media types like image, video, etc.
                // First show composing, then will pause
                presenceType = 'composing';
        }
        
        // Send presence update
        await sock.sendPresenceUpdate(presenceType, chatId);
        console.log(`🎭 Simulating ${presenceType} in chat ${chatId} for ${presenceDelay}ms`);
        
        // Wait for the calculated delay
        await new Promise(resolve => setTimeout(resolve, presenceDelay));
        
        // After delay, send paused/available update to indicate finished typing
        await sock.sendPresenceUpdate('paused', chatId);
        
    } catch (error) {
        console.error(`❌ Error simulating presence: ${error.message}`);
    }
}

/**
 * Detects message content type from the message object
 * @param {Object} messageObj - The WhatsApp message object
 * @returns {string} - The detected content type
 */
function detectMessageType(messageObj) {
    if (!messageObj || !messageObj.message) return 'text';
    
    const msgTypes = Object.keys(messageObj.message);
    
    if (msgTypes.includes('imageMessage')) return 'image';
    if (msgTypes.includes('videoMessage')) return 'video';
    if (msgTypes.includes('audioMessage')) return 'audio';
    if (msgTypes.includes('documentMessage')) return 'document';
    if (msgTypes.includes('stickerMessage')) return 'sticker';
    
    // Default to text for conversation or extendedTextMessage
    return 'text';
}

module.exports = {
    simulatePresence,
    calculateDelay,
    detectMessageType,
    DEFAULT_SETTINGS
}; 