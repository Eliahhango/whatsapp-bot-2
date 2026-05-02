/**
 * Gemini AI Command
 * Integrates Google's Gemini AI for intelligent responses
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { formatMessage, createBanner } = require('../utils');
const config = require('../config');

// Gemini API configuration
const API_KEY = config.geminiApiKey;
const MODEL_NAME = 'gemini-2.0-flash'; // Using the free tier model

// Safety settings to ensure appropriate responses
const safetySettings = [
  {
    category: 'HARM_CATEGORY_HARASSMENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_HATE_SPEECH',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
  {
    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
    threshold: 'BLOCK_MEDIUM_AND_ABOVE',
  },
];

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ 
  model: MODEL_NAME,
  safetySettings,
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 2048, // Limiting output size for free tier
  }
});

// Track user request history (for rate limiting)
const userRequests = new Map();
const RATE_LIMIT = 10; // Lower max requests for free tier
const OWNER_RATE_LIMIT = 50; // Lower owner limit for free tier
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

// System prompt for consistent assistant behavior
let systemPrompt = "You are a helpful, friendly AI assistant integrated into a WhatsApp bot called 'SirTheProgrammer Bot'. Your responses should be clear, informative, and conversational. When asked about coding, provide well-structured, commented examples when appropriate. Always be respectful and avoid controversial topics. Keep responses concise but comprehensive, formatting them for optimal readability on mobile devices.";

/**
 * Generate a response using Gemini AI
 * @param {string} prompt - The user's prompt
 * @param {boolean} isOwner - Whether the requester is the bot owner
 * @returns {Promise<string>} - The AI-generated response
 */
async function generateResponse(prompt, isOwner = false) {
  try {
    // For owners, include the system prompt for better control
    const fullPrompt = isOwner 
      ? prompt 
      : `${systemPrompt}\n\nUser question: ${prompt}`;
      
    // Make sure prompt isn't too long for free tier
    const trimmedPrompt = fullPrompt.length > 4000 
      ? fullPrompt.substring(0, 4000) + "..." 
      : fullPrompt;
    
    // Add retry logic for API stability
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        // Generate content with Gemini with timeout
        const timeout = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timed out after 30 seconds')), 30000)
        );
        
        const responsePromise = model.generateContent(trimmedPrompt);
        
        // Race between timeout and actual response
        const result = await Promise.race([responsePromise, timeout]);
        const response = result.response;
        return response.text();
      } catch (error) {
        attempts++;
        lastError = error;
        
        // Specific handling for quota issues - no retry
        if (error.message.includes('quota') || error.message.includes('limit')) {
          throw new Error(`Free Gemini API quota exceeded. Please try again later.`);
        }
        
        // Network-related errors should retry
        if (error.message.includes('network') || 
            error.message.includes('timeout') || 
            error.message.includes('connection')) {
          console.log(`Gemini API connection issue, retry attempt ${attempts}/${maxAttempts}`);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          continue;
        }
        
        // Other errors just throw immediately
        throw error;
      }
    }
    
    // If we exhausted all attempts
    throw lastError || new Error('Failed to generate response after multiple attempts');
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    
    // More detailed error messages
    if (error.message.includes('quota') || error.message.includes('limit')) {
      throw new Error(`Free Gemini API quota exceeded. Please try again later.`);
    } else if (error.message.includes('network') || 
               error.message.includes('timeout') || 
               error.message.includes('connection')) {
      throw new Error(`Connection issue with Gemini API. Please check your internet connection and try again.`);
    }
    
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

/**
 * Check if user has exceeded rate limit
 * @param {string} userId - The user's ID
 * @param {boolean} isOwner - Whether the user is the bot owner
 * @returns {boolean} - Whether the user is rate limited
 */
function isRateLimited(userId, isOwner = false) {
  const now = Date.now();
  const limit = isOwner ? OWNER_RATE_LIMIT : RATE_LIMIT;
  
  if (!userRequests.has(userId)) {
    userRequests.set(userId, []);
  }
  
  // Get user's request timestamps
  const requests = userRequests.get(userId);
  
  // Filter requests to only include those within the rate window
  const recentRequests = requests.filter(timestamp => now - timestamp < RATE_WINDOW);
  userRequests.set(userId, recentRequests);
  
  // Check if user has exceeded the rate limit
  return recentRequests.length >= limit;
}

