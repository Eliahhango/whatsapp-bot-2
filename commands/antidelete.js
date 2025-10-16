/**
 * Anti-Delete Command
 * This command captures deleted messages and reports them with sender details
 */

// Map to store messages for anti-delete feature
const messageStore = new Map();
const deletedMessageStore = new Map(); // Store for deleted messages
const antiDeleteEnabled = new Map(); // Store per-chat settings

/**
 * Execute the antidelete command
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const execute = async (sock, sender, text, context = {}) => {
    const { isOwner } = context;
    
    // Only the owner can enable/disable this feature
    if (!isOwner) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 ERROR 』✧══❖
║ Only the bot owner can use this command
╚══════════════════❖`
        });
        return;
    }
    
    // Extract command arguments
    const args = text.split(' ').slice(1);
    
    if (!args[0]) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 𝓐𝓷𝓽𝓲𝓓𝓮𝓵𝓮𝓽𝓮 』✧══❖
║
║ Please specify 'on' or 'off' to enable/disable 
║ anti-delete feature.
║
║ Usage: .antidelete on/off [all]
║
║ Options:
║ • on - Enable anti-delete for this chat
║ • off - Disable anti-delete for this chat
║ • all - Apply to all chats (owner only)
║
║ Related commands:
║ • .trash - View stored deleted messages
║ • .trashstats - View trash statistics
║ • .trashtest - Simulate deleted messages (testing)
║
╚══════════════════❖`
        });
        return;
    }
    
    const action = args[0].toLowerCase();
    const isGlobal = args[1]?.toLowerCase() === 'all';
    
    if (action === 'on') {
        if (isGlobal) {
            // Set for all chats
            antiDeleteEnabled.set('global', true);
            await sock.sendMessage(sender, { 
                text: `╔══✧『 𝓐𝓷𝓽𝓲𝓓𝓮𝓵𝓮𝓽𝓮 』✧══❖
║
║ ✅ Anti-delete feature has been enabled
║ for all chats.
║
║ All deleted messages will be forwarded
║ to you.
║
╚══════════════════❖`
            });
        } else {
            // Set for current chat
            antiDeleteEnabled.set(sender, true);
            await sock.sendMessage(sender, { 
                text: `╔══✧『 𝓐𝓷𝓽𝓲𝓓𝓮𝓵𝓮𝓽𝓮 』✧══❖
║
║ ✅ Anti-delete feature has been enabled
║ for this chat.
║
║ Deleted messages will be forwarded to you.
║
╚══════════════════❖`
            });
        }
    } else if (action === 'off') {
        if (isGlobal) {
            // Disable for all chats
            antiDeleteEnabled.clear();
            antiDeleteEnabled.delete('global');
            await sock.sendMessage(sender, { 
                text: `╔══✧『 𝓐𝓷𝓽𝓲𝓓𝓮𝓵𝓮𝓽𝓮 』✧══❖
║
║ ❌ Anti-delete feature has been disabled
║ for all chats.
║
╚══════════════════❖`
            });
        } else {
            // Disable for current chat
            antiDeleteEnabled.delete(sender);
            // Clear stored messages for this chat
            for (const [key, value] of messageStore.entries()) {
                if (value.from === sender) {
                    messageStore.delete(key);
                }
            }
            await sock.sendMessage(sender, { 
                text: `╔══✧『 𝓐𝓷𝓽𝓲𝓓𝓮𝓵𝓮𝓽𝓮 』✧══❖
║
║ ❌ Anti-delete feature has been disabled
║ for this chat.
║
╚══════════════════❖`
            });
        }
    } else {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 ERROR 』✧══❖
║ Invalid option. Please use 'on' or 'off'.
╚══════════════════❖`
        });
    }
};

/**
 * Store a message for the anti-delete feature
 * @param {Object} message - The message to store
 * @param {String} ownerNumber - The owner's number for reporting
 */
