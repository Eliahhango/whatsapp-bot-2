// Admin Panel Script - Combines all modules

// When document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin panel initializing...");
    
    // Check if WebSocket interface is available
    if (!window.botSocket) {
        console.error("WebSocket API not found. Make sure websocket.js is loaded before admin.js");
        showErrorModal("Error initializing admin panel: WebSocket API not found. Make sure websocket.js is loaded before admin.js");
        return;
    }
    
    try {
        // Initialize the dashboard first
        initializeDashboard().then(() => {
            console.log("Dashboard initialized, proceeding with other modules");
            // Initialize tabs content
            initializeTabs();
            // Setup global event handlers
            setupGlobalEvents();
        }).catch(error => {
            console.error("Error initializing dashboard:", error);
            showErrorModal("Error initializing dashboard: " + error.message);
        });
    } catch (error) {
        console.error("Critical error during admin panel initialization:", error);
        showErrorModal("Critical error during initialization: " + error.message);
    }
});

// Initialize the dashboard
function initializeDashboard() {
    return new Promise((resolve, reject) => {
        try {
            // Create the dashboard tab content if it doesn't exist
            const dashboardTab = document.getElementById('dashboard');
            if (!dashboardTab.getAttribute('data-initialized')) {
                dashboardTab.setAttribute('data-initialized', 'true');
                console.log("Dashboard initialized");
            }
            
            // Add system notification for successful initialization
            if (typeof addSystemNotification === 'function') {
                addSystemNotification('Admin panel initialized successfully', 'success');
            }
            
            resolve();
        } catch (error) {
            reject(error);
        }
    });
}

