/**
 * Configuration File
 * Contains API keys and configuration settings
 */

module.exports = {
    // Gemini AI API Key
    geminiApiKey: 'AIzaSyAoapBGo5DThK8IwNgc11cLKY9jcEE_psU',
    
    // Bot owner WhatsApp ID
    ownerNumber: '255793710144@s.whatsapp.net',
    
    // Command prefix
    prefix: '.',
    
    // Maximum song duration in seconds (10 minutes)
    maxSongDuration: 600,
    
    // Download settings
    downloadSettings: {
        // Audio bitrate for downloads
        audioBitrate: 128,
        // Max concurrent downloads per user
        maxConcurrentDownloads: 1
    },
    
    // Auto-typing and presence simulation settings
    presenceSettings: {
        // Whether to enable auto-typing/recording simulation
        enabled: true,
        
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
    }
}; 
