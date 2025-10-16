/**
 * WebSocket Client for WhatsApp Bot Admin Panel
 * 
 * This module handles real-time communication between the admin panel and the bot.
 */

// WebSocket for WhatsApp Bot Admin Panel

// Track connection state
let isConnecting = false;
let reconnectAttempts = 0;
let reconnectTimer = null;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 2000; // 2 seconds

// Create a WebSocket connection to the admin server
function createWebSocket() {
    console.log('Creating WebSocket connection...');
    
    // Don't create multiple connections simultaneously
    if (isConnecting) {
        console.log('WebSocket connection already in progress');
        return null;
    }
    
    // Get credentials from session storage
    const username = sessionStorage.getItem('username') || 'sirtheprogrammer';
    const password = sessionStorage.getItem('password') || 'admin';
    const token = sessionStorage.getItem('authenticated') || 'true';
    
    // Encode credentials for the WebSocket connection
    const credentials = btoa(`${username}:${password}`);
    
    isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const socket = new WebSocket(`${protocol}//${host}/admin-ws?token=${token}&credentials=${credentials}`);
    
    // Debug every WebSocket event for troubleshooting
    ['open', 'message', 'close', 'error'].forEach(eventType => {
        socket.addEventListener(eventType, (event) => {
            console.log(`WebSocket ${eventType} event:`, event);
        });
    });
    
    // WebSocket event listeners
    socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
        isConnecting = false;
        reconnectAttempts = 0;
        
        // Notify other modules
        const event = new CustomEvent('websocket-connected');
        document.dispatchEvent(event);
        
        // Add success notification
        if (typeof addSystemNotification === 'function') {
            addSystemNotification('Connected to bot server', 'success');
        }
        
        // Send authentication if available
        if (sessionStorage.getItem('authenticated')) {
            sendAuthentication();
        }
        
        // Dispatch event for other modules to know WebSocket is ready
        window.dispatchEvent(new CustomEvent('websocket-ready'));
    });
    
    socket.addEventListener('message', (event) => {
        try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message, socket);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            console.log('Raw message:', event.data);
        }
    });
    
    socket.addEventListener('close', (event) => {
        console.log(`WebSocket connection closed: ${event.code} ${event.reason}`);
        isConnecting = false;
        
        if (event.code === 1000) {
            // Normal closure
            console.log('WebSocket closed normally');
        } else if (event.code === 1006) {
            // Abnormal closure, attempt reconnect
            console.log('WebSocket connection lost, attempting to reconnect...');
            reconnectWebSocketWithBackoff();
        } else if (event.code === 1008 || event.code === 4000) {
            // Authentication failed
            console.error('WebSocket authentication failed');
            if (typeof addSystemNotification === 'function') {
                addSystemNotification('Authentication failed', 'danger');
            }
        } else {
            // Other errors, attempt reconnect
            console.log(`WebSocket closed with code ${event.code}, attempting to reconnect...`);
            reconnectWebSocketWithBackoff();
        }
    });
    
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        isConnecting = false;
        
        // Notify the user
        if (typeof addSystemNotification === 'function') {
            addSystemNotification('Connection error. Retrying...', 'warning');
        }
    });
    
    return socket;
}

// Reconnect with exponential backoff
function reconnectWebSocketWithBackoff() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.log(`Maximum reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
        if (typeof addSystemNotification === 'function') {
            addSystemNotification('Failed to reconnect after multiple attempts', 'danger');
        }
        return;
    }
    
    reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts - 1);
    console.log(`Reconnecting WebSocket in ${delay}ms (attempt ${reconnectAttempts})`);
    
    setTimeout(() => {
        if (!isConnecting) {
            console.log(`Attempting reconnect #${reconnectAttempts}`);
            window.botSocket.socket = createWebSocket();
        }
    }, delay);
}

