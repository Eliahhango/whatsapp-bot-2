/**
 * Spotify Command
 * Searches Spotify for songs and provides audio playback
 */

const SpotifyWebApi = require('spotify-web-api-node');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const { formatMessage, createBanner } = require('../utils');
const config = require('../config');

// Spotify API credentials
const CLIENT_ID = '59fc239b83e4448c8542ac80717d90a6';
const CLIENT_SECRET = 'cca4fd2fd2e747ceaa8fdba4a2535f7e';

// Initialize Spotify API
const spotifyApi = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET
});

// Make sure the downloads directory exists
const downloadsDir = path.join(__dirname, '..', 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Track ongoing downloads to prevent spam
const activeDownloads = new Map();

// Function to refresh Spotify access token
async function refreshSpotifyToken() {
    try {
        const data = await spotifyApi.clientCredentialsGrant();
        spotifyApi.setAccessToken(data.body['access_token']);
        console.log('Spotify token refreshed, expires in', data.body['expires_in'], 'seconds');
        
        // Set a timer to refresh before expiry
        setTimeout(refreshSpotifyToken, (data.body['expires_in'] - 60) * 1000);
        return true;
    } catch (error) {
        console.error('Error refreshing Spotify token:', error);
        return false;
    }
}

/**
 * Execute the Spotify command
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const execute = async (sock, sender, text, context = {}) => {
    try {
        // Extract song name (remove ".spotify " from the beginning)
        const query = text.slice(9).trim();
        
        // Check if query is empty
        if (!query) {
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `Please provide a song name after the command.\n\n*Usage:* .spotify [song name]\n\n*Example:* .spotify billionaire bruno mars`,
                    { headerTitle: '❌ MISSING SONG NAME', style: 'minimal' }
                )
            });
            return;
        }
        
        // Check if user already has an active download
        if (activeDownloads.has(sender)) {
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `You already have a download in progress. Please wait for it to complete.`,
                    { headerTitle: '⏳ DOWNLOAD IN PROGRESS', style: 'minimal' }
                )
            });
            return;
        }
        
        // Set download as active for this user
        activeDownloads.set(sender, query);
        
        try {
            // Send searching message
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `${createBanner('🔍 SEARCHING SPOTIFY', 'dotted')}\n\nLooking for: *${query}*\n\nPlease wait while I find your song...`,
                    { headerTitle: '🎵 SPOTIFY MUSIC', style: 'fancy' }
                )
            });
            
            // Make sure we have a valid token
            await refreshSpotifyToken();
            
            // Search Spotify for the song
            const searchResponse = await spotifyApi.searchTracks(query, { limit: 5 });
            
            // Check if there are any results
            if (!searchResponse.body.tracks.items.length) {
                activeDownloads.delete(sender);
                await sock.sendMessage(sender, { 
                    text: formatMessage(
                        `No results found for *${query}*.\n\nPlease try with a different song name or add the artist name.`,
                        { headerTitle: '❌ NO RESULTS', style: 'minimal' }
                    )
                });
                return;
            }
            
            // Get the first track
            const track = searchResponse.body.tracks.items[0];
            
            // Format track data
            const title = track.name;
            const artist = track.artists.map(artist => artist.name).join(', ');
            const album = track.album.name;
            const albumCover = track.album.images[0]?.url;
            const previewUrl = track.preview_url;
            const spotifyUrl = track.external_urls.spotify;
            const durationMs = track.duration_ms;
            const durationStr = `${Math.floor(durationMs / 60000)}:${((durationMs % 60000) / 1000).toFixed(0).padStart(2, '0')}`;
            
            // Check if preview URL is available
            if (!previewUrl) {
                activeDownloads.delete(sender);
                
                // Format the top 5 tracks to display
                let resultsText = `${createBanner('🎵 SPOTIFY TRACKS FOUND', 'star')}\n\n`;
                
                searchResponse.body.tracks.items.slice(0, 5).forEach((track, index) => {
                    const trackArtist = track.artists.map(artist => artist.name).join(', ');
                    const trackDuration = `${Math.floor(track.duration_ms / 60000)}:${((track.duration_ms % 60000) / 1000).toFixed(0).padStart(2, '0')}`;
                    
                    resultsText += `*${index + 1}. ${track.name}*\n`;
                    resultsText += `👤 Artist: ${trackArtist}\n`;
                    resultsText += `💿 Album: ${track.album.name}\n`;
                    resultsText += `⏱️ Duration: ${trackDuration}\n`;
                    resultsText += `🔗 Link: ${track.external_urls.spotify}\n\n`;
                });
                
                resultsText += `ℹ️ Unfortunately, preview audio is not available for this track. You can listen to the full track on Spotify using the link above.`;
                
                await sock.sendMessage(sender, { 
                    text: formatMessage(resultsText, {
                        headerTitle: '🎵 SPOTIFY RESULTS', 
                        style: 'fancy'
                    })
                });
                return;
            }
            
            // Send info message
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `${createBanner('🎵 TRACK FOUND', 'star')}\n\n` +
                    `*Title:* ${title}\n` +
                    `*Artist:* ${artist}\n` +
                    `*Album:* ${album}\n` +
                    `*Duration:* ${durationStr}\n\n` +
                    `Now downloading a 30-second preview. Please wait...`,
                    { headerTitle: '⏳ DOWNLOADING PREVIEW', style: 'fancy' }
                )
            });
            
            // Download the preview
            const previewResponse = await axios({
                method: 'GET',
                url: previewUrl,
                responseType: 'stream'
            });
            
            // Generate unique filename
            const timestamp = Date.now();
            const previewFile = path.join(downloadsDir, `spotify_${timestamp}.mp3`);
            
            // Save the stream to a file
            const writer = fs.createWriteStream(previewFile);
            previewResponse.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
                writer.on('finish', resolve);
                writer.on('error', reject);
            });
            
            // Prepare audio message
            const audioMessage = {
                audio: fs.readFileSync(previewFile),
                mimetype: 'audio/mpeg',
                fileName: `${title} - ${artist} (Preview).mp3`,
                ptt: false
            };
            
            // Add the thumbnail if available
            if (albumCover) {
                audioMessage.headerType = 4;
                audioMessage.contextInfo = {
                    externalAdReply: {
                        title: title,
                        body: `${artist} • ${album}`,
                        mediaType: 1,
                        thumbnailUrl: albumCover,
                        sourceUrl: spotifyUrl
                    }
                };
            }
            
            // Send success message
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `${createBanner('✅ SPOTIFY PREVIEW READY', 'star')}\n\n` +
                    `*Title:* ${title}\n` +
                    `*Artist:* ${artist}\n` +
                    `*Album:* ${album}\n\n` +
                    `Note: This is a 30-second preview provided by Spotify. For the full track, visit: ${spotifyUrl}`,
                    { headerTitle: '🎵 SPOTIFY PREVIEW', style: 'fancy' }
                )
            });
            
            // Send the audio
            await sock.sendMessage(sender, audioMessage);
            
            console.log(`✅ Sent Spotify preview: ${title} (${artist}) to ${sender}`);
            
            // Clean up the file after sending
            if (fs.existsSync(previewFile)) {
                fs.unlinkSync(previewFile);
                console.log(`🧹 Cleaned up file: ${previewFile}`);
            }
            
        } catch (error) {
            console.error(`Error processing Spotify request:`, error);
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `An error occurred while processing your Spotify request.\n\nError: ${error.message}\n\nPlease try again later.`,
                    { headerTitle: '❌ SPOTIFY ERROR', style: 'minimal' }
                )
            });
        } finally {
            // Clean up resources
            activeDownloads.delete(sender);
            
            // Clean up any remaining temporary files
            try {
                const timestamp = Date.now();
                const previewFile = path.join(downloadsDir, `spotify_${timestamp}.mp3`);
                
                if (fs.existsSync(previewFile)) fs.unlinkSync(previewFile);
            } catch (e) {
                console.error(`Error cleaning up files: ${e.message}`);
            }
        }
    } catch (error) {
        console.error(`Error in Spotify command: ${error.message}`);
        activeDownloads.delete(sender);
        await sock.sendMessage(sender, { 
            text: formatMessage(
                `An error occurred while processing your request.\n\nError: ${error.message}\n\nPlease try again later.`,
                { headerTitle: '❌ ERROR', style: 'minimal' }
            )
        });
    }
};

module.exports = {
    name: 'spotify',
    description: 'Search and listen to music previews from Spotify',
    usage: '.spotify [song name]',
    execute
}; 