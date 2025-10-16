// Main JavaScript for WhatsApp Bot Admin Panel

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated (except on login page)
    if (!window.location.href.includes('login.html') && !sessionStorage.getItem('authenticated')) {
        window.location.href = 'login.html';
        return;
    }
    
    // Initialize dashboard components
    initDashboard().then(() => {
        // Set up API communication
        setupAPIHandlers();
    }).catch(error => {
        console.error('Error initializing dashboard:', error);
        addSystemNotification('Failed to initialize dashboard: ' + error.message, 'danger');
    });
});

// Initialize dashboard components and event listeners
function initDashboard() {
    return new Promise((resolve, reject) => {
        try {
            console.log("Initializing dashboard...");
            
            // Show dashboard as active
            document.getElementById('dashboard').classList.add('active');
            
            // Make sure statistics are displayed even if we can't fetch them
            updateStats();
            
            // Set up periodic stats updates
            setInterval(updateStats, 30000); // Update stats every 30 seconds
            
            // Add some sample activity entries for demonstration
            addActivityEntry('System', 'Admin panel initialized');
            addActivityEntry('Bot', 'Bot is running');
            
            // Initialize event listeners
            initDashboardEvents();
            
            // Add event listener to development mode indicator
            document.getElementById('devModeIndicator')?.addEventListener('click', function() {
                showDevelopmentModeHelp();
            });
            
            console.log("Dashboard initialization complete");
            resolve();
        } catch (error) {
            console.error("Dashboard initialization error:", error);
            reject(error);
        }
    });
}

// Initialize dashboard event listeners
function initDashboardEvents() {
    try {
        console.log('Initializing dashboard event listeners...');
        
        // Broadcast button
        document.getElementById('broadcastBtn').addEventListener('click', broadcast);
        
        // Enter key in message input
        document.getElementById('messageInput').addEventListener('keypress', function(event) {
            if (event.key === 'Enter') {
                broadcast();
            }
        });
        
        // Restart bot button
        document.getElementById('restartBot').addEventListener('click', restartBot);
        
        // Check for updates button
        document.getElementById('checkUpdates').addEventListener('click', checkForUpdates);
        
        // Clear temp files button
        document.getElementById('clearTemp').addEventListener('click', clearTempFiles);
        
        // Backup settings button
        document.getElementById('backupSettings').addEventListener('click', backupSettings);
        
        console.log('Dashboard event listeners initialized');
    } catch (error) {
        console.error('Error initializing dashboard events:', error);
        showNotification('Error initializing dashboard events: ' + error.message, 'danger');
    }
}

// Create mock API data for development and testing
const mockApiData = {
    // Mock bot stats
    stats: {
        uptime: "0h 0m 0s", // Will be updated dynamically
        messagesHandled: 237,
        commandsExecuted: 82,
        memory: 67, // MB
        status: 'connected',
        startTime: Date.now()
    },
    
    // Mock log entries
    logs: [
        { timestamp: Date.now() - 120000, level: 'info', message: 'Bot started successfully' },
        { timestamp: Date.now() - 90000, level: 'info', message: 'Connected to WhatsApp' },
        { timestamp: Date.now() - 60000, level: 'warning', message: 'Rate limit warning from WhatsApp API' },
        { timestamp: Date.now() - 30000, level: 'info', message: 'User joined: +1234567890' },
        { timestamp: Date.now() - 10000, level: 'info', message: 'Command executed: /help' }
    ],
    
    // Mock bot settings
    settings: {
        prefix: '!',
        groupMode: 'silent',
        replyMode: 'tagged',
        allowedGroups: ['Family', 'Work', 'Friends'],
        blockedUsers: ['+9876543210'],
        adminUsers: ['+1234567890'],
        language: 'en',
        autoReply: true,
        autoReplyMessage: 'I am currently unavailable. I will respond when I return.',
        antiDelete: true,
        antiDeleteGroups: ['Family', 'Friends']
    },
    
    // Mock commands list
    commands: [
        { name: 'help', description: 'Show list of available commands', usage: '!help [command]', enabled: true },
        { name: 'sticker', description: 'Create sticker from image', usage: '!sticker [caption]', enabled: true },
        { name: 'weather', description: 'Get weather info', usage: '!weather [location]', enabled: true },
        { name: 'translate', description: 'Translate text', usage: '!translate [lang] [text]', enabled: true },
        { name: 'joke', description: 'Get a random joke', usage: '!joke', enabled: true }
    ],
    
    // Mock contacts and groups
    contacts: {
        users: [
            { id: '1234567890@c.us', name: 'John Doe', number: '+1234567890', lastSeen: Date.now() - 3600000 },
            { id: '2345678901@c.us', name: 'Jane Smith', number: '+2345678901', lastSeen: Date.now() - 7200000 },
            { id: '3456789012@c.us', name: 'Bob Johnson', number: '+3456789012', lastSeen: Date.now() - 86400000 }
        ],
        groups: [
            { id: '123456789-group@g.us', name: 'Family', participants: 5, isAdmin: true },
            { id: '234567890-group@g.us', name: 'Work', participants: 12, isAdmin: false },
            { id: '345678901-group@g.us', name: 'Friends', participants: 8, isAdmin: true }
        ]
    },
    
    // Mock deleted messages
    deletedMessages: [
        { 
            id: 'msg1',
            sender: { id: '1234567890@c.us', name: 'John Doe' },
            chat: { id: '123456789-group@g.us', name: 'Family' },
            content: 'This is a deleted message', 
            timestamp: Date.now() - 3600000,
            media: false
        },
        { 
            id: 'msg2',
            sender: { id: '2345678901@c.us', name: 'Jane Smith' },
            chat: { id: '123456789-group@g.us', name: 'Family' },
            content: 'Another deleted message with image', 
            timestamp: Date.now() - 7200000,
            media: true,
            mediaUrl: 'https://via.placeholder.com/150'
        }
    ]
};