const storeMessage = (message, ownerNumber) => {
    try {
        if (!message || !message.key) {
            console.log(`❌ Invalid message object for storage`);
            return;
        }

        const chatId = message.key.remoteJid;
        
        // Skip storing messages in broadcast channels
        if (chatId.endsWith('@broadcast')) {
            console.log(`⏩ Skipping broadcast message`);
            return;
        }
        
        // Skip storing messages that are already marked as ephemeral
        if (message.key.fromMe && message.key.id.startsWith('BAE5')) {
            console.log(`⏩ Skipping ephemeral message`);
            return;
        }
        
        // Try to extract message content safely
        let msgContent = '';
        let mediaInfo = {}; // Store additional media information
        
        if (!message.message) {
            console.log(`⏩ Skipping message with no content`);
            return; // Skip empty messages
        }
        
        // Determine the message type for better handling
        const msgType = Object.keys(message.message)[0];
        console.log(`📨 Processing message of type: ${msgType}`);
        
        // Extract message content and any media info
        if (msgType === 'conversation') {
            msgContent = message.message.conversation;
        } else if (msgType === 'extendedTextMessage') {
            msgContent = message.message.extendedTextMessage?.text || '';
        } else if (msgType === 'imageMessage') {
            msgContent = message.message.imageMessage?.caption || 'Image Message';
            mediaInfo = {
                mimetype: message.message.imageMessage?.mimetype,
                size: message.message.imageMessage?.fileLength,
                width: message.message.imageMessage?.width,
                height: message.message.imageMessage?.height
            };
        } else if (msgType === 'videoMessage') {
            msgContent = message.message.videoMessage?.caption || 'Video Message';
            mediaInfo = {
                mimetype: message.message.videoMessage?.mimetype,
                size: message.message.videoMessage?.fileLength,
                duration: message.message.videoMessage?.seconds
            };
        } else if (msgType === 'audioMessage') {
            msgContent = 'Audio Message';
            mediaInfo = {
                mimetype: message.message.audioMessage?.mimetype,
                size: message.message.audioMessage?.fileLength,
                duration: message.message.audioMessage?.seconds
            };
        } else if (msgType === 'documentMessage') {
            msgContent = message.message.documentMessage?.caption || 'Document Message';
            mediaInfo = {
                mimetype: message.message.documentMessage?.mimetype,
                size: message.message.documentMessage?.fileLength,
                filename: message.message.documentMessage?.fileName || 'Unknown File'
            };
        } else if (msgType === 'stickerMessage') {
            msgContent = 'Sticker Message';
            mediaInfo = {
                mimetype: message.message.stickerMessage?.mimetype,
                isAnimated: message.message.stickerMessage?.isAnimated
            };
        } else {
            msgContent = 'Media Message';
        }
        
        // Only store if anti-delete is enabled globally or for this chat
        if (antiDeleteEnabled.has('global') || antiDeleteEnabled.has(chatId)) {
            // Store full message ID for detailed logging
            const messageId = message.key.id;
            console.log(`📥 Storing message for anti-delete: ${messageId}`);
            
            // Store the sender name if available
            let senderName = 'Unknown';
            if (message.pushName) {
                senderName = message.pushName;
            }
            
            // Determine if the message is from a group and get sender details
            const isGroup = chatId.endsWith('@g.us');
            const actualSender = message.key.participant || message.key.remoteJid;
            
            // Store message with key as the message ID
            messageStore.set(messageId, {
                message: message.message,
                content: msgContent,
                mediaInfo: mediaInfo,
                from: chatId,
                participant: actualSender,
                senderName: senderName,
                type: isGroup ? 'group' : 'private',
                timestamp: new Date().toLocaleString(),
                ownerNumber: ownerNumber,
                messageType: msgType,
                fromMe: message.key.fromMe
            });
            
            // Get current count of stored messages for logging
            const storedCount = messageStore.size;
            console.log(`📊 Total messages in storage: ${storedCount}`);
            
            // Remove message after 1 hour to prevent memory overload
            setTimeout(() => {
                messageStore.delete(messageId);
                console.log(`🕒 Removed message ${messageId} from storage after timeout`);
            }, 60 * 60 * 1000);
        } else {
            console.log(`⏩ Skipping message storage - anti-delete not enabled for this chat`);
        }
    } catch (error) {
        console.error(`❌ Error storing message for anti-delete: ${error.message}`);
    }
};

/**
 * Handle deleted messages
 * @param {Object} sock - WhatsApp socket connection
 * @param {Object} messageKey - The deleted message key
 */
