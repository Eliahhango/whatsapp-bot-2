/**
 * YouTube Search Command
 * Search YouTube for videos (diagnostic command)
 */

const yts = require("yt-search");
const { formatMessage, createBanner } = require('../utils');

/**
 * Execute the YouTube search command
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const execute = async (sock, sender, text, context = {}) => {
    try {
        // Extract query (remove ".ytsearch " from the beginning)
        const query = text.slice(10).trim();
        
        // Check if query is empty
        if (!query) {
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `Please provide a search term.\n\n*Usage:* .ytsearch [query]\n\n*Example:* .ytsearch love nwantiti`,
                    { headerTitle: '❌ MISSING SEARCH TERM', style: 'minimal' }
                )
            });
            return;
        }
        
        // Send searching message
        await sock.sendMessage(sender, { 
            text: formatMessage(
                `${createBanner('🔍 SEARCHING YOUTUBE', 'dotted')}\n\nLooking for: *${query}*\n\nPlease wait...`,
                { headerTitle: '🔎 YOUTUBE SEARCH', style: 'fancy' }
            )
        });
        
        // Search YouTube
        console.log(`Searching YouTube for: ${query}`);
        const searchResults = await yts(query);
        
        // Check if there are any results
        if (!searchResults.videos.length) {
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `No results found for *${query}*.\n\nPlease try with different keywords.`,
                    { headerTitle: '❌ NO RESULTS', style: 'minimal' }
                )
            });
            return;
        }
        
        // Format results (first 5 videos)
        const videos = searchResults.videos.slice(0, 5);
        let resultsText = `${createBanner('🎬 SEARCH RESULTS', 'star')}\n\n`;
        
        videos.forEach((video, index) => {
            resultsText += `*${index + 1}. ${video.title}*\n`;
            resultsText += `👤 Channel: ${video.author.name}\n`;
            resultsText += `⏱️ Duration: ${video.timestamp}\n`;
            resultsText += `👁️ Views: ${video.views.toLocaleString()}\n`;
            resultsText += `🔗 URL: ${video.url}\n\n`;
        });
        
        resultsText += `${createBanner('📝 DIAGNOSTIC INFO', 'dotted')}\n\n`;
        resultsText += `• Total results: ${searchResults.videos.length}\n`;
        resultsText += `• Search term: ${query}\n`;
        resultsText += `• To download one of these songs, use the .play command.\n`;
        
        // Send results
        await sock.sendMessage(sender, { 
            text: formatMessage(resultsText, {
                headerTitle: '🔎 YOUTUBE SEARCH RESULTS', 
                style: 'fancy'
            })
        });
        
    } catch (error) {
        console.error(`Error in YouTube search:`, error);
        await sock.sendMessage(sender, { 
            text: formatMessage(
                `An error occurred while searching YouTube.\n\nError: ${error.message}\n\nPlease try again later.`,
                { headerTitle: '❌ SEARCH ERROR', style: 'minimal' }
            )
        });
    }
};

module.exports = {
    name: 'ytsearch',
    description: 'Search YouTube videos directly (diagnostic tool)',
    usage: '.ytsearch [query]',
    execute
}; 