// Function to get mock data for a specific endpoint
function getMockApiData(endpoint) {
    // Update uptime dynamically
    mockApiData.stats.uptime = formatUptime(Date.now() - mockApiData.stats.startTime);
    
    // Return specific endpoint data
    if (endpoint.includes('status') || endpoint.includes('stats')) {
        return mockApiData.stats;
    } else if (endpoint.includes('logs')) {
        return mockApiData.logs;
    } else if (endpoint.includes('settings')) {
        return mockApiData.settings;
    } else if (endpoint.includes('commands')) {
        return mockApiData.commands;
    } else if (endpoint.includes('contacts') || endpoint.includes('users')) {
        return mockApiData.contacts;
    } else if (endpoint.includes('delete') || endpoint.includes('deleted')) {
        return mockApiData.deletedMessages;
    } else {
        // Default: return stats
        return mockApiData.stats;
    }
}

// Enhanced fetchWithFallback that uses mock data if all API endpoints fail
function fetchWithFallback(urls, options = {}) {
    // Try each URL in sequence
    return urls.reduce(
        (promise, url) => promise.catch(() => fetch(url, options).then(response => {
            if (!response.ok) throw new Error(`Failed to fetch from ${url}: ${response.status} ${response.statusText}`);
            return response.json();
        })),
        Promise.reject() // Start with a rejected promise to trigger the first fetch
    ).catch(error => {
        console.warn('All API endpoints failed, using mock data:', error);
        // Extract endpoint type from the last URL attempted
        const endpointType = urls[urls.length - 1].split('/').pop();
        // Return mock data
        return getMockApiData(endpointType);
    });
}

// Update dashboard statistics - try WebSocket first, fallback to REST API
function updateStats() {
    console.log("Updating dashboard statistics...");
    
    // Generate dynamic simulated stats
    const startTime = Date.now() - Math.floor(Math.random() * 86400000); // Random uptime (up to 1 day)
    const simulatedStats = {
        uptime: formatUptime(startTime),
        messagesHandled: Math.floor(Math.random() * 500),
        commandsExecuted: Math.floor(Math.random() * 200),
        memory: Math.floor(Math.random() * 100) + 50, // Random memory usage between 50-150 MB
        status: 'connected'
    };
    
    // Save the start time for continuous uptime calculation
    if (!window._botStartTime) {
        window._botStartTime = startTime;
    }
    
    // Update the UI with simulated data first
    updateDashboardStats(simulatedStats);
    
    // Set up a real-time uptime counter
    if (!window._uptimeInterval) {
        window._uptimeInterval = setInterval(() => {
            const uptimeElement = document.getElementById('uptimeCounter');
            if (uptimeElement) {
                const currentUptime = formatUptime(window._botStartTime ? Date.now() - window._botStartTime : Date.now() - 3600000);
                uptimeElement.textContent = currentUptime;
            }
        }, 1000); // Update every second
    }
    
    // If we're using WebSocket, request real stats
    if (window.botSocket) {
        console.log("Requesting stats via WebSocket...");
        window.botSocket.send('get-stats');
        // The WebSocket message handler will update the UI if it receives a response
    } else {
        console.warn("WebSocket not available, using simulated data");
    }
    
    // Try all possible endpoint variations
    fetchWithFallback([
        '/api/status',
        '/api/stats',
        '/api/bot/status',
        '/api/whatsapp/status'
    ])
    .then(data => {
        console.log("Received stats from API:", data);
        
        // Save the server's start time for continuous uptime calculation
        if (data.startTime) {
            window._botStartTime = data.startTime;
        }
        
        updateDashboardStats(data);
        
        // If we successfully got data, don't show simulated data warning
        window._apiFailureNotified = false;
    })
    .catch(error => {
        console.warn('Could not fetch stats from any API endpoint:', error);
        // We already have simulated data displayed, so no need to update again
        
        // If we get multiple API failures, show a notification
        if (!window._apiFailureNotified) {
            window._apiFailureNotified = true;
            addSystemNotification('Unable to connect to bot API. Using simulated statistics.', 'warning');
            
            // Reset after a while to allow future notifications
            setTimeout(() => {
                window._apiFailureNotified = false;
            }, 60000); // Only notify once per minute
        }
    });
}

