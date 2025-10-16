// Logs Module for WhatsApp Bot Admin Panel

// Function to load the logs tab content
function initLogsTab() {
    console.log("Initializing logs tab");
    const logsContent = document.getElementById('logs');
    if (!logsContent) {
        console.error("Logs tab content not found");
        return;
    }

    const logsContainer = logsContent.querySelector('.logs-container');
    if (!logsContainer) {
        console.error("Logs container not found");
        return;
    }

    const clearLogsBtn = logsContent.querySelector('#clearLogs');
    const downloadLogsBtn = logsContent.querySelector('#downloadLogs');
    const filterLogInput = logsContent.querySelector('#filterLogs');

    // For testing purposes: Display some dummy logs if no logs are received
    setTimeout(() => {
        if (logsContainer.children.length === 0) {
            console.log("No logs received, displaying dummy logs");
            addLogMessage({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'Dummy log: Bot started successfully',
            });
            addLogMessage({
                timestamp: new Date().toISOString(),
                level: 'debug',
                message: 'Dummy log: Connected to WhatsApp',
            });
            addLogMessage({
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: 'Dummy log: Connection unstable',
            });
            addLogMessage({
                timestamp: new Date().toISOString(),
                level: 'error',
                message: 'Dummy log: Failed to send message',
            });
        }
    }, 2000);

    if (clearLogsBtn) {
        clearLogsBtn.addEventListener('click', () => {
            logsContainer.innerHTML = '';
            addSystemNotification('Logs cleared', 'info');
        });
    }

    if (downloadLogsBtn) {
        downloadLogsBtn.addEventListener('click', () => {
            const logsText = Array.from(logsContainer.children)
                .map(logEntry => logEntry.textContent)
                .join('\n');
            
            const blob = new Blob([logsText], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `bot-logs-${new Date().toISOString()}.txt`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            addSystemNotification('Logs downloaded', 'success');
        });
    }

    if (filterLogInput) {
        filterLogInput.addEventListener('input', () => {
            const filterValue = filterLogInput.value.toLowerCase();
            Array.from(logsContainer.children).forEach(logEntry => {
                const shouldShow = logEntry.textContent.toLowerCase().includes(filterValue);
                logEntry.style.display = shouldShow ? 'block' : 'none';
            });
        });
    }

    if (window.botSocket) {
        console.log("Setting up WebSocket log listener");
        window.botSocket.send('subscribe-logs');
    } else {
        console.error("WebSocket not available for logs");
    }

    // Mark tab as initialized
    logsContent.setAttribute('data-initialized', 'true');
    console.log("Logs tab initialized");
}

// Create the logs tab content
function createLogsTabContent(container) {
    console.log("Creating logs tab content");
    if (!container) {
        console.error("Container not found for logs tab content");
        container = document.querySelector('.content');
        if (!container) {
            console.error("Cannot find content container, creating a fallback");
            container = document.createElement('div');
            container.className = 'content';
            document.body.appendChild(container);
        }
    }

    const logsHtml = `
        <div id="logs" class="tab-content">
            <h2>Bot Logs</h2>
            <div class="logs-controls">
                <input type="text" id="filterLogs" placeholder="Filter logs...">
                <button id="clearLogs" class="btn btn-danger">Clear Logs</button>
                <button id="downloadLogs" class="btn btn-primary">Download Logs</button>
            </div>
            <div class="logs-container"></div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', logsHtml);
    console.log("Logs tab content created");
}

// Add a log message to the logs container
function addLogMessage(log) {
    console.log("Adding log message:", log);
    const logsContent = document.getElementById('logs');
    if (!logsContent) {
        console.error("Logs tab content not found when adding message");
        return;
    }

    const logsContainer = logsContent.querySelector('.logs-container');
    if (!logsContainer) {
        console.error("Logs container not found when adding message");
        return;
    }

    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${log.level}`;
    
    const timestamp = new Date(log.timestamp).toLocaleTimeString();
    logEntry.innerHTML = `<span class="log-time">[${timestamp}]</span> <span class="log-level">[${log.level.toUpperCase()}]</span> <span class="log-message">${log.message}</span>`;
    
    logsContainer.appendChild(logEntry);
    logsContainer.scrollTop = logsContainer.scrollHeight;
}

// Initialize event listeners for logs tab
function initLogEventListeners() {
    // Refresh logs button
    document.getElementById('refreshLogsBtn').addEventListener('click', function() {
        fetchLogs();
    });
    
    // Clear logs display
    document.getElementById('clearLogsBtn').addEventListener('click', function() {
        document.getElementById('logConsole').innerHTML = '';
        updateLogStatistics(); // Reset statistics
    });
    
    // Log search functionality
    document.getElementById('searchLogsBtn').addEventListener('click', function() {
        searchLogs();
    });
    
    // Log filters
    document.querySelectorAll('.log-filter').forEach(filter => {
        filter.addEventListener('click', function(e) {
            e.preventDefault();
            filterLogs(this.getAttribute('data-level'));
        });
    });
}

// Fetch logs from the server
function fetchLogs() {
    // In a real application, this would be an API call to get logs from the server
    // For demonstration, we'll just add a notification that logs were refreshed
    addLogMessage('info', 'Logs refreshed at ' + new Date().toLocaleTimeString());
    addSystemNotification('Logs refreshed successfully', 'success');
}

// Search logs functionality
function searchLogs() {
    const searchTerm = document.getElementById('searchLogsInput').value.toLowerCase();
    if (!searchTerm) {
        addSystemNotification('Please enter a search term', 'warning');
        return;
    }
    
    const commandsOnly = document.getElementById('searchCommandsOnly').checked;
    const errorsOnly = document.getElementById('searchErrorsOnly').checked;
    const messagesOnly = document.getElementById('searchMessagesOnly').checked;
    
    // Perform search and highlight results
    // This is simplified for demonstration
    const logLines = document.getElementById('logConsole').innerText.split('\n');
    let results = logLines.filter(line => {
        const lowerLine = line.toLowerCase();
        
        if (commandsOnly && !lowerLine.includes('command')) return false;
        if (errorsOnly && !lowerLine.includes('error')) return false;
        if (messagesOnly && !lowerLine.includes('message')) return false;
        
        return lowerLine.includes(searchTerm);
    });
    
    // Clear and show results
    const logConsole = document.getElementById('logConsole');
    const originalContent = logConsole.innerHTML;
    
    if (results.length === 0) {
        addSystemNotification('No logs found matching your search', 'info');
    } else {
        logConsole.innerHTML = '';
        results.forEach(line => {
            const highlightedLine = line.replace(
                new RegExp(searchTerm, 'gi'), 
                match => `<span class="bg-warning">${match}</span>`
            );
            logConsole.innerHTML += highlightedLine + '\n';
        });
        
        addSystemNotification(`Found ${results.length} matching log entries`, 'success');
        
        // Add a "Clear Search" button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'btn btn-sm btn-outline-secondary mt-2';
        clearBtn.innerHTML = '<i class="fas fa-times"></i> Clear Search';
        clearBtn.onclick = function() {
            logConsole.innerHTML = originalContent;
            this.remove();
        };
        
        logConsole.parentNode.insertBefore(clearBtn, logConsole.nextSibling);
    }
}

// Filter logs by level
function filterLogs(level) {
    // Update dropdown button text
    const dropdown = document.getElementById('logLevelDropdown');
    
    switch(level) {
        case 'info':
            dropdown.innerHTML = '<i class="fas fa-filter"></i> Info Only';
            break;
        case 'warning':
            dropdown.innerHTML = '<i class="fas fa-filter"></i> Warnings & Errors';
            break;
        case 'error':
            dropdown.innerHTML = '<i class="fas fa-filter"></i> Errors Only';
            break;
        default:
            dropdown.innerHTML = '<i class="fas fa-filter"></i> All Logs';
            break;
    }
    
    // Actual filtering would be implemented here
    addSystemNotification(`Logs filtered to show: ${level}`, 'info');
}

// Update log statistics counters
function updateLogStatistics() {
    const logContent = document.getElementById('logConsole').innerHTML;
    
    // Count instances of each log type
    const infoCount = (logContent.match(/\[INFO\]/g) || []).length;
    const warningCount = (logContent.match(/\[WARNING\]/g) || []).length;
    const errorCount = (logContent.match(/\[ERROR\]/g) || []).length;
    const successCount = (logContent.match(/\[SUCCESS\]/g) || []).length;
    
    // Update the UI
    document.getElementById('infoLogsCount').textContent = infoCount;
    document.getElementById('warningLogsCount').textContent = warningCount;
    document.getElementById('errorLogsCount').textContent = errorCount;
    document.getElementById('successLogsCount').textContent = successCount;
}

// Add a system notification to the dashboard
function addSystemNotification(message, type = 'info') {
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

// Make the notification function globally available
// This should be done only once and in logs.js, not in other modules
if (typeof window.addSystemNotification !== 'function') {
    window.addSystemNotification = addSystemNotification;
}

// Load some dummy logs for demonstration
function loadDummyLogs() {
    const dummyLogs = [
        { level: 'info', message: 'Bot started successfully' },
        { level: 'info', message: 'Connected to WhatsApp as: 255617200014:68@s.whatsapp.net' },
        { level: 'info', message: 'Owner number set as: 255617200014@s.whatsapp.net' },
        { level: 'info', message: 'Status auto-viewer module initialized' },
        { level: 'info', message: 'Status auto-reactor module initialized' },
        { level: 'info', message: 'Message received from: 255769411001@s.whatsapp.net' },
        { level: 'info', message: 'Command executed: .menu' },
        { level: 'warning', message: 'Connection timeout, retrying...' },
        { level: 'success', message: 'Reconnected successfully' },
        { level: 'info', message: 'Message received from: 255769411001@s.whatsapp.net' },
        { level: 'info', message: 'Command executed: .gemini mambo vipi weewe' },
        { level: 'info', message: 'API request sent to Gemini AI' },
        { level: 'info', message: 'Deleted message detected from user: 255769411001' },
        { level: 'info', message: 'Anti-delete notification sent to owner' },
        { level: 'error', message: 'Error processing audio: Failed to determine audio format' },
        { level: 'info', message: 'Message received from: 255769411001@s.whatsapp.net' },
        { level: 'info', message: 'Command executed: .gemini unaitwa Nani kipenzi' },
        { level: 'warning', message: 'Large message detected, processing may take longer' },
        { level: 'info', message: 'Message received from: 255769411001@s.whatsapp.net' },
        { level: 'info', message: 'User greeting: Hello' },
        { level: 'info', message: 'Message received from: 255769411001@s.whatsapp.net' },
        { level: 'info', message: 'User message: Mambo veep unaendeleaj' }
    ];
    
    // Clear existing logs
    document.getElementById('logConsole').innerHTML = '';
    
    // Add logs with a small delay between each to simulate real-time logging
    dummyLogs.forEach((log, index) => {
        setTimeout(() => {
            addLogMessage(log.level, log.message);
        }, index * 100);
    });
}

// Initialize logs tab when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    initLogsTab();
}); 