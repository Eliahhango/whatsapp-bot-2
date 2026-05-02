/**
 * Admin Panel Server for WhatsApp Bot
 * Provides a web interface to manage the bot
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');
const botState = require('./utils/botState');
const socketManager = require('./utils/socketManager');
const configManager = require('./utils/configManager');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Logging

// Session setup
app.use(session({
    secret: 'sirtheprogrammer-bot-admin-secret', // Change this in production
    resave: false,
    saveUninitialized: false,
    rolling: true, // Refresh session with each request
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Add a middleware to check session expiry
app.use((req, res, next) => {
    if (req.session && req.session.authenticated) {
        // Refresh session if it's close to expiring
        if (req.session.cookie.maxAge < 60 * 60 * 1000) { // Less than 1 hour left
            req.session.touch();
            botState.log('info', 'Admin session refreshed');
        }
    }
    next();
});

// Serve static files from the admin directory
app.use(express.static(path.join(__dirname, 'admin')));

// Authentication middleware for API routes
const authenticateAPI = (req, res, next) => {
    // Check if already authenticated via session
    if (req.session && req.session.authenticated) {
        return next();
    }
    
    // Check if username/password provided in query parameters or headers
    const username = req.query.username || req.headers['x-username'];
    const password = req.query.password || req.headers['x-password'];
    
    // If credentials provided, validate them
    if (username === 'sirtheprogrammer' && password === 'admin') {
        // Set session as authenticated for future requests
        req.session.authenticated = true;
        req.session.username = username;
        console.log(`API authenticated via query params: ${username}`);
        return next();
    }
    
    // If a token is provided in query params (for WebSocket authentication)
    const token = req.query.token;
    if (token === 'true') {
        // For development/testing only - use with caution in production
        req.session.authenticated = true;
        req.session.username = 'sirtheprogrammer';
        console.log('API authenticated via token param');
        return next();
    }
    
    // Not authenticated
    console.log('API authentication failed');
    res.status(401).json({ error: 'Unauthorized' });
};

// Basic authentication
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Hardcoded credentials (in a real app, this would use a more secure method)
    if (username === 'sirtheprogrammer' && password === 'admin') {
        req.session.authenticated = true;
        botState.log('info', `Admin login successful: ${username}`);
        return res.json({ success: true });
    }
    
    botState.log('warning', `Failed login attempt: ${username}`);
    res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/api/logout', (req, res) => {
    if (req.session.authenticated) {
        botState.log('info', 'Admin logged out');
    }
    req.session.destroy();
    res.json({ success: true });
});

// API routes - protected by authentication middleware
app.get('/api/status', authenticateAPI, (req, res) => {
    // Return actual status from botState
    const stats = botState.getStats();
    res.json({
        online: stats.status === 'connected',
        uptime: stats.uptime,
        messagesHandled: stats.messagesHandled,
        commandsExecuted: stats.commandsExecuted,
        memoryUsage: stats.memory,
        version: '1.0.0',
        connectedNumber: botState.state.user ? botState.state.user.id : 'Not connected'
    });
});

// Get logs API
app.get('/api/logs', authenticateAPI, (req, res) => {
    const { date, count = 100, level } = req.query;
    
    let logs;
    if (date) {
        logs = botState.readLogs(date, count, level);
    } else {
        logs = botState.getLogs(count, level);
    }
    
    res.json(logs);
});

// Get available log dates
app.get('/api/logs/dates', authenticateAPI, (req, res) => {
    const dates = botState.getAvailableLogDates();
    res.json(dates);
});

// Get config API
app.get('/api/config', authenticateAPI, (req, res) => {
    try {
        const config = configManager.getConfig();
        res.json(config);
    } catch (error) {
        console.error('Error reading config:', error);
        res.status(500).json({ error: 'Failed to get config' });
    }
});

// Update config API
app.post('/api/config', authenticateAPI, (req, res) => {
    const newConfig = req.body;
    
    try {
        configManager.updateConfig(newConfig);
        botState.log('info', 'Configuration updated from admin panel');
        res.json({ success: true, message: 'Config updated successfully' });
    } catch (error) {
        console.error('Error updating config:', error);
        res.status(500).json({ error: 'Failed to update config' });
    }
});

// Bot control APIs
app.post('/api/bot/restart', authenticateAPI, (req, res) => {
    botState.log('info', 'Bot restart requested from admin panel');
    
    // Emit the restart event for the socket manager to handle
    socketManager.emit('restart-bot');
    
    res.json({ success: true, message: 'Bot restart initiated' });
});

app.post('/api/bot/refresh-qr', authenticateAPI, (req, res) => {
    botState.log('info', 'QR code refresh requested from admin panel');
    
    // Emit the refresh QR event for the socket manager to handle
    socketManager.emit('refresh-qr');
    
    // If we have a QR code already in the state, return it
    if (botState.state.qrCode) {
        return res.json({ 
            success: true, 
            message: 'Using existing QR code', 
            qrCode: botState.state.qrCode 
        });
    }
    
    // Otherwise, indicate that a refresh has been requested
    res.json({ 
        success: true, 
        message: 'QR code refresh requested. Please wait for the WebSocket update.'
    });
});

// Send message API
app.post('/api/bot/send-message', authenticateAPI, (req, res) => {
    const { to, message, type = 'text' } = req.body;
    
    if (!to || !message) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    botState.log('info', `Message send requested from admin panel to ${to}`);
    
    // Emit the send message event for the socket manager to handle
    socketManager.emit('send-message', { to, message, type });
    
    res.json({ success: true, message: 'Message send initiated' });
});

// Deleted messages API
app.get('/api/bot/deleted-messages', authenticateAPI, (req, res) => {
    res.json(botState.state.deletedMessages);
});

// Main route - serve the admin panel
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin', 'login.html'));
});

// Diagnostic endpoint to check API connectivity
app.get('/api/diagnostic', (req, res) => {
    console.log('Diagnostic endpoint accessed');
    
    // Check authentication
    if (!req.session || !req.session.authenticated) {
        console.log('Auth failed in diagnostic endpoint');
        return res.status(401).json({ 
            success: false, 
            error: 'Authentication required',
            authStatus: 'Failed (401 Unauthorized)',
            sessionInfo: {
                exists: !!req.session,
                authenticated: req.session?.authenticated || false
            }
        });
    }
    
    // If we get here, auth is successful
    console.log('Auth successful in diagnostic endpoint');
    
    try {
        // Return diagnostic information
        res.json({
            success: true,
            server: {
                version: '1.0.0',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                environment: process.env.NODE_ENV || 'development',
                nodeVersion: process.version
            },
            apiStatus: 'Connected (200 OK)',
            authStatus: 'Successful',
            socketStatus: socketManager?.getStatus() || { 
                connected: false, 
                clients: 0,
                message: 'Socket manager not initialized'
            },
            sessionInfo: {
                exists: true,
                authenticated: true,
                username: req.session.username,
                role: req.session.role || 'admin'
            }
        });
    } catch (error) {
        console.error('Error in diagnostic endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Server error during diagnostics',
            message: error.message
        });
    }
});

// Alternative stats endpoints that the client might try to access
app.get('/api/stats', authenticateAPI, (req, res) => {
    // Redirect to our main stats endpoint
    const stats = botState.getStats();
    res.json({
        online: stats.status === 'connected',
        uptime: stats.uptime,
        messagesHandled: stats.messagesHandled,
        commandsExecuted: stats.commandsExecuted,
        memoryUsage: stats.memory,
        version: '1.0.0',
        connectedNumber: botState.state.user ? botState.state.user.id : 'Not connected'
    });
});

app.get('/api/bot/status', authenticateAPI, (req, res) => {
    // Alternative bot status endpoint
    const stats = botState.getStats();
    res.json({
        online: stats.status === 'connected',
        uptime: stats.uptime,
        messagesHandled: stats.messagesHandled,
        commandsExecuted: stats.commandsExecuted,
        memoryUsage: stats.memory,
        version: '1.0.0',
        connectedNumber: botState.state.user ? botState.state.user.id : 'Not connected'
    });
});

app.get('/api/whatsapp/status', authenticateAPI, (req, res) => {
    // Alternative WhatsApp status endpoint
    const stats = botState.getStats();
    res.json({
        status: stats.status,
        uptime: stats.uptime,
        qrCode: botState.state.qrCode || null,
        connection: {
            state: stats.status,
            lastDisconnect: botState.state.lastDisconnect || null
        },
        userInfo: botState.state.user || null
    });
});

// Process bot commands API for the command tab
app.post('/api/bot/command', authenticateAPI, (req, res) => {
    const { command, args = [] } = req.body;
    
    if (!command) {
        return res.status(400).json({ error: 'Missing command parameter' });
    }
    
    console.log(`Command requested from admin panel: ${command} ${args.join(' ')}`);
    botState.log('info', `Command executed from admin panel: ${command} ${args.join(' ')}`);
    
    // Emit a command event for the socket to handle
    socketManager.emit('execute-command', { command, args });
    
    // Return success response
    res.json({ 
        success: true, 
        message: `Command "${command}" executed successfully`,
        timestamp: Date.now()
    });
});

// Get available commands API
app.get('/api/bot/commands', authenticateAPI, (req, res) => {
    // Return a list of available commands (this would be populated from your actual bot)
    // For now, we'll return a sample list
    res.json([
        { name: 'help', description: 'Display available commands', usage: '!help [command]', category: 'General' },
        { name: 'ping', description: 'Check bot response time', usage: '!ping', category: 'Utility' },
        { name: 'sticker', description: 'Create sticker from image', usage: '!sticker [caption]', category: 'Media' },
        { name: 'broadcast', description: 'Send message to all users', usage: '!broadcast <message>', category: 'Admin' },
        { name: 'restart', description: 'Restart the bot', usage: '!restart', category: 'Admin' }
    ]);
});

// Initialize the socket manager with our HTTP server
socketManager.init(server);

// Start the server
server.listen(PORT, () => {
    botState.log('info', `Admin panel server running on http://localhost:${PORT}`);
    console.log(`Admin panel server running on http://localhost:${PORT}`);
    console.log(`Username: sirtheprogrammer, Password: admin`);
}); 