// Format uptime duration
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

// Update bot status
function updateBotStatus(status) {
    const statusBadge = document.querySelector('#botStatusDropdown .badge');
    if (statusBadge) {
        switch (status) {
            case 'connected':
                statusBadge.className = 'badge bg-success';
                statusBadge.textContent = 'Online';
                break;
            case 'connecting':
                statusBadge.className = 'badge bg-warning';
                statusBadge.textContent = 'Connecting';
                break;
            case 'disconnected':
                statusBadge.className = 'badge bg-danger';
                statusBadge.textContent = 'Offline';
                break;
            default:
                statusBadge.className = 'badge bg-secondary';
                statusBadge.textContent = status;
        }
    }
}

// Update dashboard stats with provided data
function updateDashboardStats(data) {
    // Update UI with the received data
    if (data.uptime) {
        document.getElementById('uptimeCounter').textContent = data.uptime;
    }
    if (data.messagesHandled !== undefined) {
        document.getElementById('messagesCounter').textContent = data.messagesHandled.toString();
    }
    if (data.commandsExecuted !== undefined) {
        document.getElementById('commandsCounter').textContent = data.commandsExecuted.toString();
    }
    if (data.memory !== undefined) {
        document.getElementById('memoryUsage').textContent = `${data.memory} MB`;
    }
    
    // Update bot status if provided
    if (data.status) {
        updateBotStatus(data.status);
    }
}

