/**
 * BotState Module
 * 
 * This module provides a centralized state management system for the WhatsApp bot
 * and enables communication between the bot and the admin panel.
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

class BotState extends EventEmitter {
    constructor() {
        super();
        this.state = {
            status: 'disconnected', // connected, disconnected, connecting
            startTime: null,
            qrCode: null,
            user: null,
            messagesHandled: 0,
            commandsExecuted: 0,
            errors: 0,
            logs: [],
            runtime: {
                platform: process.platform,
                node: process.version,
                memory: 0,
                uptime: '0:00:00'
            },
            deletedMessages: {
                count: 0,
                recent: []
            }
        };
        
        // Maximum logs to keep in memory
        this.maxLogs = 500;
        
        // Initialize logs directory
        this.logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
        
        // Update runtime stats periodically
        setInterval(() => {
            this.updateRuntimeStats();
        }, 30000); // Every 30 seconds
    }
    
    // Get the current state
    getState() {
        return { ...this.state };
    }
    
    // Set the connection status
    setStatus(status) {
        this.state.status = status;
        
        if (status === 'connected' && !this.state.startTime) {
            this.state.startTime = new Date();
        }
        
        this.emit('status-update', status);
        this.log('info', `Bot status changed to: ${status}`);
    }
    
    // Set the QR code for connection
    setQRCode(qrCode) {
        this.state.qrCode = qrCode;
        this.emit('qr-update', qrCode);
        this.log('info', 'New QR code generated');
    }
    
    // Set the connected user info
    setUser(user) {
        this.state.user = user;
        this.emit('user-update', user);
        this.log('info', `Bot connected as: ${user.id}`);
    }
    
    // Increment message counter
    incrementMessages() {
        this.state.messagesHandled++;
        this.emit('stats-update', this.getStats());
    }
    
    // Increment command counter
    incrementCommands() {
        this.state.commandsExecuted++;
        this.emit('stats-update', this.getStats());
    }
    
    // Increment error counter
    incrementErrors() {
        this.state.errors++;
        this.emit('stats-update', this.getStats());
    }
    
    // Add a deleted message to tracking
    trackDeletedMessage(message) {
        this.state.deletedMessages.count++;
        
        // Keep only the 10 most recent deleted messages in memory
        if (this.state.deletedMessages.recent.length >= 10) {
            this.state.deletedMessages.recent.shift();
        }
        
        this.state.deletedMessages.recent.push(message);
        this.emit('deleted-message', message);
    }
    
    // Get basic stats for the admin panel
    getStats() {
        return {
            status: this.state.status,
            uptime: this.getUptime(),
            messagesHandled: this.state.messagesHandled,
            commandsExecuted: this.state.commandsExecuted,
            errors: this.state.errors,
            memory: this.state.runtime.memory,
            deletedMessages: this.state.deletedMessages.count
        };
    }
    
    // Calculate uptime
    getUptime() {
        if (!this.state.startTime) return '0:00:00';
        
        const diff = new Date() - this.state.startTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Update runtime statistics
    updateRuntimeStats() {
        this.state.runtime.memory = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        this.state.runtime.uptime = this.getUptime();
        
        // Emit updated stats
        this.emit('stats-update', this.getStats());
    }
    
    // Log a message both to memory and file
    log(level, message) {
        const timestamp = new Date();
        const logEntry = {
            level,
            timestamp,
            message
        };
        
        // Add to in-memory logs (limited size)
        this.state.logs.push(logEntry);
        if (this.state.logs.length > this.maxLogs) {
            this.state.logs.shift();
        }
        
        // Write to log file
        this.writeLog(logEntry);
        
        // Emit log event for real-time updates
        this.emit('log', logEntry);
        
        // Track errors
        if (level === 'error') {
            this.incrementErrors();
        }
    }
    
    // Write log to file
    writeLog(logEntry) {
        try {
            const date = new Date(logEntry.timestamp).toISOString().split('T')[0];
            const logFile = path.join(this.logsDir, `${date}.log`);
            
            const formattedLog = `[${new Date(logEntry.timestamp).toISOString()}] [${logEntry.level.toUpperCase()}] ${logEntry.message}\n`;
            
            fs.appendFileSync(logFile, formattedLog);
        } catch (error) {
            console.error('Error writing to log file:', error);
        }
    }
    
    // Get recent logs
    getLogs(count = 100, level = null) {
        let logs = [...this.state.logs];
        
        // Filter by level if specified
        if (level) {
            logs = logs.filter(log => log.level === level);
        }
        
        // Return most recent logs
        return logs.slice(-count).reverse();
    }
    
    // Read logs from file
    readLogs(date, count = 100, level = null) {
        try {
            const logFile = path.join(this.logsDir, `${date}.log`);
            
            if (!fs.existsSync(logFile)) {
                return [];
            }
            
            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim());
            
            // Parse log lines
            const logs = lines.map(line => {
                const matches = line.match(/\[(.*?)\] \[(.*?)\] (.*)/);
                if (matches) {
                    return {
                        timestamp: new Date(matches[1]),
                        level: matches[2].toLowerCase(),
                        message: matches[3]
                    };
                }
                return null;
            }).filter(log => log !== null);
            
            // Filter by level if specified
            if (level) {
                logs = logs.filter(log => log.level.toLowerCase() === level.toLowerCase());
            }
            
            // Return most recent logs
            return logs.slice(-count).reverse();
        } catch (error) {
            console.error('Error reading log file:', error);
            return [];
        }
    }
    
    // Get available log dates
    getAvailableLogDates() {
        try {
            const files = fs.readdirSync(this.logsDir);
            return files
                .filter(file => file.endsWith('.log'))
                .map(file => file.replace('.log', ''))
                .sort()
                .reverse();
        } catch (error) {
            console.error('Error reading logs directory:', error);
            return [];
        }
    }
}

// Create a singleton instance
const botState = new BotState();

module.exports = botState; 