/**
 * Record a user request for rate limiting
 * @param {string} userId - The user's ID
 */
function recordRequest(userId) {
  if (!userRequests.has(userId)) {
    userRequests.set(userId, []);
  }
  
  const requests = userRequests.get(userId);
  requests.push(Date.now());
  userRequests.set(userId, requests);
}

/**
 * Reset rate limit for a specific user
 * @param {string} userId - The user's ID to reset
 * @returns {boolean} - Whether the reset was successful
 */
function resetUserRateLimit(userId) {
  if (userRequests.has(userId)) {
    userRequests.set(userId, []);
    return true;
  }
  return false;
}

/**
 * Get rate limit statistics
 * @returns {Object} - Statistics about rate limiting
 */
function getRateLimitStats() {
  const stats = {
    totalUsers: userRequests.size,
    userDetails: []
  };
  
  const now = Date.now();
  
  userRequests.forEach((timestamps, userId) => {
    const recentRequests = timestamps.filter(timestamp => now - timestamp < RATE_WINDOW);
    
    if (recentRequests.length > 0) {
      stats.userDetails.push({
        userId: userId.split('@')[0],
        requests: recentRequests.length,
        remainingRequests: RATE_LIMIT - recentRequests.length,
        windowResetIn: Math.ceil((RATE_WINDOW - (now - recentRequests[0])) / (60 * 1000)) + ' minutes'
      });
    }
  });
  
  return stats;
}

/**
 * Update the system prompt
 * @param {string} newPrompt - The new system prompt
 */
function updateSystemPrompt(newPrompt) {
  systemPrompt = newPrompt;
  return true;
}

/**
 * Execute the Gemini command
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID
 * @param {String} text - Full message text
 * @param {Object} context - Additional context
 */