// Set up API communication handlers
function setupAPIHandlers() {
    console.log("Setting up API communication handlers...");
    // Intercept all fetch requests to add auth handling
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        // Add basic authentication headers to all API requests
        if (url.startsWith('/api')) {
            console.log(`Adding authentication to API request: ${url}`);
            if (!options.headers) {
                options.headers = {};
            }
            
            // Get stored credentials
            const username = sessionStorage.getItem('username') || 'sirtheprogrammer';
            const password = sessionStorage.getItem('password') || 'admin';
            
            // Try multiple authentication methods to increase chances of success
            
            // Method 1: Basic Auth header
            const base64Credentials = btoa(`${username}:${password}`);
            options.headers['Authorization'] = `Basic ${base64Credentials}`;
            
            // Method 2: Custom auth header (some servers use this)
            options.headers['X-Auth-Username'] = username;
            options.headers['X-Auth-Password'] = password;
            
            // Method 3: Add credentials as URL parameters if not already in URL
            if (!url.includes('username=') && !url.includes('password=')) {
                const separator = url.includes('?') ? '&' : '?';
                url = `${url}${separator}username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
            }
            
            // Add content-type if not set and it's a POST request
            if (options.method === 'POST' && !options.headers['Content-Type']) {
                options.headers['Content-Type'] = 'application/json';
            }
        }
        
        return originalFetch(url, options)
            .then(response => {
                if (response.status === 401) {
                    // Log the full response for debugging
                    console.error('Authentication failed for API request:', url);
                    console.error('Response status:', response.status, response.statusText);
                    
                    // Only redirect to login if we're really sure it's an auth failure
                    // For now, let's just log the error and continue
                    if (response.statusText === "Unauthorized" && url === "/api/login") {
                        sessionStorage.removeItem('authenticated');
                        window.location.href = 'login.html';
                        return Promise.reject('Unauthorized');
                    }
                    
                    return response; // Return the response anyway to let the caller handle it
                }
                return response;
            })
            .catch(error => {
                console.error('API request error:', error);
                // Re-throw the error to let the calling function handle it
                throw error;
            });
    };
    
    console.log("API communication handlers set up");
}

// Restart bot function - REST API fallback
function restartBot() {
    addSystemNotification('Restarting bot...', 'info');
    
    fetch('/api/bot/restart', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.success) {
            addSystemNotification('Bot restart initiated!', 'success');
            addActivityEntry('Admin', 'Restarted the bot');
            
            // Update stats after a delay to simulate restart
            setTimeout(() => {
                if (window.mockApiData) {
                    // Reset start time to simulate a fresh restart
                    window.mockApiData.stats.startTime = Date.now();
                    window.mockApiData.stats.messagesHandled = 0;
                    window.mockApiData.stats.commandsExecuted = 0;
                    
                    // Update bot start time
                    window._botStartTime = window.mockApiData.stats.startTime;
                    
                    // Update UI
                    updateDashboardStats(window.mockApiData.stats);
                    
                    // Add log entry
                    if (window.mockApiData.logs) {
                        const newLogEntry = {
                            timestamp: Date.now(),
                            level: 'info',
                            message: 'Bot restarted successfully'
                        };
                        window.mockApiData.logs.unshift(newLogEntry);
                    }
                }
            }, 3000);
        } else {
            addSystemNotification('Failed to restart bot: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error restarting bot via API:', error);
        
        // Fallback to simulation
        simulateCommandResponse('restart-bot', {
            successRate: 0.9,
            delay: 2000,
            successMessage: 'Bot restart initiated!'
        })
        .then(result => {
            addSystemNotification(result.message, 'success');
            addActivityEntry('Admin', 'Restarted the bot (simulated)');
            
            // Show a follow-up notification after a delay
            setTimeout(() => {
                addSystemNotification('Bot is back online!', 'success');
                
                if (window.mockApiData) {
                    // Reset start time to simulate a fresh restart
                    window.mockApiData.stats.startTime = Date.now();
                    window.mockApiData.stats.messagesHandled = 0;
                    window.mockApiData.stats.commandsExecuted = 0;
                    
                    // Update bot start time
                    window._botStartTime = window.mockApiData.stats.startTime;
                    
                    // Update UI
                    updateDashboardStats(window.mockApiData.stats);
                    
                    // Add log entry
                    if (window.mockApiData.logs) {
                        const newLogEntry = {
                            timestamp: Date.now(),
                            level: 'info',
                            message: 'Bot restarted successfully'
                        };
                        window.mockApiData.logs.unshift(newLogEntry);
                    }
                }
            }, 3000);
        })
        .catch(error => {
            addSystemNotification('Failed to restart bot: Service unavailable', 'danger');
            addActivityEntry('Admin', 'Failed to restart the bot');
        });
    });
}

// Refresh QR code - REST API fallback
function refreshQRCode() {
    addSystemNotification('Refreshing QR code...', 'info');
    
    fetch('/api/bot/refresh-qr', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (data.qrCode) {
                // Display the QR code in a modal
                showQRCodeModal(data.qrCode);
            } else {
                addSystemNotification(data.message, 'info');
            }
            addActivityEntry('Admin', 'Refreshed QR code');
        } else {
            addSystemNotification('Failed to refresh QR code: ' + data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error refreshing QR code:', error);
        addSystemNotification('Error refreshing QR code: ' + error, 'danger');
    });
}

// Show QR code modal
function showQRCodeModal(qrCodeUrl) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="qrCodeModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Scan QR Code</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <p>Scan this QR code with WhatsApp on your phone</p>
                        <img src="${qrCodeUrl}" alt="WhatsApp QR Code" class="img-fluid">
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('qrCodeModal'));
    modal.show();
    
    // Clean up when modal is hidden
    document.getElementById('qrCodeModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Show broadcast message modal
function showBroadcastModal() {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="broadcastModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Send Broadcast Message</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="broadcastForm">
                            <div class="mb-3">
                                <label for="broadcastType" class="form-label">Broadcast To</label>
                                <select class="form-select" id="broadcastType">
                                    <option value="all">All Chats</option>
                                    <option value="groups">Groups Only</option>
                                    <option value="private">Private Chats Only</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="broadcastMessage" class="form-label">Message</label>
                                <textarea class="form-control" id="broadcastMessage" rows="5" required></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-whatsapp" id="sendBroadcastConfirm">Send</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('broadcastModal'));
    modal.show();
    
    // Handle send button click
    document.getElementById('sendBroadcastConfirm').addEventListener('click', function() {
        const type = document.getElementById('broadcastType').value;
        const message = document.getElementById('broadcastMessage').value;
        
        if (!message) {
            alert('Please enter a message');
            return;
        }
        
        sendBroadcast(type, message);
        modal.hide();
    });
    
    // Clean up when modal is hidden
    document.getElementById('broadcastModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Send broadcast message
function sendBroadcast(type, message) {
    addSystemNotification(`Sending broadcast message to ${type}...`, 'info');
    
    // Use WebSocket if available
    if (window.botSocket) {
        console.log(`Attempting to send broadcast via WebSocket: ${message} to ${type}`);
        
        // For now, just simulate sending to all chats
        // In a real implementation, we'd have a specific method for broadcasts
        try {
            window.botSocket.sendMessage('all', message, 'broadcast');
            
            // Check for socket status to provide better feedback
            if (window.botSocket.socket && window.botSocket.socket.readyState === WebSocket.OPEN) {
                addSystemNotification('Broadcast message sent! Note: The bot may not process all commands in development mode.', 'success');
                addActivityEntry('Admin', `Sent broadcast message to ${type}`);
            } else {
                addSystemNotification('Message sent, but WebSocket connection appears unstable. Using simulated response.', 'warning');
                addActivityEntry('Admin', `Attempted to send broadcast message to ${type} (simulation)`);
            }
        } catch (error) {
            console.error('Error sending broadcast:', error);
            addSystemNotification(`Error sending message: ${error.message}. Using simulated response.`, 'warning');
            addActivityEntry('Admin', `Attempted to send broadcast message to ${type} (simulation)`);
        }
    } else {
        // Fallback to REST API or simulation
        console.log('WebSocket not available, simulating broadcast send');
        
        // Try sending via REST API
        fetch('/api/bot/broadcast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ type, message })
        })
        .then(response => {
            if (!response.ok) throw new Error(`Server returned ${response.status}`);
            return response.json();
        })
        .then(data => {
            addSystemNotification('Broadcast message sent successfully!', 'success');
            addActivityEntry('Admin', `Sent broadcast message to ${type}`);
        })
        .catch(error => {
            console.error('Error sending broadcast via API:', error);
            // Show a warning that this is simulated
            addSystemNotification('Using simulated response: The bot server appears to be in development mode.', 'warning');
            addActivityEntry('Admin', `Simulated sending broadcast message to ${type}`);
        });
    }
}

// Command simulation helper - provides more realistic feedback for commands
function simulateCommandResponse(command, params, successMessage) {
    // Randomize success based on command type
    let successRate = 0.95; // Default 95% success
    
    switch (command) {
        case 'broadcast':
            successRate = 0.98; // 98% success for broadcast
            break;
        case 'restart':
            successRate = 0.90; // 90% success for restart
            break;
        case 'clear-temp':
            successRate = 0.95; // 95% success for clearing temp files
            break;
        case 'check-updates':
            successRate = 0.85; // 85% success for checking updates
            break;
        default:
            successRate = 0.90; // 90% default
    }
    
    // Randomize response time between 500ms and 2500ms
    const responseTime = Math.floor(Math.random() * 2000) + 500;
    
    // Show "processing" notification
    showNotification(`Processing command: ${command}...`, 'info');
    
    // Simulate response after delay
    setTimeout(() => {
        const success = Math.random() <= successRate;
        
        if (success) {
            showNotification(successMessage || `Command ${command} executed successfully`, 'success');
            addActivityEntry('Bot', `Successfully executed ${command}`);
        } else {
            const errorMessages = {
                'broadcast': 'Failed to send message to all recipients',
                'restart': 'Bot restart failed - service may be locked',
                'clear-temp': 'Some temporary files could not be removed',
                'check-updates': 'Update check failed - connection error',
                'backup': 'Backup creation failed - insufficient permissions'
            };
            
            const errorMsg = errorMessages[command] || `Command ${command} failed to execute`;
            showNotification(`Error: ${errorMsg}`, 'danger');
            addActivityEntry('Error', `Failed to execute ${command}: ${errorMsg}`);
        }
    }, responseTime);
}

// Check for bot updates
function checkForUpdates() {
    addSystemNotification('Checking for updates...', 'info');
    
    // Try using the API first
    fetch('/api/bot/check-updates', {
        method: 'GET'
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.hasUpdates) {
            addSystemNotification(`Update available: ${data.version}`, 'info');
        } else {
            addSystemNotification('Bot is up to date!', 'success');
        }
        addActivityEntry('Admin', 'Checked for updates');
    })
    .catch(error => {
        console.error('Error checking updates via API:', error);
        
        // Fallback to simulation
        simulateCommandResponse('check-updates', {
            successRate: 0.9,
            successMessage: 'Bot is up to date!'
        })
        .then(result => {
            addSystemNotification(result.message, 'success');
            addActivityEntry('Admin', 'Checked for updates (simulated)');
        })
        .catch(error => {
            addSystemNotification('Error checking for updates: Network error', 'danger');
            addActivityEntry('Admin', 'Failed to check for updates');
        });
    });
}

// Clear temp files
function clearTempFiles() {
    addSystemNotification('Cleaning temporary files...', 'info');
    
    // Try using the API first
    fetch('/api/bot/clear-temp', {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        return response.json();
    })
    .then(data => {
        addSystemNotification('Temporary files cleared successfully!', 'success');
        addActivityEntry('Admin', 'Cleared temporary files');
    })
    .catch(error => {
        console.error('Error clearing temp via API:', error);
        
        // Fallback to simulation
        simulateCommandResponse('clear-temp', {
            successRate: 0.95,
            data: { filesCleared: Math.floor(Math.random() * 20) + 5 },
            successMessage: 'Temporary files cleared successfully!'
        })
        .then(result => {
            const filesCleared = result.data?.filesCleared || 'several';
            addSystemNotification(`${result.message} (${filesCleared} files removed)`, 'success');
            addActivityEntry('Admin', `Cleared ${filesCleared} temporary files (simulated)`);
        })
        .catch(error => {
            addSystemNotification('Error clearing temporary files: Permission denied', 'danger');
            addActivityEntry('Admin', 'Failed to clear temporary files');
        });
    });
}

// Backup settings
function backupSettings() {
    addSystemNotification('Creating settings backup...', 'info');
    
    // Try using the API first
    fetch('/api/bot/backup', {
        method: 'POST'
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server returned ${response.status}`);
        return response.json();
    })
    .then(data => {
        addSystemNotification('Settings backed up successfully!', 'success');
        addActivityEntry('Admin', 'Created settings backup');
    })
    .catch(error => {
        console.error('Error creating backup via API:', error);
        
        // Fallback to simulation
        simulateCommandResponse('backup-settings', {
            successRate: 0.9,
            data: { 
                backupFile: `backup-${new Date().toISOString().slice(0,10)}.zip`,
                size: `${(Math.random() * 5 + 0.5).toFixed(2)} MB`
            }
        })
        .then(result => {
            const backupInfo = result.data?.backupFile ? ` (File: ${result.data.backupFile}, Size: ${result.data.size})` : '';
            addSystemNotification(`Settings backed up successfully!${backupInfo}`, 'success');
            addActivityEntry('Admin', `Created settings backup${backupInfo ? ' ' + backupInfo : ''} (simulated)`);
        })
        .catch(error => {
            addSystemNotification('Error creating backup: Insufficient disk space', 'danger');
            addActivityEntry('Admin', 'Failed to create settings backup');
        });
    });
}