const handleDeletedMessage = async (sock, messageKey) => {
    try {
        // Detailed logging for debugging
        console.log(`🔎 Checking deleted message with key: ${JSON.stringify(messageKey)}`);
        
        // Make sure we have a valid messageKey with an ID
        if (!messageKey || !messageKey.id) {
            console.log(`❌ Invalid message key for deletion: ${JSON.stringify(messageKey)}`);
            return;
        }
        
        // Check if we have the message stored
        if (!messageStore.has(messageKey.id)) {
            console.log(`⚠️ Message with ID ${messageKey.id} not found in store`);
            return; // Message not found in store
        }
        
        const deletedMessage = messageStore.get(messageKey.id);
        console.log(`✅ Found deleted message in store: ${messageKey.id}`);
        
        if (deletedMessage) {
            const isGroup = deletedMessage.type === 'group';
            const sender = deletedMessage.participant;
            const senderName = deletedMessage.senderName || sender.split('@')[0];
            const chatId = deletedMessage.from;
            const ownerNumber = deletedMessage.ownerNumber;
            
            console.log(`📤 Preparing to send anti-delete notification to ${ownerNumber}`);
            
            // Determine if this is a media message
            const msgType = deletedMessage.messageType;
            const isMedia = msgType === 'imageMessage' || 
                           msgType === 'videoMessage' || 
                           msgType === 'audioMessage' || 
                           msgType === 'documentMessage' || 
                           msgType === 'stickerMessage';
            
            // Format message for owner with more details
            let notificationText = `╔══✧『 𝓐𝓷𝓽𝓲𝓓𝓮𝓵𝓮𝓽𝓮 』✧══❖
║
║ ⚠️ *Message Deleted by ${senderName}*
║
║ ✦ 𝚂𝚎𝚗𝚍𝚎𝚛: *${senderName}* (${sender.split('@')[0]})
║ ✦ 𝙲𝚑𝚊𝚝: ${isGroup ? 'Group' : 'Private'}
║ ✦ 𝙲𝚑𝚊𝚝 𝙸𝙳: ${chatId.split('@')[0]}
║ ✦ 𝚃𝚒𝚖𝚎: ${deletedMessage.timestamp}
║ ✦ 𝙲𝚘𝚗𝚝𝚎𝚗𝚝 𝚃𝚢𝚙𝚎: ${isMedia ? '📎 media' : '💬 text'}
║ ✦ 𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝙸𝙳: ${messageKey.id.substring(0, 8)}...
║ 
║ *Original Message:*
║ ${deletedMessage.content}
║
╚══════════════════❖`;

            console.log(`🗑️ Detected deleted message from ${senderName} (${sender.split('@')[0]}) in ${isGroup ? 'group' : 'private'} chat`);
            
            // First make sure we have the owner's number
            if (!ownerNumber || !ownerNumber.includes('@')) {
                console.error(`❌ Invalid owner number: ${ownerNumber}`);
                return;
            }
            
            // Store in deletedMessageStore with a timestamp key for sorting later
            const deleteTimestamp = Date.now();
            const storeKey = `${deleteTimestamp}_${messageKey.id}`;
            deletedMessageStore.set(storeKey, {
                ...deletedMessage,
                deleteTime: new Date().toLocaleString()
            });
            
            console.log(`📥 Added message to deletedMessageStore with key: ${storeKey}`);
            console.log(`📊 Total messages in deletedMessageStore: ${deletedMessageStore.size}`);
            
            // Keep only the last 50 deleted messages
            if (deletedMessageStore.size > 50) {
                // Find the oldest entry and delete it
                let oldestKey = null;
                let oldestTimestamp = Infinity;
                
                for (const key of deletedMessageStore.keys()) {
                    const keyTimestamp = parseInt(key.split('_')[0]);
                    if (keyTimestamp < oldestTimestamp) {
                        oldestTimestamp = keyTimestamp;
                        oldestKey = key;
                    }
                }
                
                if (oldestKey) {
                    deletedMessageStore.delete(oldestKey);
                    console.log(`🗑️ Removed oldest deleted message from trash storage: ${oldestKey}`);
                }
            }
            
            try {
                // Send notification to owner
                const sentMsg = await sock.sendMessage(ownerNumber, {
                    text: notificationText
                });
                
                if (sentMsg) {
                    console.log(`✅ Text notification sent successfully`);
                }
                
                // Check if the message has media, and forward it
                if (isMedia) {
                    console.log(`📸 Deleted message contains media from ${senderName}, attempting to forward it`);
                    
                    // Get media type for clearer error messages
                    let mediaType = '';
                    if (msgType === 'imageMessage') mediaType = 'image';
                    else if (msgType === 'videoMessage') mediaType = 'video';
                    else if (msgType === 'audioMessage') mediaType = 'audio';
                    else if (msgType === 'documentMessage') mediaType = 'document';
                    else if (msgType === 'stickerMessage') mediaType = 'sticker';
                    else mediaType = 'media';

                    // Media caption with sender info
                    let mediaCaption = `⚠️ *Deleted ${msgType.replace('Message', '')} from ${senderName}*`;
                    
                    try {
                        // New approach: First check if media content actually exists
                        // This is more reliable than trying methods that will likely fail
                        let mediaExists = false;
                        let mediaBuffer = null;
                        let mediaObject = null;
                        
                        // Extract the right media object based on type
                        if (msgType === 'imageMessage' && deletedMessage.message.imageMessage) {
                            mediaObject = deletedMessage.message.imageMessage;
                            mediaExists = !!(mediaObject.url || mediaObject.directPath || mediaObject.mimetype);
                        } else if (msgType === 'videoMessage' && deletedMessage.message.videoMessage) {
                            mediaObject = deletedMessage.message.videoMessage;
                            mediaExists = !!(mediaObject.url || mediaObject.directPath || mediaObject.mimetype);
                        } else if (msgType === 'audioMessage' && deletedMessage.message.audioMessage) {
                            mediaObject = deletedMessage.message.audioMessage;
                            mediaExists = !!(mediaObject.url || mediaObject.directPath || mediaObject.mimetype);
                        } else if (msgType === 'documentMessage' && deletedMessage.message.documentMessage) {
                            mediaObject = deletedMessage.message.documentMessage;
                            mediaExists = !!(mediaObject.url || mediaObject.directPath || mediaObject.mimetype);
                        } else if (msgType === 'stickerMessage' && deletedMessage.message.stickerMessage) {
                            mediaObject = deletedMessage.message.stickerMessage;
                            mediaExists = !!(mediaObject.url || mediaObject.directPath || mediaObject.mimetype);
                        }
                        
                        console.log(`🔍 Media check: Type=${mediaType}, Exists=${mediaExists}, Has URL=${!!mediaObject?.url}`);
                        
                        // If we couldn't confirm media exists, use fallback text notification
                        if (!mediaExists || !mediaObject) {
                            console.log(`⚠️ Media content appears to be missing or incomplete for ${mediaType}`);
                            await sock.sendMessage(ownerNumber, {
                                text: `⚠️ *${senderName} deleted a ${mediaType}*\n\nThe media couldn't be recovered fully. ${deletedMessage.content !== `${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} Message` ? `\n\n${deletedMessage.content}` : ''}`
                            });
                            return;
                        }
                        
                        // Simplified media handling based on type
                        switch (mediaType) {
                            case 'image':
                                try {
                                    // First try downloading the media URL directly
                                    // This avoids format detection issues with baileys
                                    if (mediaObject.url) {
                                        await sock.sendMessage(ownerNumber, {
                                            image: { url: mediaObject.url },
                                            caption: mediaCaption,
                                            jpegThumbnail: null // Force null to avoid thumbnail issues
                                        });
                                        console.log(`✅ Successfully sent deleted image via URL`);
                                    } 
                                    // Fallback to sending just info about the image
                                    else {
                                        const imageInfo = deletedMessage.mediaInfo || {};
                                        await sock.sendMessage(ownerNumber, {
                                            text: `⚠️ *${senderName} deleted an image*\n\n${deletedMessage.content !== 'Image Message' ? `Caption: ${deletedMessage.content}\n\n` : ''}${imageInfo.width && imageInfo.height ? `Dimensions: ${imageInfo.width}x${imageInfo.height}` : ''}`
                                        });
                                        console.log(`✅ Sent image info as fallback`);
                                    }
                                } catch (imgError) {
                                    console.error(`❌ Error sending image: ${imgError.message}`);
                                    await sock.sendMessage(ownerNumber, {
                                        text: `⚠️ *${senderName} deleted an image*\n\nThe image couldn't be recovered. ${deletedMessage.content !== 'Image Message' ? `\n\nCaption: ${deletedMessage.content}` : ''}`
                                    });
                                }
                                break;
                                
                            case 'sticker':
                                try {
                                    if (mediaObject.url) {
                                        await sock.sendMessage(ownerNumber, {
                                            sticker: { url: mediaObject.url }
                                        });
                                        console.log(`✅ Successfully sent deleted sticker via URL`);
                                        
                                        // Send attribution in a separate message
                                        await sock.sendMessage(ownerNumber, {
                                            text: `⚠️ The above sticker was deleted by *${senderName}*`
                                        });
                                    } else {
                                        await sock.sendMessage(ownerNumber, {
                                            text: `⚠️ *${senderName} deleted a sticker*\n\nThe sticker couldn't be recovered.`
                                        });
                                    }
                                } catch (stickerError) {
                                    console.error(`❌ Error sending sticker: ${stickerError.message}`);
                                    await sock.sendMessage(ownerNumber, {
                                        text: `⚠️ *${senderName} deleted a sticker*\n\nThe sticker couldn't be recovered.`
                                    });
                                }
                                break;
                                
                            case 'audio':
                                try {
                                    // For audio, we'll always send a text notification first
                                    const audioInfo = deletedMessage.mediaInfo || {};
                                    await sock.sendMessage(ownerNumber, {
                                        text: `⚠️ *${senderName} deleted a voice message*\n\n${audioInfo.duration ? `Duration: ${audioInfo.duration} seconds` : ''}`
                                    });
                                    
                                    // Now try to send the actual audio
                                    if (mediaObject.url) {
                                        // Use ptt: false to avoid voice message processing errors
                                        await sock.sendMessage(ownerNumber, {
                                            audio: { url: mediaObject.url },
                                            mimetype: 'audio/mp4',
                                            ptt: false // Changed to false to prevent processing errors
                                        });
                                        console.log(`✅ Successfully sent deleted audio via URL`);
                                    }
                                } catch (audioError) {
                                    console.error(`❌ Error sending audio: ${audioError.message}`);
                                    await sock.sendMessage(ownerNumber, {
                                        text: `⚠️ *${senderName} deleted a voice message*\n\nThe audio couldn't be recovered.`
                                    });
                                }
                                break;
                                
                            case 'video':
                                try {
                                    if (mediaObject.url) {
                                        await sock.sendMessage(ownerNumber, {
                                            video: { url: mediaObject.url },
                                            caption: mediaCaption,
                                            gifPlayback: false // Ensure it's treated as a regular video
                                        });
                                        console.log(`✅ Successfully sent deleted video via URL`);
                                    } else {
                                        const videoInfo = deletedMessage.mediaInfo || {};
                                        await sock.sendMessage(ownerNumber, {
                                            text: `⚠️ *${senderName} deleted a video*\n\n${deletedMessage.content !== 'Video Message' ? `Caption: ${deletedMessage.content}\n\n` : ''}${videoInfo.duration ? `Duration: ${videoInfo.duration} seconds` : ''}`
                                        });
                                    }
                                } catch (videoError) {
                                    console.error(`❌ Error sending video: ${videoError.message}`);
                                    await sock.sendMessage(ownerNumber, {
                                        text: `⚠️ *${senderName} deleted a video*\n\nThe video couldn't be recovered. ${deletedMessage.content !== 'Video Message' ? `\n\nCaption: ${deletedMessage.content}` : ''}`
                                    });
                                }
                                break;
                                
                            case 'document':
                                try {
                                    const fileName = mediaObject.fileName || 'deleted_file';
                                    await sock.sendMessage(ownerNumber, {
                                        text: `⚠️ *${senderName} deleted a document*\n\nFilename: ${fileName}\n${deletedMessage.content !== 'Document Message' ? `Caption: ${deletedMessage.content}` : ''}`
                                    });
                                    
                                    if (mediaObject.url) {
                                        await sock.sendMessage(ownerNumber, {
                                            document: { url: mediaObject.url },
                                            mimetype: mediaObject.mimetype || 'application/octet-stream',
                                            fileName: fileName
                                        });
                                        console.log(`✅ Successfully sent deleted document via URL`);
                                    }
                                } catch (docError) {
                                    console.error(`❌ Error sending document: ${docError.message}`);
                                    await sock.sendMessage(ownerNumber, {
                                        text: `⚠️ *${senderName} deleted a document*\n\nThe document couldn't be recovered.\nFilename: ${mediaObject.fileName || 'Unknown'}`
                                    });
                                }
                                break;
                                
                            default:
                                // Generic media handling for any other types
                                await sock.sendMessage(ownerNumber, {
                                    text: `⚠️ *${senderName} deleted a media message*\n\nThe content couldn't be recovered.`
                                });
                                break;
                        }
                    } catch (mediaError) {
                        console.error(`❌ General error handling media: ${mediaError.message}`);
                        
                        // Generic fallback for all media types
                        await sock.sendMessage(ownerNumber, {
                            text: `⚠️ *${senderName} deleted a ${mediaType} message*\n\nThe content couldn't be recovered due to an error: ${mediaError.message.substring(0, 50)}`
                        });
                    }
                }
                
                console.log(`✅ Anti-delete notification sent to owner for message from ${senderName}`);
            } catch (error) {
                console.error(`❌ Error sending anti-delete notification: ${error.message}`);
                
                // Try an alternative method to send the notification
                try {
                    await sock.sendMessage(ownerNumber, {
                        text: `Failed to forward the deleted message properly, but here's the content:\n\n${notificationText}`
                    });
                    console.log(`✅ Fallback notification sent successfully`);
                } catch (fallbackError) {
                    console.error(`❌ Even fallback notification failed: ${fallbackError.message}`);
                }
            }

            // Remove from storage
            messageStore.delete(messageKey.id);
            console.log(`🗑️ Removed message ${messageKey.id} from storage after processing`);
        }
    } catch (error) {
        console.error(`❌ Error handling deleted message: ${error.stack}`);
    }
};