// Initialize all tab content
function initializeTabs() {
    console.log("Initializing all tab content...");
    const contentContainer = document.querySelector('.content');
    if (!contentContainer) {
        console.error("Content container not found");
        return;
    }
    
    // Create mock tab initialization functions if they don't exist
    // This ensures tabs can be displayed even if their JS modules aren't fully loaded
    
    if (typeof initLogsTab !== 'function') {
        console.warn("Creating mock initLogsTab function");
        window.initLogsTab = function() {
            console.log("Mock logs tab initialization");
            document.getElementById('logs').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Bot logs module is not fully loaded or connected. Please check your connection and refresh the page.
                </div>
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-list-alt"></i> Bot Logs
                    </div>
                    <div class="card-body">
                        <div id="logConsole">
                            [INFO] Log module not connected to server.
                            [INFO] Please check your connection and refresh the page.
                        </div>
                    </div>
                </div>
            `;
        };
    }
    
    if (typeof initSettingsTab !== 'function') {
        console.warn("Creating mock initSettingsTab function");
        window.initSettingsTab = function() {
            console.log("Mock settings tab initialization");
            document.getElementById('settings').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Bot settings module is not fully loaded or connected. Please check your connection and refresh the page.
                </div>
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-cog"></i> Bot Settings
                    </div>
                    <div class="card-body">
                        <p>Settings module not available. Please check your connection and refresh the page.</p>
                    </div>
                </div>
            `;
        };
    }
    
    if (typeof initCommandsTab !== 'function') {
        console.warn("Creating mock initCommandsTab function");
        window.initCommandsTab = function() {
            console.log("Mock commands tab initialization");
            document.getElementById('commands').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Bot commands module is not fully loaded or connected. Please check your connection and refresh the page.
                </div>
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-terminal"></i> Bot Commands
                    </div>
                    <div class="card-body">
                        <p>Commands module not available. Please check your connection and refresh the page.</p>
                    </div>
                </div>
            `;
        };
    }
    
    if (typeof initUsersTab !== 'function') {
        console.warn("Creating mock initUsersTab function");
        window.initUsersTab = function() {
            console.log("Mock users tab initialization");
            document.getElementById('users').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Users & Groups module is not fully loaded or connected. Please check your connection and refresh the page.
                </div>
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-users"></i> Users & Groups
                    </div>
                    <div class="card-body">
                        <p>Users module not available. Please check your connection and refresh the page.</p>
                    </div>
                </div>
            `;
        };
    }
    
    if (typeof initAntiDeleteTab !== 'function') {
        console.warn("Creating mock initAntiDeleteTab function");
        window.initAntiDeleteTab = function() {
            console.log("Mock anti-delete tab initialization");
            document.getElementById('antidelete').innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i> 
                    Anti-Delete module is not fully loaded or connected. Please check your connection and refresh the page.
                </div>
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-trash-restore"></i> Anti-Delete
                    </div>
                    <div class="card-body">
                        <p>Anti-Delete module not available. Please check your connection and refresh the page.</p>
                    </div>
                </div>
            `;
        };
    }
    
    // Initialize logs tab content
    if (typeof createLogsTabContent === 'function') {
        createLogsTabContent(contentContainer);
    } else {
        console.warn("Logs module not found, creating basic content");
        const logsTab = document.getElementById('logs');
        if (logsTab && !logsTab.innerHTML.trim()) {
            logsTab.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-list-alt"></i> Bot Logs
                    </div>
                    <div class="card-body">
                        <div id="logConsole">
                            [INFO] Waiting for log data...
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // Initialize settings tab content
    if (typeof createSettingsTabContent === 'function') {
        createSettingsTabContent(contentContainer);
    } else {
        console.warn("Settings module not found, creating basic content");
        const settingsTab = document.getElementById('settings');
        if (settingsTab && !settingsTab.innerHTML.trim()) {
            settingsTab.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-cog"></i> Bot Settings
                    </div>
                    <div class="card-body">
                        <p>Waiting for settings data...</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Initialize commands tab content
    if (typeof createCommandsTabContent === 'function') {
        createCommandsTabContent(contentContainer);
    } else {
        console.warn("Commands module not found, creating basic content");
        const commandsTab = document.getElementById('commands');
        if (commandsTab && !commandsTab.innerHTML.trim()) {
            commandsTab.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-terminal"></i> Bot Commands
                    </div>
                    <div class="card-body">
                        <p>Waiting for commands data...</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Initialize users tab content
    if (typeof createUsersTabContent === 'function') {
        createUsersTabContent(contentContainer);
    } else {
        console.warn("Users module not found, creating basic content");
        const usersTab = document.getElementById('users');
        if (usersTab && !usersTab.innerHTML.trim()) {
            usersTab.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-users"></i> Users & Groups
                    </div>
                    <div class="card-body">
                        <p>Waiting for users data...</p>
                    </div>
                </div>
            `;
        }
    }
    
    // Initialize anti-delete tab content
    if (typeof createAntiDeleteTabContent === 'function') {
        createAntiDeleteTabContent(contentContainer);
    } else {
        console.warn("Anti-delete module not found, creating basic content");
        const antiDeleteTab = document.getElementById('antidelete');
        if (antiDeleteTab && !antiDeleteTab.innerHTML.trim()) {
            antiDeleteTab.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <i class="fas fa-trash-restore"></i> Anti-Delete
                    </div>
                    <div class="card-body">
                        <p>Waiting for anti-delete data...</p>
                    </div>
                </div>
            `;
        }
    }
    
    console.log("All tab content initialized");
}

// Setup global event handlers
function setupGlobalEvents() {
    // Handle sidebar tab switching
    document.querySelectorAll('.sidebar-menu a[data-tab]').forEach(tabLink => {
        tabLink.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active class on sidebar
            document.querySelectorAll('.sidebar-menu a').forEach(link => {
                link.classList.remove('active');
            });
            this.classList.add('active');
            
            // Get the tab ID
            const tabId = this.getAttribute('data-tab');
            console.log(`Switching to tab: ${tabId}`);
            
            // Hide all tab content and show the selected one
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            const selectedTab = document.getElementById(tabId);
            if (selectedTab) {
                selectedTab.classList.add('active');
                
                // Initialize the tab if not already initialized
                switch(tabId) {
                    case 'dashboard':
                        // Dashboard is already initialized
                        break;
                    case 'logs':
                        if (typeof initLogsTab === 'function') {
                            console.log("Initializing logs tab");
                            initLogsTab();
                            addSystemNotification('Logs tab loaded', 'info');
                        } else {
                            console.error("Logs module not found");
                            showErrorModal("Logs module not found. Make sure logs.js is loaded properly.");
                        }
                        break;
                    case 'settings':
                        if (typeof initSettingsTab === 'function') {
                            console.log("Initializing settings tab");
                            initSettingsTab();
                            addSystemNotification('Settings tab loaded', 'info');
                        } else {
                            console.error("Settings module not found");
                            showErrorModal("Settings module not found. Make sure settings.js is loaded properly.");
                        }
                        break;
                    case 'commands':
                        if (typeof initCommandsTab === 'function') {
                            console.log("Initializing commands tab");
                            initCommandsTab();
                            addSystemNotification('Commands tab loaded', 'info');
                        } else {
                            console.error("Commands module not found");
                            showErrorModal("Commands module not found. Make sure commands.js is loaded properly.");
                        }
                        break;
                    case 'users':
                        if (typeof initUsersTab === 'function') {
                            console.log("Initializing users tab");
                            initUsersTab();
                            addSystemNotification('Users tab loaded', 'info');
                        } else {
                            console.error("Users module not found");
                            showErrorModal("Users module not found. Make sure users.js is loaded properly.");
                        }
                        break;
                    case 'antidelete':
                        if (typeof initAntiDeleteTab === 'function') {
                            console.log("Initializing anti-delete tab");
                            initAntiDeleteTab();
                            addSystemNotification('Anti-Delete tab loaded', 'info');
                        } else {
                            console.error("Anti-delete module not found");
                            showErrorModal("Anti-delete module not found. Make sure antidelete.js is loaded properly.");
                        }
                        break;
                    default:
                        console.error(`Unknown tab: ${tabId}`);
                }
            } else {
                console.error(`Tab content for ${tabId} not found`);
                showErrorModal(`Tab content for ${tabId} not found. Please check your HTML structure.`);
            }
        });
    });
    
    // Set up logout button
    document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
        e.preventDefault();
        sessionStorage.removeItem('authenticated');
        window.location.reload();
    });
    
    console.log("Global event handlers set up");
}

// Show error modal
function showErrorModal(message) {
    const modalHTML = `
        <div class="modal fade" id="errorModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">Error</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <p>Please refresh the page and try again.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-primary" onclick="location.reload()">Refresh</button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">OK</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
}

// Function to load scripts in sequence
function loadScripts(scriptUrls) {
    return scriptUrls.reduce((promise, scriptUrl) => {
        return promise.then(() => loadScript(scriptUrl));
    }, Promise.resolve());
}

// Function to load a single script
function loadScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        
        script.onload = () => {
            console.log(`Script loaded: ${url}`);
            resolve();
        };
        
        script.onerror = () => {
            console.error(`Error loading script: ${url}`);
            reject(new Error(`Failed to load script: ${url}`));
        };
        
        document.body.appendChild(script);
    });
}