// Handle WebSocket messages
function handleWebSocketMessage(message, socket) {
    console.log('Received WebSocket message:', message);
    
    // Parse string messages
    if (typeof message === 'string') {
        try {
            message = JSON.parse(message);
        } catch (error) {
            console.log('Received non-JSON string message:', message);
            // If we get a string message like 'get-stats', handle it specially
            if (message === 'get-stats') {
                console.log('Handling get-stats string message with mock data');
                
                // Use the mock data from main.js if available
                let mockStats;
                if (window.mockApiData && window.mockApiData.stats) {
                    mockStats = window.mockApiData.stats;
                    // Update uptime dynamically
                    mockStats.uptime = formatUptime(Date.now() - mockStats.startTime);
                } else {
                    // Fallback to local mock data
                    mockStats = {
                        uptime: formatUptime(Date.now() - 3600000), // 1 hour uptime
                        messagesHandled: 120,
                        commandsExecuted: 45,
                        memory: Math.floor(Math.random() * 100) + 50, // Random memory usage
                        status: 'connected'
                    };
                }
                
                if (typeof updateDashboardStats === 'function') {
                    updateDashboardStats(mockStats);
                }
                
                // Dispatch an event that other modules can listen for
                document.dispatchEvent(new CustomEvent('stats-received', { detail: mockStats }));
                
                // We've handled this message, so return
                return;
            } else if (message === 'get-logs') {
                // Use mock logs data if available
                let mockLogs;
                if (window.mockApiData && window.mockApiData.logs) {
                    mockLogs = window.mockApiData.logs;
                } else {
                    mockLogs = [
                        { timestamp: Date.now() - 120000, level: 'info', message: 'Bot started successfully' },
                        { timestamp: Date.now() - 60000, level: 'info', message: 'Mock log entry' }
                    ];
                }
                
                document.dispatchEvent(new CustomEvent('logs-received', { detail: mockLogs }));
                return;
            } else if (message === 'get-settings') {
                // Use mock settings data if available
                let mockSettings;
                if (window.mockApiData && window.mockApiData.settings) {
                    mockSettings = window.mockApiData.settings;
                } else {
                    mockSettings = {
                        prefix: '!',
                        autoReply: true,
                        antiDelete: true
                    };
                }
                
                document.dispatchEvent(new CustomEvent('settings-received', { detail: mockSettings }));
                return;
            } else if (message === 'get-commands') {
                // Use mock commands data if available
                let mockCommands;
                if (window.mockApiData && window.mockApiData.commands) {
                    mockCommands = window.mockApiData.commands;
                } else {
                    mockCommands = [
                        { name: 'help', description: 'Show help', enabled: true },
                        { name: 'sticker', description: 'Create sticker', enabled: true }
                    ];
                }
                
                document.dispatchEvent(new CustomEvent('commands-received', { detail: mockCommands }));
                return;
            } else if (message === 'get-contacts') {
                // Use mock contacts data if available
                let mockContacts;
                if (window.mockApiData && window.mockApiData.contacts) {
                    mockContacts = window.mockApiData.contacts;
                } else {
                    mockContacts = {
                        users: [{ name: 'John Doe', number: '+1234567890' }],
                        groups: [{ name: 'Test Group', participants: 5 }]
                    };
                }
                
                document.dispatchEvent(new CustomEvent('contacts-received', { detail: mockContacts }));
                return;
            }
        }
    }
    
    // If it's not a proper object with a type, exit
    if (!message || !message.type) {
        console.warn('WebSocket message has no type:', message);
        return;
    }
    
    switch (message.type) {
        case 'auth-success':
            console.log('Authentication successful');
            break;
            
        case 'auth-error':
            console.error('Authentication error:', message.error);
            if (typeof addSystemNotification === 'function') {
                addSystemNotification('Authentication error: ' + message.error, 'danger');
            }
            break;
            
        case 'stats-update':
            console.log('Received stats update:', message.data);
            if (typeof updateDashboardStats === 'function') {
                updateDashboardStats(message.data);
            }
            // Dispatch an event that other modules can listen for
            document.dispatchEvent(new CustomEvent('stats-received', { detail: message.data }));
            break;
            
        case 'log':
            console.log('Received log message:', message.data);
            if (typeof addLogMessage === 'function') {
                addLogMessage(message.data);
            }
            break;
            
        case 'settings':
            console.log('Received settings:', message.data);
            // This will be handled by the settings module
            document.dispatchEvent(new CustomEvent('settings-received', { detail: message.data }));
            break;
            
        case 'commands':
            console.log('Received commands:', message.data);
            // This will be handled by the commands module
            document.dispatchEvent(new CustomEvent('commands-received', { detail: message.data }));
            break;
            
        case 'contacts':
            console.log('Received contacts:', message.data);
            // This will be handled by the users module
            document.dispatchEvent(new CustomEvent('contacts-received', { detail: message.data }));
            break;
            
        case 'error':
            console.error('Server error:', message.error);
            if (typeof addSystemNotification === 'function') {
                addSystemNotification('Server error: ' + message.error, 'danger');
            }
            break;
            
        case 'unknown-message-type':
            console.warn('Server does not recognize message type:', message.originalType);
            // Handle specific cases
            if (message.originalType === 'get-stats') {
                console.log('Handling unknown-message-type for get-stats with mock data');
                // Generate mock stats
                const mockStats = {
                    uptime: formatUptime(Date.now() - Math.floor(Math.random() * 86400000)), // Random uptime (up to 1 day)
                    messagesHandled: Math.floor(Math.random() * 500),
                    commandsExecuted: Math.floor(Math.random() * 200),
                    memory: Math.floor(Math.random() * 100) + 50, // Random memory usage
                    status: 'connected'
                };
                
                if (typeof updateDashboardStats === 'function') {
                    updateDashboardStats(mockStats);
                }
                
                // Dispatch an event that other modules can listen for
                document.dispatchEvent(new CustomEvent('stats-received', { detail: mockStats }));
                
                // Also show notification that we're using mock data
                if (typeof addSystemNotification === 'function') {
                    addSystemNotification('Using simulated bot statistics (server does not support real-time stats)', 'info');
                }
            }
            break;
            
        default:
            console.warn('Unknown message type:', message.type);
    }
}