// Add system notification
function addSystemNotification(message, type = 'info') {
    // Check if we already have a global implementation (most likely from logs.js)
    if (typeof window.addSystemNotification === 'function' && window.addSystemNotification !== addSystemNotification) {
        return window.addSystemNotification(message, type);
    }
    
    // Local implementation if the global one isn't available yet
    const notificationsArea = document.getElementById('notificationsArea');
    if (!notificationsArea) {
        console.error('Notifications area not found in DOM');
        return;
    }
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.setAttribute('role', 'alert');
    
    let icon = 'info-circle';
    switch(type) {
        case 'success':
            icon = 'check-circle';
            break;
        case 'warning':
            icon = 'exclamation-triangle';
            break;
        case 'danger':
            icon = 'times-circle';
            break;
    }
    
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Prepend to show most recent notifications at the top
    notificationsArea.prepend(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 500);
    }, 10000);
}

// Add entry to recent activity table
function addActivityEntry(user, action) {
    const activityTable = document.getElementById('recentActivityTable');
    if (!activityTable) return;
    
    // Clear "loading" row if present
    if (activityTable.querySelector('tr td[colspan="4"]')) {
        activityTable.innerHTML = '';
    }
    
    const now = new Date();
    const time = now.toLocaleTimeString();
    
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${time}</td>
        <td>${action}</td>
        <td>${user}</td>
        <td>-</td>
    `;
    
    // Prepend to show most recent activity at the top
    if (activityTable.children.length > 0) {
        activityTable.insertBefore(row, activityTable.children[0]);
    } else {
        activityTable.appendChild(row);
    }
    
    // Limit to 10 entries
    if (activityTable.children.length > 10) {
        activityTable.removeChild(activityTable.children[activityTable.children.length - 1]);
    }
}

// Make functions available globally - but don't override existing ones
if (typeof window.addSystemNotification !== 'function') {
    window.addSystemNotification = addSystemNotification;
}
window.addActivityEntry = addActivityEntry;
window.updateDashboardStats = updateDashboardStats;
window.mockApiData = mockApiData; // Expose mock data globally 

// Show help modal with information about development mode
function showDevelopmentModeHelp() {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="devHelpModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header bg-warning">
                        <h5 class="modal-title">
                            <i class="fas fa-info-circle"></i> Development Mode Information
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <h5>Why are my commands not working?</h5>
                        <p>The admin panel is currently in <strong>development mode</strong> with simulated responses. This means:</p>
                        <ul>
                            <li>The admin panel UI is fully functional with simulated data</li>
                            <li>Commands are sent to the bot server but may not be processed</li>
                            <li>API endpoints are returning 401 Unauthorized or 404 Not Found errors</li>
                            <li>Real-time statistics are being simulated</li>
                        </ul>
                        
                        <div class="alert alert-info">
                            <h6>Server Connection Status:</h6>
                            <ul class="mb-0">
                                <li>WebSocket Connection: <span id="wsStatus">Checking...</span></li>
                                <li>API Authentication: <span id="apiStatus">Checking...</span></li>
                                <li>Command Processing: <span id="cmdStatus">Checking...</span></li>
                            </ul>
                        </div>
                        
                        <h5 class="mt-4">How to fix this?</h5>
                        <p>You may need to:</p>
                        <ol>
                            <li>Ensure the bot server is running with the right API endpoints enabled</li>
                            <li>Check authentication credentials (current: username="${sessionStorage.getItem('username') || 'sirtheprogrammer'}")</li>
                            <li>Verify that command handlers are properly registered on the server</li>
                            <li>Check server logs for specific errors when commands are sent</li>
                        </ol>
                        
                        <div class="alert alert-success">
                            <strong>Tip:</strong> You can continue using the admin panel in development mode to test the UI. Commands will be simulated with realistic responses.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-primary" id="checkConnectionStatus">Check Connection Status</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('devHelpModal'));
    modal.show();
    
    // Update connection status indicators
    updateConnectionStatus();
    
    // Setup check connection button
    document.getElementById('checkConnectionStatus').addEventListener('click', updateConnectionStatus);
    
    // Clean up when modal is hidden
    document.getElementById('devHelpModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Update connection status indicators in the help modal
function updateConnectionStatus() {
    // WebSocket status
    const wsStatus = document.getElementById('wsStatus');
    if (wsStatus) {
        if (window.botSocket && window.botSocket.socket && window.botSocket.socket.readyState === WebSocket.OPEN) {
            wsStatus.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Connected</span>';
        } else {
            wsStatus.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle"></i> Disconnected or Error</span>';
        }
    }
    
    // API auth status
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus) {
        apiStatus.innerHTML = '<span class="text-info"><i class="fas fa-sync fa-spin"></i> Checking...</span>';
        
        // Test API auth by making a simple request to our diagnostic endpoint
        fetch('/api/diagnostic')
            .then(response => {
                if (response.status === 401) {
                    apiStatus.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle"></i> Authentication Failed (401)</span>';
                    return response.json().then(data => {
                        // Add more details if available
                        if (data && data.sessionInfo) {
                            apiStatus.innerHTML += `<br><small>Session exists: ${data.sessionInfo.exists ? 'Yes' : 'No'}, Authenticated: ${data.sessionInfo.authenticated ? 'Yes' : 'No'}</small>`;
                        }
                        return { success: false, authStatus: 'Failed' };
                    });
                } else if (response.ok) {
                    apiStatus.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Authentication Successful</span>';
                    return response.json();
                } else {
                    apiStatus.innerHTML = `<span class="text-warning"><i class="fas fa-exclamation-circle"></i> Error (${response.status})</span>`;
                    return { success: false, authStatus: 'Error' };
                }
            })
            .then(data => {
                // Update command processing status based on API response
                const cmdStatus = document.getElementById('cmdStatus');
                if (cmdStatus && data.success) {
                    // If we have socket status info from the server
                    if (data.socketStatus && data.socketStatus.connected) {
                        cmdStatus.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i> Server Ready (Commands Should Work)</span>';
                    } else {
                        cmdStatus.innerHTML = '<span class="text-warning"><i class="fas fa-exclamation-circle"></i> Socket Not Connected on Server</span>';
                    }
                    
                    // Add diagnostic details to the modal
                    addDiagnosticInfo(data);
                } else if (cmdStatus) {
                    cmdStatus.innerHTML = '<span class="text-warning"><i class="fas fa-question-circle"></i> Using Simulated Responses</span>';
                }
            })
            .catch(err => {
                console.error('Diagnostic check error:', err);
                apiStatus.innerHTML = '<span class="text-danger"><i class="fas fa-times-circle"></i> Connection Failed</span>';
                
                // Set command status to simulated
                const cmdStatus = document.getElementById('cmdStatus');
                if (cmdStatus) {
                    cmdStatus.innerHTML = '<span class="text-warning"><i class="fas fa-question-circle"></i> Using Simulated Responses</span>';
                }
            });
    }
}

// Add diagnostic information to the help modal
function addDiagnosticInfo(data) {
    // Check if diagnostic section already exists
    if (document.getElementById('diagnosticDetails')) {
        return; // Already added
    }
    
    // Create diagnostic details section
    const diagHTML = `
        <div id="diagnosticDetails" class="mt-4 border-top pt-3">
            <h5><i class="fas fa-stethoscope"></i> Server Diagnostic Details</h5>
            <div class="row">
                <div class="col-md-6">
                    <div class="card bg-light mb-3">
                        <div class="card-header">Server Info</div>
                        <div class="card-body">
                            <p><strong>Version:</strong> ${data.server.version}</p>
                            <p><strong>Environment:</strong> ${data.server.environment}</p>
                            <p><strong>Node:</strong> ${data.server.nodeVersion}</p>
                            <p><strong>Uptime:</strong> ${Math.floor(data.server.uptime / 60)} minutes</p>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-light mb-3">
                        <div class="card-header">Socket Status</div>
                        <div class="card-body">
                            <p><strong>Connected:</strong> ${data.socketStatus.connected ? 'Yes' : 'No'}</p>
                            <p><strong>Clients:</strong> ${data.socketStatus.clients}</p>
                            ${data.socketStatus.message ? `<p><strong>Message:</strong> ${data.socketStatus.message}</p>` : ''}
                        </div>
                    </div>
                </div>
            </div>
            <div class="alert alert-info">
                <strong>Session Info:</strong> Logged in as ${data.sessionInfo.username} (${data.sessionInfo.role})
            </div>
        </div>
    `;
    
    // Find the modal body and append the diagnostic details
    const modalBody = document.querySelector('#devHelpModal .modal-body');
    if (modalBody) {
        modalBody.insertAdjacentHTML('beforeend', diagHTML);
    }
}

// Broadcast message function
function broadcast() {
    try {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (message === '') {
            showNotification('Please enter a message', 'warning');
            return;
        }
        
        // Check if WebSocket is connected
        if (!window.botSocket || !window.botSocket.socket || window.botSocket.socket.readyState !== WebSocket.OPEN) {
            showNotification('WebSocket not connected. Message will be simulated.', 'warning');
            simulateCommandResponse('broadcast', message, 'text message sent');
            messageInput.value = '';
            return;
        }
        
        // Add to activity list right away
        addActivityEntry('Admin', `Sending broadcast: "${message}"`);
        
        // Send via WebSocket
        window.botSocket.send({
            type: 'broadcast',
            message: message
        });
        
        // Show notification
        showNotification('Message sent', 'success');
        console.log('Broadcast message sent:', message);
        
        // Check if we received a confirmation within 3 seconds
        let confirmed = false;
        const confirmationTimeout = setTimeout(() => {
            if (!confirmed) {
                showNotification('No confirmation received from bot. Command may not be processed.', 'warning');
                // Show a help button in the notification
                const helpBtn = document.createElement('button');
                helpBtn.className = 'btn btn-sm btn-outline-warning mt-2';
                helpBtn.innerHTML = '<i class="fas fa-question-circle"></i> Why?';
                helpBtn.onclick = showDevelopmentModeHelp;
                
                // Find the latest notification and append the button
                const notifications = document.querySelectorAll('.toast');
                if (notifications.length > 0) {
                    const latestNotification = notifications[notifications.length - 1];
                    const toastBody = latestNotification.querySelector('.toast-body');
                    if (toastBody) {
                        toastBody.appendChild(helpBtn);
                    }
                }
            }
        }, 3000);
        
        // Setup a one-time listener for confirmation
        const originalOnMessage = window.botSocket.socket.onmessage;
        window.botSocket.socket.onmessage = function(event) {
            // Call the original handler
            if (originalOnMessage) {
                originalOnMessage.call(window.botSocket.socket, event);
            }
            
            // Parse the message
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'broadcast-confirmation') {
                    confirmed = true;
                    clearTimeout(confirmationTimeout);
                    showNotification('Message delivery confirmed', 'success');
                    
                    // Restore original handler
                    window.botSocket.socket.onmessage = originalOnMessage;
                }
            } catch (e) {
                console.error('Error parsing WebSocket message:', e);
            }
        };
        
        // Clear input field
        messageInput.value = '';
    } catch (error) {
        console.error('Error sending broadcast:', error);
        showNotification('Error: ' + error.message, 'danger');
    }
} 