// Setup real-time updates from WebSocket
function setupRealtimeUpdates() {
    // Handle connection status
    window.botSocket.on('connect', () => {
        console.log('Connected to bot server');
        if (typeof addSystemNotification === 'function') {
            addSystemNotification('Connected to bot server', 'success');
        }
    });
    
    window.botSocket.on('disconnect', () => {
        console.log('Disconnected from bot server');
        if (typeof addSystemNotification === 'function') {
            addSystemNotification('Disconnected from bot server. Attempting to reconnect...', 'warning');
        }
    });
    
    // Handle stats updates
    window.botSocket.on('stats', (stats) => {
        if (typeof updateDashboardStats === 'function') {
            updateDashboardStats(stats);
        }
    });
    
    // Handle log updates
    window.botSocket.on('log', (log) => {
        if (typeof addLogMessage === 'function') {
            addLogMessage(log.level, log.message);
        }
    });
    
    // Handle status updates
    window.botSocket.on('status', (data) => {
        const statusBadge = document.querySelector('#botStatusDropdown .badge');
        if (statusBadge) {
            if (data.status === 'connected') {
                statusBadge.className = 'badge bg-success';
                statusBadge.textContent = 'Online';
            } else if (data.status === 'connecting') {
                statusBadge.className = 'badge bg-warning';
                statusBadge.textContent = 'Connecting';
            } else {
                statusBadge.className = 'badge bg-danger';
                statusBadge.textContent = 'Offline';
            }
        }
    });
    
    // Handle QR code updates
    window.botSocket.on('qr', (data) => {
        if (data.qrCode) {
            showQRCodeModal(data.qrCode);
        }
    });
    
    // Handle deleted message updates
    window.botSocket.on('deleted-message', (message) => {
        if (typeof handleDeletedMessage === 'function') {
            handleDeletedMessage(message);
        }
        
        if (typeof addSystemNotification === 'function') {
            addSystemNotification('New deleted message detected', 'info');
        }
    });
    
    // Handle errors
    window.botSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
        if (typeof addSystemNotification === 'function') {
            addSystemNotification(`Error: ${error.message}`, 'danger');
        }
    });
}

// Show QR code modal
function showQRCodeModal(qrCode) {
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
                        <img src="data:image/png;base64,${qrCode}" alt="WhatsApp QR Code" class="img-fluid">
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