const execute = async (sock, sender, text, context = {}) => {
  const isOwner = context.isOwner || false;
  
  // Extract the arguments from the message
  const args = text.slice(8).trim().split(' '); // Remove '.gemini ' from the text
  
  // Handle owner admin commands
  if (isOwner && args[0] === 'admin') {
    const adminCmd = args[1]?.toLowerCase();
    
    // Reset someone's rate limit
    if (adminCmd === 'reset' && args[2]) {
      const targetUser = args[2].includes('@') ? args[2] : `${args[2]}@s.whatsapp.net`;
      const success = resetUserRateLimit(targetUser);
      await sock.sendMessage(sender, {
        text: formatMessage(
          success 
            ? `✅ Successfully reset rate limit for user ${args[2]}.`
            : `❌ User ${args[2]} not found in rate limit tracker.`,
          { headerTitle: '👑 ADMIN ACTION', style: 'double' }
        )
      });
      return;
    }
    
    // View rate limit statistics
    if (adminCmd === 'stats') {
      const stats = getRateLimitStats();
      let statsText = `${createBanner('📊 RATE LIMIT STATISTICS', 'thick')}\n\n`;
      statsText += `Total tracked users: ${stats.totalUsers}\n\n`;
      
      if (stats.userDetails.length > 0) {
        statsText += `${createBanner('👤 USER DETAILS', 'dotted')}\n\n`;
        stats.userDetails.forEach(user => {
          statsText += `• *User:* ${user.userId}\n`;
          statsText += `  *Requests:* ${user.requests}/${RATE_LIMIT}\n`;
          statsText += `  *Remaining:* ${user.remainingRequests}\n`;
          statsText += `  *Resets in:* ${user.windowResetIn}\n\n`;
        });
      } else {
        statsText += `No active users in the current window.`;
      }
      
      statsText += `\n${createBanner('📝 FREE TIER NOTES', 'dotted')}\n\n`;
      statsText += `• Using free model: ${MODEL_NAME}\n`;
      statsText += `• User rate limit: ${RATE_LIMIT}/hour\n`;
      statsText += `• Owner rate limit: ${OWNER_RATE_LIMIT}/hour\n`;
      
      await sock.sendMessage(sender, {
        text: formatMessage(statsText, { 
          headerTitle: '👑 ADMIN STATISTICS', 
          style: 'double' 
        })
      });
      return;
    }
    
    // Update system prompt
    if (adminCmd === 'systemprompt' && args.slice(2).join(' ').length > 0) {
      const newPrompt = args.slice(2).join(' ');
      updateSystemPrompt(newPrompt);
      await sock.sendMessage(sender, {
        text: formatMessage(
          `✅ System prompt updated successfully.\n\nNew prompt:\n"${systemPrompt.substring(0, 200)}${systemPrompt.length > 200 ? '...' : ''}"`,
          { headerTitle: '👑 SYSTEM PROMPT UPDATED', style: 'double' }
        )
      });
      return;
    }
    
    // View current system prompt
    if (adminCmd === 'viewprompt') {
      await sock.sendMessage(sender, {
        text: formatMessage(
          `${createBanner('🔮 CURRENT SYSTEM PROMPT', 'thick')}\n\n${systemPrompt}`,
          { headerTitle: '👑 SYSTEM CONFIGURATION', style: 'double' }
        )
      });
      return;
    }
    
    // Reset all rate limits
    if (adminCmd === 'resetall') {
      userRequests.clear();
      await sock.sendMessage(sender, {
        text: formatMessage(
          `✅ Successfully reset rate limits for all users.`,
          { headerTitle: '👑 ADMIN ACTION', style: 'double' }
        )
      });
      return;
    }
    
    // Admin help menu
    await sock.sendMessage(sender, {
      text: formatMessage(
        `${createBanner('👑 GEMINI ADMIN COMMANDS', 'star')}\n\n` +
        `As the bot owner, you have access to special Gemini administration commands:\n\n` +
        `• *.gemini admin reset [user]* - Reset rate limit for a specific user\n` +
        `• *.gemini admin resetall* - Reset rate limits for all users\n` +
        `• *.gemini admin stats* - View rate limit statistics\n` +
        `• *.gemini admin viewprompt* - View current system prompt\n` +
        `• *.gemini admin systemprompt [text]* - Update the system prompt\n\n` +
        `*Note:* You're using Gemini's free tier with model: ${MODEL_NAME}. Rate limits are set to ${RATE_LIMIT} per user and ${OWNER_RATE_LIMIT} for owner.`,
        { headerTitle: '👑 ADMIN HELP', style: 'double' }
      )
    });
    return;
  }
  
  // Handle regular command (no prompt provided)
  const prompt = text.slice(8).trim();
  if (!prompt) {
    await sock.sendMessage(sender, {
      text: formatMessage(
        `${createBanner('❓ HOW TO USE GEMINI AI', 'star')}\n\n` +
        `To ask Gemini AI a question, use the following format:\n\n` +
        `*.gemini [your question or prompt]*\n\n` +
        `Examples:\n` +
        `• *.gemini Tell me about Tanzania*\n` +
        `• *.gemini How to make chapati?*\n` +
        `• *.gemini Write a short poem about friendship*\n\n` +
        `*Note:* This bot uses Gemini's free tier with limited requests (${RATE_LIMIT}/hour/user).\n\n` +
        `${isOwner ? '👑 As the bot owner, you also have access to admin commands. Type *.gemini admin* for details.\n\n' : ''}` +
        `The AI will process your query and provide an intelligent response based on its knowledge.`,
        { headerTitle: '🤖 GEMINI AI HELP', style: 'fancy' }
      )
    });
    return;
  }
  
  // Check prompt length for free tier
  if (prompt.length > 4000) {
    await sock.sendMessage(sender, {
      text: formatMessage(
        `Your prompt is too long (${prompt.length} characters). The free Gemini model has a limit of 4000 characters.\n\nPlease try with a shorter prompt.`,
        { headerTitle: '⚠️ PROMPT TOO LONG', style: 'minimal' }
      )
    });
    return;
  }
  
  // Check for rate limiting (except for owner)
  if (!isOwner && isRateLimited(sender)) {
    await sock.sendMessage(sender, {
      text: formatMessage(
        `You have reached the maximum number of Gemini requests (${RATE_LIMIT} per hour).\n\nPlease try again later. This limit is in place because we're using the free tier of Gemini AI.`,
        { headerTitle: '⚠️ RATE LIMIT REACHED', style: 'minimal' }
      )
    });
    return;
  }
  
  // Send typing indicator
  await sock.sendPresenceUpdate('composing', sender);
  
  // Send initial processing message
  const processingMsg = await sock.sendMessage(sender, {
    text: formatMessage('🧠 Processing your request with Gemini AI...')
  });
  
  try {
    // Send a more explicit waiting message if it's a longer prompt
    if (prompt.length > 1000) {
      await sock.sendMessage(sender, {
        text: formatMessage('This is a longer request, it might take a bit more time to process. Please be patient...')
      });
    }
    
    // Generate the response with timeout handling
    const aiResponse = await generateResponse(prompt, isOwner);
    
    // Record this request for rate limiting (if not owner)
    if (!isOwner) {
      recordRequest(sender);
    }
    
    // Format and send the response
    const responseText = 
      `${createBanner('🔮 YOUR QUESTION', 'dotted')}\n\n` +
      `${prompt}\n\n` +
      `${createBanner('🤖 GEMINI\'S RESPONSE', 'star')}\n\n` +
      `${aiResponse}`;
      
    await sock.sendMessage(sender, {
      text: formatMessage(responseText, {
        headerTitle: '🧠 GEMINI AI RESPONSE 🧠',
        style: 'fancy'
      })
    });
    
    // For owner, include usage info
    if (isOwner) {
      const ownerRequests = userRequests.get(sender) || [];
      const recentOwnerRequests = ownerRequests.filter(timestamp => Date.now() - timestamp < RATE_WINDOW);
      await sock.sendMessage(sender, {
        text: formatMessage(
          `👑 *Owner Usage Info*\n\n` +
          `• Requests this hour: ${recentOwnerRequests.length}/${OWNER_RATE_LIMIT}\n` +
          `• Character count: ${prompt.length} → ${aiResponse.length}\n` +
          `• Response ratio: ${(aiResponse.length / Math.max(prompt.length, 1)).toFixed(2)}x\n` +
          `• Model: ${MODEL_NAME} (Free tier)`,
          { headerTitle: '📊 USAGE STATISTICS', style: 'minimal' }
        )
      });
    }
    
  } catch (error) {
    console.error('Error in Gemini command:', error);
    
    // More detailed error messages based on error type
    let errorMessage = 'Sorry, I encountered an error while processing your request:';
    
    if (error.message.includes('timeout')) {
      errorMessage = `${errorMessage}\n\nThe request timed out. This could be due to:
1. Poor internet connection
2. Gemini API server issues
3. Complex prompt requiring too much processing time

Please try again with a simpler prompt or check your internet connection.`;
    } else if (error.message.includes('network') || error.message.includes('connection')) {
      errorMessage = `${errorMessage}\n\nA network error occurred. Please check your internet connection and verify that the API key is correct and valid.`;
    } else if (error.message.includes('quota') || error.message.includes('limit')) {
      errorMessage = `${errorMessage}\n\nYou've reached the free tier usage limits for Gemini AI. Please try again later.`;
    } else {
      errorMessage = `${errorMessage}\n\n${error.message}\n\nPlease try again with a different prompt. Note that the free Gemini tier has limitations on usage and content.`;
    }
    
    // Send error message
    await sock.sendMessage(sender, {
      text: formatMessage(
        errorMessage,
        { headerTitle: '❌ GEMINI ERROR', style: 'minimal' }
      )
    });
  }
};

module.exports = {
  name: 'gemini',
  description: 'Ask Google\'s Gemini AI for intelligent responses',
  usage: '.gemini [your question]',
  execute
}; 