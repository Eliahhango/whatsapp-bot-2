/**
 * Play Command
 * Downloads and sends MP3 from YouTube
 */

const ytdl = require("ytdl-core");
const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const { formatMessage, createBanner } = require('../utils');
const config = require('../config');

// Make sure downloads directory exists
const downloadsDir = path.join(__dirname, '..', 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

// Track ongoing downloads to prevent spam
const activeDownloads = new Map();

/**
 * Execute the play command
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const execute = async (sock, sender, text, context = {}) => {
    try {
        // Extract song name (remove ".play " from the beginning)
        const query = text.slice(6).trim();
        
        // Check if query is empty
        if (!query) {
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `Please provide a song name after the command.\n\n*Usage:* .play [song name]\n\n*Example:* .play love nwantiti`,
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
                    `${createBanner('🔍 SEARCHING', 'dotted')}\n\nLooking for: *${query}*\n\nPlease wait while I find and process your song...`,
                    { headerTitle: '🎵 MUSIC DOWNLOAD', style: 'fancy' }
                )
            });
            
            // Search for the song on YouTube
            const searchResults = await yts(query);
            
            // Check if there are any results
            if (!searchResults.videos.length) {
                activeDownloads.delete(sender);
                await sock.sendMessage(sender, { 
                    text: formatMessage(
                        `No results found for *${query}*.\n\nPlease try with a different song name or add the artist name.`,
                        { headerTitle: '❌ NO RESULTS', style: 'minimal' }
                    )
                });
                return;
            }
            
            // Get the first result
            const video = searchResults.videos[0];
            
            // Check video length (limit to 10 minutes to prevent abuse)
            if (video.seconds > config.maxSongDuration) {
                activeDownloads.delete(sender);
                await sock.sendMessage(sender, { 
                    text: formatMessage(
                        `The song *${video.title}* is too long (${Math.floor(video.seconds/60)}:${String(video.seconds%60).padStart(2, '0')}).\n\nPlease select a song shorter than 10 minutes.`,
                        { headerTitle: '❌ VIDEO TOO LONG', style: 'minimal' }
                    )
                });
                return;
            }
            
            // Send processing message
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `${createBanner('🎵 SONG FOUND', 'star')}\n\n` +
                    `*Title:* ${video.title}\n` +
                    `*Channel:* ${video.author.name}\n` +
                    `*Duration:* ${video.timestamp}\n` +
                    `*Views:* ${video.views.toLocaleString()}\n` +
                    `*Published:* ${video.ago}\n\n` +
                    `Now downloading and converting to MP3. This may take a few minutes...`,
                    { headerTitle: '⏳ DOWNLOADING', style: 'fancy' }
                )
            });
            
            // Generate unique filenames for temp and final files
            const timestamp = Date.now();
            const fileName = path.join(downloadsDir, `${timestamp}.mp3`);
            const tempFile = path.join(downloadsDir, `${timestamp}.mp4`);
            
            // Create a Promise for downloading and converting
            const downloadPromise = new Promise((resolve, reject) => {
                let retryCount = 0;
                const maxRetries = 2;
                
                const attemptDownload = () => {
                    try {
                        // Get video info first
                        ytdl.getInfo(video.url).then(info => {
                            // Select the audio format with the highest audio quality
                            const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                            
                            if (audioFormats.length === 0) {
                                return reject(new Error("No audio formats available for this video"));
                            }
                            
                            // Sort by audio quality
                            const format = audioFormats.sort((a, b) => {
                                return parseInt(b.audioBitrate || 0) - parseInt(a.audioBitrate || 0);
                            })[0];
                            
                            // Download stream from YouTube with specific format
                            const stream = ytdl.downloadFromInfo(info, { 
                                quality: format.itag,
                                format: format,
                                requestOptions: {
                                    headers: {
                                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
                                        'Accept': '*/*',
                                        'Accept-Language': 'en-US,en;q=0.9',
                                        'Range': 'bytes=0-',
                                    }
                                }
                            });
                            
                            // Handle stream events
                            stream.on('error', (err) => {
                                console.error(`Error streaming video: ${err.message}`);
                                
                                if (retryCount < maxRetries) {
                                    retryCount++;
                                    console.log(`Retrying download (${retryCount}/${maxRetries})...`);
                                    attemptDownload();
                                } else {
                                    reject(err);
                                }
                            });
                            
                            // Process with ffmpeg
                            ffmpeg(stream)
                                .audioBitrate(256)
                                .save(tempFile)
                                .on('error', (err) => {
                                    console.error(`Error processing audio: ${err.message}`);
                                    reject(err);
                                })
                                .on('end', () => {
                                    try {
                                        // Convert to MP3
                                        fs.renameSync(tempFile, fileName);
                                        resolve(true);
                                    } catch (err) {
                                        reject(err);
                                    }
                                });
                        }).catch(err => {
                            console.error(`Error getting video info: ${err.message}`);
                            
                            if (retryCount < maxRetries) {
                                retryCount++;
                                console.log(`Retrying getInfo (${retryCount}/${maxRetries})...`);
                                setTimeout(attemptDownload, 2000); // Wait 2 seconds before retrying
                            } else {
                                reject(err);
                            }
                        });
                    } catch (error) {
                        reject(error);
                    }
                };
                
                // Start the download attempt
                attemptDownload();
            });
            
            // Wait for download to complete
            await downloadPromise;
            
            // Sanitize filename
            const safeTitle = video.title.replace(/[^\w\s]/gi, '');
            
            // Prepare audio message with thumbnail
            const audioMessage = {
                audio: fs.readFileSync(fileName),
                mimetype: 'audio/mpeg',
                fileName: `${safeTitle}.mp3`,
                ptt: false
            };
            
            // Add the thumbnail if available
            if (video.thumbnail) {
                audioMessage.headerType = 4;
                audioMessage.contextInfo = {
                    externalAdReply: {
                        title: video.title,
                        body: `${video.author.name} • ${video.timestamp}`,
                        mediaType: 1,
                        thumbnailUrl: video.thumbnail,
                        sourceUrl: video.url
                    }
                };
            }
            
            // Send success message
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `${createBanner('✅ DOWNLOAD COMPLETE', 'star')}\n\n` +
                    `*Title:* ${video.title}\n` +
                    `*Artist:* ${video.author.name}\n` +
                    `*Duration:* ${video.timestamp}\n` +
                    `*Size:* ${(fs.statSync(fileName).size / (1024 * 1024)).toFixed(2)} MB\n\n` +
                    `Sending audio file now...`,
                    { headerTitle: '🎵 YOUR SONG IS READY', style: 'fancy' }
                )
            });
            
            // Send the audio
            await sock.sendMessage(sender, audioMessage);
            
            console.log(`✅ Sent song: ${video.title} (${video.author.name}) to ${sender}`);
            
            // Clean up the file after sending
            if (fs.existsSync(fileName)) {
                fs.unlinkSync(fileName);
                console.log(`🧹 Cleaned up file: ${fileName}`);
            }
            
        } catch (error) {
            console.error(`Error processing song:`, error);
            await sock.sendMessage(sender, { 
                text: formatMessage(
                    `An error occurred while processing your song.\n\nError: ${error.message}\n\nPlease try with a different song or try again later.`,
                    { headerTitle: '❌ DOWNLOAD ERROR', style: 'minimal' }
                )
            });
        } finally {
            // Clean up resources
            activeDownloads.delete(sender);
            
            // Clean up temporary files
            try {
                const timestamp = Date.now();
                const fileName = path.join(downloadsDir, `${timestamp}.mp3`);
                const tempFile = path.join(downloadsDir, `${timestamp}.mp4`);
                
                if (fs.existsSync(fileName)) fs.unlinkSync(fileName);
                if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
            } catch (e) {
                console.error(`Error cleaning up files: ${e.message}`);
            }
        }
    } catch (error) {
        console.error(`Error in play command: ${error.message}`);
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
    name: 'play',
    description: 'Download and play MP3 songs from YouTube',
    usage: '.play [song name]',
    execute
}; 