/**
 * View trash (stored deleted messages)
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const viewTrash = async (sock, sender, text, context = {}) => {
    const { isOwner } = context;
    
    // Only the owner can view trash
    if (!isOwner) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 ERROR 』✧══❖
║ Only the bot owner can use this command
╚══════════════════❖`
        });
        return;
    }
    
    // Extract filter args if any
    const args = text.split(' ').slice(1);
    const filter = args[0]?.toLowerCase();
    
    if (deletedMessageStore.size === 0) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 𝓣𝓻𝓪𝓼𝓱 』✧══❖
║
║ 🗑️ Trash is empty. No deleted messages
║ have been captured yet.
║
║ Tip: Use *.trashtest* to simulate deleted
║ messages for testing.
║
╚══════════════════❖`
        });
        return;
    }
    
    // Sort deleted messages by timestamp (newest first)
    const sortedMessages = Array.from(deletedMessageStore.entries())
        .sort((a, b) => {
            const timestampA = parseInt(a[0].split('_')[0]);
            const timestampB = parseInt(b[0].split('_')[0]);
            return timestampB - timestampA; // Descending order
        });
    
    // Filter messages if filter is specified
    let filteredMessages = sortedMessages;
    let filterInfo = '';
    
    if (filter === 'text') {
        filteredMessages = sortedMessages.filter(([_, msg]) => 
            msg.messageType === 'conversation' || 
            msg.messageType === 'extendedTextMessage');
        filterInfo = 'Showing text messages only';
    } else if (filter === 'media') {
        filteredMessages = sortedMessages.filter(([_, msg]) => 
            msg.messageType === 'imageMessage' || 
            msg.messageType === 'videoMessage' || 
            msg.messageType === 'audioMessage' ||
            msg.messageType === 'documentMessage' ||
            msg.messageType === 'stickerMessage');
        filterInfo = 'Showing media messages only';
    } else if (filter === 'group') {
        filteredMessages = sortedMessages.filter(([_, msg]) => msg.type === 'group');
        filterInfo = 'Showing group messages only';
    } else if (filter === 'private') {
        filteredMessages = sortedMessages.filter(([_, msg]) => msg.type === 'private');
        filterInfo = 'Showing private messages only';
    }
    
    // Limit to last 10 messages to avoid message too long
    const messagesToShow = filteredMessages.slice(0, 10);
    const totalCount = filteredMessages.length;
    
    // Create the trash view message
    let trashView = `╔══✧『 𝓣𝓻𝓪𝓼𝓱 』✧══❖
║
║ 🗑️ *Deleted Messages*
║ Total: ${totalCount} deleted messages in trash
${filterInfo ? `║ Filter: ${filterInfo}` : ''}
║ Showing: Last ${Math.min(10, totalCount)} messages
║
`;

    if (messagesToShow.length === 0) {
        trashView += `║ No messages match your filter criteria.
║
`;
    } else {
        // Add each message to the view
        messagesToShow.forEach(([key, msg], index) => {
            const messageId = key.split('_')[1];
            const isGroupMsg = msg.type === 'group';
            const sender = msg.participant.split('@')[0];
            const senderName = msg.senderName || sender;
            
            // Determine if this was a media message
            const msgType = msg.messageType;
            const isMedia = msgType === 'imageMessage' || 
                           msgType === 'videoMessage' || 
                           msgType === 'audioMessage' ||
                           msgType === 'documentMessage' ||
                           msgType === 'stickerMessage';
            
            // Create an emoji based on message type
            let typeEmoji = '💬';
            if (msgType === 'imageMessage') typeEmoji = '🖼️';
            else if (msgType === 'videoMessage') typeEmoji = '🎬';
            else if (msgType === 'audioMessage') typeEmoji = '🔊';
            else if (msgType === 'documentMessage') typeEmoji = '📄';
            else if (msgType === 'stickerMessage') typeEmoji = '🎭';
            
            trashView += `╠══✧『 Message ${index + 1} 』✧══❖
║ ✦ 𝚂𝚎𝚗𝚍𝚎𝚛: *${senderName}* (${sender})
║ ✦ 𝙲𝚑𝚊𝚝: ${isGroupMsg ? 'Group' : 'Private'}
║ ✦ 𝚃𝚢𝚙𝚎: ${typeEmoji} ${msgType.replace('Message', '')}
║ ✦ 𝚃𝚒𝚖𝚎: ${msg.deleteTime}
║ ✦ 𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝙸𝙳: ${messageId.substring(0, 8)}...
║
║ ${msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content}
║
`;
        });
    }
    
    trashView += `╠══✧『 Usage 』✧══❖
║ • .trash - View all deleted messages
║ • .trash text - View text messages only
║ • .trash media - View media messages only
║ • .trash group - View group messages only
║ • .trash private - View private messages only
║ • .trashtest - Add test messages to trash
║
╚══════════════════❖`;
    
    await sock.sendMessage(sender, { text: trashView });
};

/**
 * View trash statistics
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const trashStats = async (sock, sender, text, context = {}) => {
    const { isOwner } = context;
    
    // Only the owner can view trash stats
    if (!isOwner) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 ERROR 』✧══❖
║ Only the bot owner can use this command
╚══════════════════❖`
        });
        return;
    }
    
    // Count stats
    const totalStored = messageStore.size;
    const totalDeleted = deletedMessageStore.size;
    
    // Count by type
    let textCount = 0;
    let imageCount = 0;
    let videoCount = 0;
    let audioCount = 0;
    let documentCount = 0;
    let stickerCount = 0;
    let otherCount = 0;
    
    // Count by chat type
    let groupCount = 0;
    let privateCount = 0;
    
    // Top senders (map of sender ID to count)
    const senderCounts = new Map();
    const senderNames = new Map(); // Store sender names for display
    
    // Process deleted messages
    for (const [_, msg] of deletedMessageStore.entries()) {
        // Count by chat type
        if (msg.type === 'group') {
            groupCount++;
        } else {
            privateCount++;
        }
        
        // Count by message type
        if (msg.messageType === 'conversation' || msg.messageType === 'extendedTextMessage') {
            textCount++;
        } else if (msg.messageType === 'imageMessage') {
            imageCount++;
        } else if (msg.messageType === 'videoMessage') {
            videoCount++;
        } else if (msg.messageType === 'audioMessage') {
            audioCount++;
        } else if (msg.messageType === 'documentMessage') {
            documentCount++;
        } else if (msg.messageType === 'stickerMessage') {
            stickerCount++;
        } else {
            otherCount++;
        }
        
        // Track sender statistics
        const senderId = msg.participant.split('@')[0];
        senderCounts.set(senderId, (senderCounts.get(senderId) || 0) + 1);
        
        // Store sender name if available
        if (msg.senderName && !senderNames.has(senderId)) {
            senderNames.set(senderId, msg.senderName);
        }
    }
    
    // Get top 3 senders
    const topSenders = Array.from(senderCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
    
    // Count unique senders and chats
    const uniqueSenders = new Set();
    const uniqueChats = new Set();
    
    for (const [_, msg] of deletedMessageStore.entries()) {
        uniqueSenders.add(msg.participant);
        uniqueChats.add(msg.from);
    }
    
    // Create the stats message
    const statsMessage = `╔══✧『 𝓣𝓻𝓪𝓼𝓱 𝓢𝓽𝓪𝓽𝓲𝓼𝓽𝓲𝓬𝓼 』✧══❖
║
║ 📊 *Anti-Delete Monitor*
║
╔══✧『 STORAGE INFO 』✧══❖
║ ✦ 𝙲𝚞𝚛𝚛𝚎𝚗𝚝𝚕𝚢 𝚂𝚝𝚘𝚛𝚎𝚍: ${totalStored} messages
║ ✦ 𝚂𝚝𝚘𝚛𝚊𝚐𝚎 𝙻𝚒𝚖𝚒𝚝: 50 deleted messages
║ ✦ 𝙼𝚎𝚜𝚜𝚊𝚐𝚎 𝚁𝚎𝚝𝚎𝚗𝚝𝚒𝚘𝚗: 1 hour
╚══════════════════❖

╔══✧『 DELETED MESSAGES 』✧══❖
║ ✦ 𝚃𝚘𝚝𝚊𝚕 𝙳𝚎𝚕𝚎𝚝𝚎𝚍: ${totalDeleted} messages
║ ✦ 💬 𝚃𝚎𝚡𝚝 𝙼𝚎𝚜𝚜𝚊𝚐𝚎𝚜: ${textCount}
║ ✦ 🖼️ 𝙸𝚖𝚊𝚐𝚎𝚜: ${imageCount}
║ ✦ 🎬 𝚅𝚒𝚍𝚎𝚘𝚜: ${videoCount}
║ ✦ 🔊 𝙰𝚞𝚍𝚒𝚘 𝙼𝚎𝚜𝚜𝚊𝚐𝚎𝚜: ${audioCount}
║ ✦ 📄 𝙳𝚘𝚌𝚞𝚖𝚎𝚗𝚝𝚜: ${documentCount}
║ ✦ 🎭 𝚂𝚝𝚒𝚌𝚔𝚎𝚛𝚜: ${stickerCount}
║ ✦ ❓ 𝙾𝚝𝚑𝚎𝚛 𝚃𝚢𝚙𝚎𝚜: ${otherCount}
╚══════════════════❖

╔══✧『 SOURCE STATS 』✧══❖
║ ✦ 👥 𝙶𝚛𝚘𝚞𝚙 𝙼𝚎𝚜𝚜𝚊𝚐𝚎𝚜: ${groupCount}
║ ✦ 👤 𝙿𝚛𝚒𝚟𝚊𝚝𝚎 𝙼𝚎𝚜𝚜𝚊𝚐𝚎𝚜: ${privateCount}
║ ✦ 🧑‍🤝‍🧑 𝚄𝚗𝚒𝚚𝚞𝚎 𝚂𝚎𝚗𝚍𝚎𝚛𝚜: ${uniqueSenders.size}
║ ✦ 💬 𝚄𝚗𝚒𝚚𝚞𝚎 𝙲𝚑𝚊𝚝𝚜: ${uniqueChats.size}
${topSenders.length > 0 ? `║
║ *Top Message Deleters:*
${topSenders.map((entry, i) => `║ ${i+1}. ${senderNames.get(entry[0]) || entry[0]} (${entry[1]} msgs)`).join('\n')}` : ''}
╚══════════════════❖

╔══✧『 COMMANDS 』✧══❖
║ • .trash - View deleted messages
║ • .trashstats - View these statistics
║ • .antidelete on/off - Enable/disable monitoring
║ • .trashtest - Test by simulating deletions
╚══════════════════❖`;

    await sock.sendMessage(sender, { text: statsMessage });
};

/**
 * Check if a command is a trash-related command and execute it
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 * @returns {Boolean} - True if it was a trash command, false otherwise
 */