// Helper function to format uptime
function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Create global botSocket object that handles reconnection
window.botSocket = {
    socket: null,
    
    // Initialize WebSocket connection
    init: function() {
        console.log('Initializing WebSocket connection');
        this.socket = createWebSocket();
        return this;
    },
    
    // Send a message to the server
    send: function(message) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not connected, cannot send message:', message);
            // Queue up important messages for future sending
            this._queueMessage(message);
            return false;
        }
        
        if (typeof message === 'string') {
            console.log('Sending WebSocket message:', message);
            this.socket.send(message);
        } else {
            console.log('Sending WebSocket message:', message);
            this.socket.send(JSON.stringify(message));
        }
        
        return true;
    },
    
    // Close the WebSocket connection
    close: function() {
        if (this.socket) {
            this.socket.close(1000, 'Normal closure');
            this.socket = null;
        }
    },
    
    // Queue important messages for future sending
    _messageQueue: [],
    _queueMessage: function(message) {
        // Only queue important messages
        if (message && (
            message === 'get-stats' || 
            message === 'get-settings' ||
            message === 'get-commands' ||
            message === 'get-contacts'
        )) {
            this._messageQueue.push(message);
            console.log('Message queued for future sending:', message);
        }
    },
    
    // Process queued messages
    _processQueue: function() {
        if (this._messageQueue.length > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('Processing queued messages:', this._messageQueue);
            
            // Process up to 5 messages at a time
            const messagesToProcess = this._messageQueue.splice(0, 5);
            messagesToProcess.forEach(message => {
                this.send(message);
            });
            
            // If there are more messages, schedule another processing
            if (this._messageQueue.length > 0) {
                setTimeout(() => this._processQueue(), 500);
            }
        }
    }
};

