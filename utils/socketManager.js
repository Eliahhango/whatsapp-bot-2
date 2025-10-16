/**
 * Socket Manager Module
 * 
 * This module sets up a WebSocket server for real-time communication 
 * between the bot and the admin panel.
 */

const WebSocket = require('ws');
const botState = require('./botState');
const url = require('url');

class SocketManager {
    constructor() {
        this.wss = null;
        this.adminClients = new Set();
        this.isInitialized = false;
    }
    
    // Initialize WebSocket server
    initialize(server) {
        if (this.isInitialized) return;
        
        // Create WebSocket server
        this.wss = new WebSocket.Server({ 
            server,
            path: '/ws',
            clientTracking: true
        });
        
        // Handle connections
        this.wss.on('connection', (ws, req) => {
            const urlParams = url.parse(req.url, true).query;
            const clientType = urlParams.type || 'unknown';
            
            console.log(`New WebSocket connection: ${clientType}`);
            
            // Set client type and last activity timestamp
            ws.clientType = clientType;
            ws.isAlive = true;
            ws.lastActivity = Date.now();
            
            // Setup ping-pong for connection health check
            ws.on('pong', () => {
                ws.isAlive = true;
                ws.lastActivity = Date.now();
            });
            
            // Add to admin clients list for broadcasting
            if (clientType === 'admin') {
                this.adminClients.add(ws);
                
                // Send initial state
                this.sendToClient(ws, 'init', botState.getState());
            }
            
            // Handle messages
            ws.on('message', (message) => {
                try {
                    ws.lastActivity = Date.now();
                    const data = JSON.parse(message);
                    this.handleMessage(ws, data);
                } catch (err) {
                    console.error('Error parsing WebSocket message:', err);
                    this.sendToClient(ws, 'error', { message: 'Invalid message format' });
                }
            });
            
            // Handle disconnection
            ws.on('close', () => {
                if (clientType === 'admin') {
                    this.adminClients.delete(ws);
                }
                console.log(`WebSocket client disconnected: ${clientType}`);
            });
            
            // Handle errors
            ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                if (clientType === 'admin') {
                    this.adminClients.delete(ws);
                }
            });
        });
        
        // Set up connection health check interval
        const healthCheckInterval = setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (!ws.isAlive) {
                    console.log(`Terminating inactive connection: ${ws.clientType}`);
                    return ws.terminate();
                }
                
                // Check for timeout (5 minutes of inactivity)
                if (Date.now() - ws.lastActivity > 5 * 60 * 1000) {
                    console.log(`Terminating connection due to inactivity: ${ws.clientType}`);
                    return ws.terminate();
                }
                
                ws.isAlive = false;
                ws.ping();
            });
        }, 30000); // Check every 30 seconds
        
        // Clean up interval on server close
        this.wss.on('close', () => {
            clearInterval(healthCheckInterval);
        });
        
        // Set up event listeners for bot state changes
        this.setupStateListeners();
        
        this.isInitialized = true;
        console.log('WebSocket server initialized');
    }
    
    // Set up event listeners for bot state changes
    setupStateListeners() {
        // Listen for status updates
        botState.on('status-update', (status) => {
            this.broadcastToAdmins('status', { status });
        });
        
        // Listen for QR code updates
        botState.on('qr-update', (qrCode) => {
            this.broadcastToAdmins('qr', { qrCode });
        });
        
        // Listen for stats updates
        botState.on('stats-update', (stats) => {
            this.broadcastToAdmins('stats', stats);
        });
        
        // Listen for new logs
        botState.on('log', (logEntry) => {
            this.broadcastToAdmins('log', logEntry);
        });
        
        // Listen for deleted messages
        botState.on('deleted-message', (message) => {
            this.broadcastToAdmins('deleted-message', message);
        });
    }
    
    // Handle incoming WebSocket messages
    handleMessage(ws, data) {
        try {
            const { type, payload } = data;
            
            console.log(`Received WebSocket message of type: ${type}`);
            
            switch (type) {
                case 'ping':
                    // Respond to ping with pong
                    this.sendToClient(ws, 'pong');
                    break;
                    
                case 'restart-bot':
                    // Request to restart the bot
                    this.handleRestartBot(ws);
                    break;
                    
                case 'refresh-qr':
                    // Request to refresh QR code
                    this.handleRefreshQR(ws);
                    break;
                    
                case 'get-logs':
                    // Request for logs
                    this.handleGetLogs(ws, payload);
                    break;
                    
                case 'send-message':
                    // Request to send a message
                    this.handleSendMessage(ws, payload);
                    break;
                    
                case 'update-config':
                    // Request to update config
                    this.handleUpdateConfig(ws, payload);
                    break;
                    
                case 'broadcast':
                    // Handle broadcast message
                    this.handleBroadcast(ws, payload);
                    break;
                    
                case 'get-stats':
                    // Handle get stats request
                    this.handleGetStats(ws);
                    break;
                    
                case 'execute-command':
                    // Handle execute command request
                    this.handleExecuteCommand(ws, payload);
                    break;
                    
                default:
                    console.log(`Unknown WebSocket message type: ${type}`);
                    this.sendToClient(ws, 'unknown-message-type', { 
                        message: `Unknown message type: ${type}`,
                        originalType: type
                    });
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
            this.sendToClient(ws, 'error', { 
                message: `Error processing message: ${error.message}`
            });
        }
    }
    
    // Handle restart bot request
    handleRestartBot(ws) {
        botState.log('info', 'Bot restart requested from admin panel');
        
        // Send response confirming the restart request was received
        this.sendToClient(ws, 'restart-requested', { success: true });
        
        // This will be implemented in the bot.js integration
        this.emit('restart-bot');
    }
    
    // Handle refresh QR code request
    handleRefreshQR(ws) {
        botState.log('info', 'QR code refresh requested from admin panel');
        
        // Send response confirming the QR refresh request was received
        this.sendToClient(ws, 'qr-refresh-requested', { success: true });
        
        // This will be implemented in the bot.js integration
        this.emit('refresh-qr');
    }
    
    // Handle get logs request
    handleGetLogs(ws, payload) {
        const { date, count, level } = payload || {};
        
        let logs;
        if (date) {
            logs = botState.readLogs(date, count, level);
        } else {
            logs = botState.getLogs(count, level);
        }
        
        this.sendToClient(ws, 'logs', { logs });
    }
    
    // Handle send message request
    handleSendMessage(ws, payload) {
        const { to, message, type } = payload || {};
        
        if (!to || !message) {
            return this.sendToClient(ws, 'send-message-result', { 
                success: false, 
                error: 'Missing required parameters' 
            });
        }
        
        botState.log('info', `Message send requested from admin panel to ${to}`);
        
        // This will be implemented in the bot.js integration
        this.emit('send-message', { to, message, type });
        
        // For now, just send a positive response
        this.sendToClient(ws, 'send-message-result', { 
            success: true, 
            message: 'Message send request received' 
        });
    }
    
    // Handle update config request
    handleUpdateConfig(ws, payload) {
        if (!payload) {
            return this.sendToClient(ws, 'update-config-result', { 
                success: false, 
                error: 'Missing configuration data' 
            });
        }
        
        botState.log('info', 'Configuration update requested from admin panel');
        
        // This will be implemented in the bot.js integration
        this.emit('update-config', payload);
        
        // For now, just send a positive response
        this.sendToClient(ws, 'update-config-result', { 
            success: true, 
            message: 'Configuration update request received' 
        });
    }
    
    // Handle broadcast message
    handleBroadcast(ws, payload) {
        if (!payload || !payload.message) {
            return this.sendToClient(ws, 'broadcast-result', {
                success: false,
                error: 'Missing message parameter'
            });
        }
        
        botState.log('info', `Broadcast message requested from admin panel: ${payload.message}`);
        
        // Emit the broadcast event for the bot to handle
        this.emit('broadcast-message', { message: payload.message });
        
        // Send confirmation to the client
        this.sendToClient(ws, 'broadcast-confirmation', {
            success: true,
            message: 'Broadcast request received',
            timestamp: Date.now()
        });
        
        // Also send a broadcast to all admin clients for activity tracking
        this.broadcastToAdmins('broadcast-sent', {
            message: payload.message,
            timestamp: Date.now()
        });
    }
    
    // Handle get stats request
    handleGetStats(ws) {
        const stats = botState.getStats();
        this.sendToClient(ws, 'stats-update', stats);
    }
    
    // Handle execute command request
    handleExecuteCommand(ws, payload) {
        if (!payload || !payload.command) {
            return this.sendToClient(ws, 'command-result', {
                success: false,
                error: 'Missing command parameter'
            });
        }
        
        const { command, args = [] } = payload;
        
        botState.log('info', `Command executed from admin panel: ${command} ${args.join(' ')}`);
        
        // Emit the command event for the bot to handle
        this.emit('execute-command', { command, args });
        
        // Send response to the client
        this.sendToClient(ws, 'command-result', {
            success: true,
            command: command,
            args: args,
            message: `Command "${command}" executed successfully`,
            timestamp: Date.now()
        });
    }
    
    // Send a message to a specific client
    sendToClient(ws, type, payload = {}) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify({ type, payload }));
            } catch (error) {
                console.error('Error sending message to client:', error);
            }
        }
    }
    
    // Broadcast a message to all admin clients
    broadcastToAdmins(type, payload) {
        this.adminClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                try {
                    client.send(JSON.stringify({ type, payload }));
                } catch (error) {
                    console.error('Error broadcasting to admin:', error);
                    // Remove client if we can't send to it
                    this.adminClients.delete(client);
                }
            } else {
                // Remove client if it's not open
                this.adminClients.delete(client);
            }
        });
    }
    
    // Emit an event (for bot.js to listen to)
    emit(event, data) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(listener => {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
        
        // Also broadcast certain events to admin clients
        switch (event) {
            case 'restart-bot':
                this.broadcastToAdmins('bot-restarting', { timestamp: Date.now() });
                break;
            case 'refresh-qr':
                this.broadcastToAdmins('qr-refreshing', { timestamp: Date.now() });
                break;
            case 'send-message':
                this.broadcastToAdmins('message-sending', { 
                    to: data.to,
                    type: data.type,
                    timestamp: Date.now()
                });
                break;
        }
    }
    
    // Add event listener (for bot.js)
    on(event, callback) {
        if (!this.eventListeners) {
            this.eventListeners = {};
        }
        
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = new Set();
        }
        
        this.eventListeners[event].add(callback);
        return () => this.eventListeners[event].delete(callback); // Return cleanup function
    }
    
    // Remove event listener
    off(event, callback) {
        if (this.eventListeners && this.eventListeners[event]) {
            this.eventListeners[event].delete(callback);
        }
    }

    // Add getStatus method to the SocketManager class
    getStatus() {
        try {
            if (!this.wss) {
                return {
                    connected: false,
                    clients: 0,
                    message: 'WebSocket server not initialized'
                };
            }
            
            return {
                connected: true,
                clients: this.wss.clients ? this.wss.clients.size : 0,
                uptime: process.uptime(),
                lastBroadcast: this.lastBroadcastTime || null
            };
        } catch (error) {
            console.error('Error getting WebSocket status:', error);
            return {
                connected: false,
                error: error.message,
                message: 'Error retrieving WebSocket status'
            };
        }
    }
}

// Create a singleton instance
const socketManager = new SocketManager();

// Bind methods to preserve 'this' context
socketManager.initialize = socketManager.initialize.bind(socketManager);
socketManager.broadcastToAdmins = socketManager.broadcastToAdmins.bind(socketManager);
socketManager.sendToClient = socketManager.sendToClient.bind(socketManager);
socketManager.getStatus = socketManager.getStatus.bind(socketManager);
socketManager.handleMessage = socketManager.handleMessage.bind(socketManager);
socketManager.emit = socketManager.emit.bind(socketManager);

module.exports = {
    init: socketManager.initialize,
    broadcastToAdmin: socketManager.broadcastToAdmins,
    sendToAdmin: socketManager.sendToClient,
    updateBotStats: socketManager.broadcastToAdmins,
    updateLogs: socketManager.broadcastToAdmins,
    broadcastMessage: socketManager.broadcastToAdmins,
    getStatus: socketManager.getStatus
}; 