const processTrashCommands = async (sock, sender, text, context = {}) => {
    // Extract command name without the prefix
    const commandName = text.split(' ')[0].slice(1).toLowerCase();
    
    console.log(`Processing potential trash command: ${commandName}`);
    
    if (commandName === 'trash') {
        console.log(`Executing trash command...`);
        await viewTrash(sock, sender, text, context);
        return true;
    } else if (commandName === 'trashstats') {
        console.log(`Executing trashstats command...`);
        await trashStats(sock, sender, text, context);
        return true;
    } else if (commandName === 'trashtest') {
        console.log(`Executing trashtest command...`);
        await generateTestData(sock, sender, context);
        return true;
    }
    
    return false;
};

/**
 * Generate test data for trash feature by simulating deleted messages
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {Object} context - Additional context
 */
const generateTestData = async (sock, sender, context = {}) => {
    const { isOwner } = context;
    
    // Only the owner can use this test feature
    if (!isOwner) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 ERROR 』✧══❖
║ Only the bot owner can use this command
╚══════════════════❖`
        });
        return;
    }
    
    console.log(`Executing trashtest command. Current messageStore size: ${messageStore.size}`);
    
    if (messageStore.size === 0) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 𝓣𝓻𝓪𝓼𝓱 𝓣𝓮𝓼𝓽 』✧══❖
║
║ ⚠️ No messages in storage to simulate
║ deletion. Send some messages first
║ with anti-delete enabled.
║
╚══════════════════❖`
        });
        return;
    }
    
    // Take some messages from messageStore and move them to deletedMessageStore
    const messagesToSimulate = Math.min(messageStore.size, 5); // Simulate up to 5 deleted messages
    let simulatedCount = 0;
    
    console.log(`🧪 Simulating ${messagesToSimulate} deleted messages for testing`);
    
    // Convert messageStore entries to array to work with them
    const messages = Array.from(messageStore.entries());
    
    // Dump some information for debugging
    console.log(`Available messages for testing:`);
    messages.forEach(([id, msg], idx) => {
        console.log(`Message ${idx+1}: ID=${id}, Chat=${msg.from}, Content=${msg.content.substring(0, 30)}...`);
    });
    
    for (let i = 0; i < messagesToSimulate; i++) {
        const [messageId, message] = messages[i];
        
        // Skip if already in deletedMessageStore
        const existingKeys = Array.from(deletedMessageStore.keys())
            .filter(key => key.includes(messageId));
        
        if (existingKeys.length > 0) {
            console.log(`Message ${messageId} already in deleted store, skipping`);
            continue;
        }
        
        // Store in deletedMessageStore with a timestamp key for sorting
        const deleteTimestamp = Date.now() - (i * 60000); // Different timestamps for sorting
        const storeKey = `${deleteTimestamp}_${messageId}`;
        
        deletedMessageStore.set(storeKey, {
            ...message,
            deleteTime: new Date(deleteTimestamp).toLocaleString()
        });
        
        console.log(`🧪 Simulated deletion of message ${messageId} with store key ${storeKey}`);
        simulatedCount++;
    }
    
    console.log(`Total deletedMessageStore size after simulation: ${deletedMessageStore.size}`);
    
    // Dump some information for debugging
    if (deletedMessageStore.size > 0) {
        console.log(`Deleted message store contents:`);
        Array.from(deletedMessageStore.entries()).forEach(([key, msg], idx) => {
            console.log(`Deleted message ${idx+1}: Key=${key}, Chat=${msg.from}, Content=${msg.content.substring(0, 30)}...`);
        });
    }
    
    // Response to user
    await sock.sendMessage(sender, { 
        text: `╔══✧『 𝓣𝓻𝓪𝓼𝓱 𝓣𝓮𝓼𝓽 』✧══❖
║
║ ✅ Successfully simulated ${simulatedCount} deleted messages
║ for testing purposes.
║
║ Total messages now in trash: ${deletedMessageStore.size}
║
║ You can now use .trash to view them
║ or .trashstats to see updated statistics.
║
╚══════════════════❖`
    });
};

module.exports = {
    name: 'antidelete',
    description: 'Enable or disable anti-delete feature',
    usage: '.antidelete [on/off] [all]',
    execute,
    storeMessage,
    handleDeletedMessage,
    processTrashCommands
}; 