// Create the actual WebSocket immediately instead of waiting for DOMContentLoaded
console.log('Initializing WebSocket immediately on script load');
window.botSocket.socket = createWebSocket();

// Also set up event listener for reconnection when page is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Document ready, WebSocket already initialized');
    
    // Setup reconnection logic
    document.addEventListener('websocket-connected', function() {
        console.log('WebSocket connected event received');
        window.botSocket._processQueue();
    });
});

// Event callbacks
const eventCallbacks = new Map();

// Register event listener
function on(event, callback) {
    if (!eventCallbacks.has(event)) {
        eventCallbacks.set(event, new Set());
    }
    eventCallbacks.get(event).add(callback);
}

// Remove event listener
function off(event, callback) {
    if (eventCallbacks.has(event)) {
        eventCallbacks.get(event).delete(callback);
    }
}

// Trigger event
function triggerEvent(event, data) {
    if (eventCallbacks.has(event)) {
        eventCallbacks.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} event handler:`, error);
            }
        });
    }
}

// Send message to server
function sendMessage(type, payload = {}) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket is not connected when trying to send:', type, payload);
        triggerEvent('error', { message: 'Cannot send message: WebSocket is not connected' });
        return false;
    }
    
    try {
        const message = JSON.stringify({ type, payload });
        console.log('Sending WebSocket message:', type, payload);
        socket.send(message);
        return true;
    } catch (error) {
        console.error('Error sending WebSocket message:', error, type, payload);
        triggerEvent('error', { message: `Failed to send message: ${error.message}` });
        return false;
    }
}

// Handle incoming messages
function handleMessage(data) {
    const { type, payload } = data;
    
    console.log('Received WebSocket message:', type, payload);
    
    switch (type) {
        case 'init':
            // Initial state received
            console.log('Received initial state:', payload);
            triggerEvent('stats', payload);
            triggerEvent('status', { status: payload.status });
            break;
            
        case 'stats':
            // Statistics update
            console.log('Received stats update:', payload);
            triggerEvent('stats', payload);
            break;
            
        case 'log':
            // New log entry
            console.log('Received log entry:', payload);
            triggerEvent('log', payload);
            break;
            
        case 'status':
            // Status update
            console.log('Received status update:', payload);
            triggerEvent('status', payload);
            break;
            
        case 'qr':
            // QR code update
            console.log('Received QR code update');
            triggerEvent('qr', payload);
            break;
            
        case 'deleted-message':
            // Deleted message
            console.log('Received deleted message:', payload);
            triggerEvent('deleted-message', payload);
            break;
            
        case 'pong':
            // Server responded to our ping
            console.log('Received pong from server');
            break;
            
        case 'error':
            // Error message from server
            console.error('Server error:', payload.message);
            triggerEvent('error', payload);
            break;
            
        case 'restart-requested':
            console.log('Restart request acknowledged by server:', payload);
            break;
            
        case 'qr-refresh-requested':
            console.log('QR refresh request acknowledged by server:', payload);
            break;
            
        case 'send-message-result':
            console.log('Send message result:', payload);
            break;
            
        case 'update-config-result':
            console.log('Update config result:', payload);
            break;
            
        default:
            console.log('Unknown message type:', type, payload);
    }
}

// Restart the bot
function restartBot() {
    return sendMessage('restart-bot');
}

// Refresh QR code
function refreshQR() {
    return sendMessage('refresh-qr');
}

// Send a message
function sendBotMessage(to, message, type = 'text') {
    return sendMessage('send-message', { to, message, type });
}

// Update config
function updateConfig(config) {
    return sendMessage('update-config', config);
}

// Get logs
function getLogs(options = {}) {
    return sendMessage('get-logs', options);
}

// Authentication function
function sendAuthentication() {
    const username = sessionStorage.getItem('username');
    const password = sessionStorage.getItem('password');
    
    if (username && password && window.botSocket) {
        window.botSocket.send({
            type: 'auth',
            payload: { username, password }
        });
    }
}

// Setup fallback polling if WebSocket is not available
function setupFallbackPolling() {
    console.warn('Setting up fallback polling for updates');
    
    // Create a mock botSocket for compatibility
    window.botSocket = {
        socket: null,
        
        send: function(data) {
            console.warn('Using fallback API for command:', data.type);
            
            // Handle fallback for different message types
            switch (data.type) {
                case 'restart-bot':
                    fetch('/api/bot/restart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    }).then(handleFallbackResponse);
                    break;
                    
                case 'refresh-qr':
                    fetch('/api/bot/refresh-qr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    }).then(handleFallbackResponse);
                    break;
                    
                case 'get-logs':
                    const params = new URLSearchParams(data.payload);
                    fetch(`/api/logs?${params}`).then(handleFallbackResponse);
                    break;
                    
                case 'auth':
                    // Authentication is handled by session cookies in fallback mode
                    break;
                    
                default:
                    console.error('Unsupported fallback command:', data.type);
                    return false;
            }
            
            return true;
        },
        
        restartBot: function() {
            return this.send({ type: 'restart-bot' });
        },
        
        refreshQR: function() {
            return this.send({ type: 'refresh-qr' });
        },
        
        getLogs: function(date, count, level) {
            return this.send({ 
                type: 'get-logs',
                payload: { date, count, level }
            });
        },
        
        reconnect: function() {
            initWebSocket();
            return true;
        }
    };
    
    // Set up polling for stats
    let statsInterval = setInterval(function() {
        fetch('/api/status')
            .then(response => {
                if (!response.ok) throw new Error('API Error: ' + response.status);
                return response.json();
            })
            .then(data => {
                // Simulate a WebSocket message for compatibility
                if (typeof window.handleWebSocketMessage === 'function') {
                    const mockEvent = {
                        data: JSON.stringify({
                            type: 'stats',
                            payload: data
                        })
                    };
                    window.handleWebSocketMessage(mockEvent);
                }
            })
            .catch(error => {
                console.error('Stats polling error:', error);
                if (window.mockApiData && typeof window.updateDashboardStats === 'function') {
                    // Use mock data if available
                    window.updateDashboardStats(window.mockApiData('stats'));
                }
            });
    }, 10000); // Poll every 10 seconds
    
    // Dispatch event so other modules know we're using fallback mode
    window.dispatchEvent(new CustomEvent('websocket-fallback'));
}

// Helper function for fallback responses
function handleFallbackResponse(response) {
    if (!response.ok) {
        console.error('Fallback API error:', response.status);
        if (typeof window.showNotification === 'function') {
            window.showNotification(`API Error: ${response.status}`, 'danger');
        }
        return null;
    }
    
    return response.json().then(data => {
        // Simulate a WebSocket message
        if (typeof window.handleWebSocketMessage === 'function') {
            const responseType = response.url.includes('/api/logs') ? 'logs' : 
                               response.url.includes('/api/bot/restart') ? 'restart-requested' :
                               response.url.includes('/api/bot/refresh-qr') ? 'qr-refreshing' : 'response';
            
            const mockEvent = {
                data: JSON.stringify({
                    type: responseType,
                    payload: data
                })
            };
            window.handleWebSocketMessage(mockEvent);
        }
        return data;
    });
}

// Initialize WebSocket on page load
document.addEventListener('DOMContentLoaded', function() {
    initWebSocket();
});

// Initialize immediately if the DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initWebSocket();
}

// Export the WebSocket API
window.WebSocketAPI = {
    init: initWebSocket,
    on: on,
    off: off,
    send: sendMessage,
    restartBot: restartBot,
    refreshQR: refreshQR,
    sendMessage: sendBotMessage,
    updateConfig: updateConfig,
    getLogs: getLogs
}; 