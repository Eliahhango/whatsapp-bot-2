// Commands Module for WhatsApp Bot Admin Panel

// Function to load the commands tab content
function initCommandsTab() {
    console.log("Initializing commands tab");
    const commandsContent = document.getElementById('commands');
    if (!commandsContent) {
        console.error("Commands tab content not found");
        return;
    }

    // For testing: Add mock commands if none are loaded
    setTimeout(() => {
        const commandsList = commandsContent.querySelector('.commands-list');
        if (commandsList && commandsList.children.length === 0) {
            console.log("No commands loaded, displaying mock commands");
            displayMockCommands();
        }
    }, 2000);

    // Setup event listeners for commands management
    const addCommandBtn = commandsContent.querySelector('#addCommandBtn');
    if (addCommandBtn) {
        addCommandBtn.addEventListener('click', () => {
            // Show command form
            const commandForm = document.getElementById('commandForm');
            commandForm.style.display = 'block';
            commandForm.reset();
            commandForm.dataset.mode = 'add';
        });
    }

    const commandForm = commandsContent.querySelector('#commandForm');
    if (commandForm) {
        commandForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(commandForm);
            const commandData = {};
            
            for (const [key, value] of formData.entries()) {
                // Handle checkboxes
                if (commandForm.elements[key].type === 'checkbox') {
                    commandData[key] = commandForm.elements[key].checked;
                } else {
                    commandData[key] = value;
                }
            }
            
            console.log("Saving command:", commandData);
            
            if (commandForm.dataset.mode === 'edit') {
                // Edit existing command
                if (window.botSocket) {
                    window.botSocket.send(JSON.stringify({
                        type: 'edit-command',
                        command: commandData
                    }));
                }
                
                // Update the command in the UI
                const commandId = commandForm.dataset.commandId;
                const commandItem = document.getElementById(`command-${commandId}`);
                if (commandItem) {
                    commandItem.querySelector('.command-name').textContent = commandData.name;
                    commandItem.querySelector('.command-description').textContent = commandData.description;
                }
                
                addSystemNotification('Command updated', 'success');
            } else {
                // Add new command
                if (window.botSocket) {
                    window.botSocket.send(JSON.stringify({
                        type: 'add-command',
                        command: commandData
                    }));
                }
                
                // Add the command to the UI
                addCommandToList(commandData);
                
                addSystemNotification('Command added', 'success');
            }
            
            // Hide the form
            commandForm.style.display = 'none';
        });
    }

    const cancelCommandBtn = commandsContent.querySelector('#cancelCommandBtn');
    if (cancelCommandBtn) {
        cancelCommandBtn.addEventListener('click', () => {
            // Hide command form
            const commandForm = document.getElementById('commandForm');
            commandForm.style.display = 'none';
        });
    }

    // Setup event delegation for command actions
    const commandsList = commandsContent.querySelector('.commands-list');
    if (commandsList) {
        commandsList.addEventListener('click', (e) => {
            // Edit command
            if (e.target.classList.contains('edit-command-btn')) {
                const commandItem = e.target.closest('.command-item');
                if (commandItem) {
                    editCommand(commandItem.dataset.id);
                }
            }
            
            // Delete command
            if (e.target.classList.contains('delete-command-btn')) {
                const commandItem = e.target.closest('.command-item');
                if (commandItem) {
                    deleteCommand(commandItem.dataset.id);
                }
            }
            
            // Toggle command status
            if (e.target.classList.contains('toggle-command-btn')) {
                const commandItem = e.target.closest('.command-item');
                if (commandItem) {
                    toggleCommand(commandItem.dataset.id);
                }
            }
        });
    }

    // Create command usage chart
    createCommandsChart();

    // Fetch commands via WebSocket
    if (window.botSocket) {
        window.botSocket.send('get-commands');
    } else {
        // For testing purposes, load mock commands
        displayMockCommands();
    }

    // Mark tab as initialized
    commandsContent.setAttribute('data-initialized', 'true');
    console.log("Commands tab initialized");
}

// Create the commands tab content
function createCommandsTabContent(container) {
    console.log("Creating commands tab content");
    if (!container) {
        console.error("Container not found for commands tab content");
        container = document.querySelector('.content');
        if (!container) {
            console.error("Cannot find content container, creating a fallback");
            container = document.createElement('div');
            container.className = 'content';
            document.body.appendChild(container);
        }
    }

    const commandsHtml = `
        <div id="commands" class="tab-content">
            <h2>Bot Commands</h2>
            
            <div class="row mb-4">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <h5 class="mb-0">Commands List</h5>
                            <button id="addCommandBtn" class="btn btn-primary btn-sm">
                                <i class="fas fa-plus"></i> Add Command
                            </button>
                        </div>
                        <div class="card-body">
                            <div class="commands-list">
                                <!-- Commands will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0">Command Usage</h5>
                        </div>
                        <div class="card-body">
                            <canvas id="commandsChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="commandForm" class="card mb-4" style="display: none;">
                <div class="card-header">
                    <h5 class="mb-0">Command Details</h5>
                </div>
                <div class="card-body">
                    <form>
                        <div class="mb-3">
                            <label for="commandName" class="form-label">Command Name</label>
                            <input type="text" class="form-control" id="commandName" name="name" required>
                        </div>
                        <div class="mb-3">
                            <label for="commandDescription" class="form-label">Description</label>
                            <textarea class="form-control" id="commandDescription" name="description" rows="2"></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="commandHandler" class="form-label">Handler Function</label>
                            <textarea class="form-control" id="commandHandler" name="handler" rows="4"></textarea>
                        </div>
                        <div class="mb-3">
                            <label for="commandCategory" class="form-label">Category</label>
                            <select class="form-control" id="commandCategory" name="category">
                                <option value="general">General</option>
                                <option value="admin">Admin</option>
                                <option value="fun">Fun</option>
                                <option value="utility">Utility</option>
                                <option value="moderation">Moderation</option>
                            </select>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="commandEnabled" name="enabled" checked>
                            <label class="form-check-label" for="commandEnabled">Enabled</label>
                        </div>
                        <div class="form-check mb-3">
                            <input class="form-check-input" type="checkbox" id="commandAdminOnly" name="adminOnly">
                            <label class="form-check-label" for="commandAdminOnly">Admin Only</label>
                        </div>
                        <div class="mb-3">
                            <label for="commandCooldown" class="form-label">Cooldown (seconds)</label>
                            <input type="number" class="form-control" id="commandCooldown" name="cooldown" value="5">
                        </div>
                        <div class="d-flex justify-content-end">
                            <button type="button" id="cancelCommandBtn" class="btn btn-secondary me-2">Cancel</button>
                            <button type="submit" class="btn btn-primary">Save Command</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', commandsHtml);
    console.log("Commands tab content created");
}

// Create commands usage chart
function createCommandsChart() {
    console.log("Creating commands chart");
    const canvas = document.getElementById('commandsChart');
    if (!canvas) {
        console.error("Commands chart canvas not found");
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (window.commandsChartInstance) {
        window.commandsChartInstance.destroy();
    }
    
    // For testing: Use dummy data
    const data = {
        labels: ['!help', '!ping', '!sticker', '!weather', '!translate'],
        datasets: [{
            label: 'Command Usage',
            data: [65, 42, 80, 24, 35],
            backgroundColor: [
                'rgba(75, 192, 192, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(255, 99, 132, 0.2)',
                'rgba(153, 102, 255, 0.2)'
            ],
            borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    window.commandsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    console.log("Commands chart created");
}

// Display mock commands for testing
function displayMockCommands() {
    console.log("Displaying mock commands");
    const mockCommands = [
        {
            id: 1,
            name: 'help',
            description: 'Display available commands',
            category: 'general',
            enabled: true,
            adminOnly: false,
            cooldown: 5,
            usage: 124
        },
        {
            id: 2,
            name: 'ping',
            description: 'Check bot response time',
            category: 'utility',
            enabled: true,
            adminOnly: false,
            cooldown: 3,
            usage: 87
        },
        {
            id: 3,
            name: 'sticker',
            description: 'Create a sticker from an image',
            category: 'fun',
            enabled: true,
            adminOnly: false,
            cooldown: 10,
            usage: 156
        },
        {
            id: 4,
            name: 'ban',
            description: 'Ban a user from the group',
            category: 'moderation',
            enabled: true,
            adminOnly: true,
            cooldown: 0,
            usage: 12
        },
        {
            id: 5,
            name: 'weather',
            description: 'Get weather information for a location',
            category: 'utility',
            enabled: true,
            adminOnly: false,
            cooldown: 15,
            usage: 53
        }
    ];
    
    const commandsList = document.querySelector('.commands-list');
    if (commandsList) {
        commandsList.innerHTML = '';
        mockCommands.forEach(command => {
            addCommandToList(command);
        });
    }
}

// Add a command to the commands list
function addCommandToList(command) {
    console.log("Adding command to list:", command);
    const commandsList = document.querySelector('.commands-list');
    if (!commandsList) {
        console.error("Commands list container not found");
        return;
    }
    
    const commandId = command.id || Date.now();
    const commandItem = document.createElement('div');
    commandItem.className = 'command-item card mb-2';
    commandItem.id = `command-${commandId}`;
    commandItem.dataset.id = commandId;
    
    commandItem.innerHTML = `
        <div class="card-body d-flex justify-content-between align-items-center">
            <div>
                <h5 class="command-name mb-1">!${command.name}</h5>
                <p class="command-description mb-0 text-muted small">${command.description}</p>
                <span class="badge bg-${getCategoryColor(command.category)}">${command.category}</span>
                ${command.adminOnly ? '<span class="badge bg-danger ms-1">Admin Only</span>' : ''}
                ${command.enabled ? '' : '<span class="badge bg-secondary ms-1">Disabled</span>'}
            </div>
            <div class="command-actions">
                <button class="btn btn-sm btn-outline-primary edit-command-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-${command.enabled ? 'warning' : 'success'} toggle-command-btn">
                    <i class="fas fa-${command.enabled ? 'power-off' : 'play'}"></i>
                </button>
                <button class="btn btn-sm btn-outline-danger delete-command-btn">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
    
    commandsList.appendChild(commandItem);
}

// Helper function to get category color
function getCategoryColor(category) {
    switch(category.toLowerCase()) {
        case 'general':
            return 'info';
        case 'admin':
            return 'danger';
        case 'fun':
            return 'success';
        case 'utility':
            return 'primary';
        case 'moderation':
            return 'warning';
        default:
            return 'secondary';
    }
}

// Edit a command
function editCommand(commandId) {
    console.log("Editing command:", commandId);
    // Find the command in the list
    const commandItem = document.getElementById(`command-${commandId}`);
    if (!commandItem) {
        console.error("Command item not found");
        return;
    }
    
    // Fill the form with command data
    const commandForm = document.getElementById('commandForm');
    commandForm.dataset.mode = 'edit';
    commandForm.dataset.commandId = commandId;
    
    // For testing, extract data from DOM
    const commandName = commandItem.querySelector('.command-name').textContent.replace('!', '');
    const commandDescription = commandItem.querySelector('.command-description').textContent;
    const commandCategory = commandItem.querySelector('.badge').textContent.toLowerCase();
    const commandAdminOnly = commandItem.innerHTML.includes('Admin Only');
    const commandEnabled = !commandItem.innerHTML.includes('Disabled');
    
    commandForm.elements.name.value = commandName;
    commandForm.elements.description.value = commandDescription;
    commandForm.elements.category.value = commandCategory;
    commandForm.elements.adminOnly.checked = commandAdminOnly;
    commandForm.elements.enabled.checked = commandEnabled;
    commandForm.elements.cooldown.value = 5; // Default
    commandForm.elements.handler.value = '// Command handler function\nfunction(message) {\n  // Your code here\n}';
    
    // Show the form
    commandForm.style.display = 'block';
}

// Delete a command
function deleteCommand(commandId) {
    console.log("Deleting command:", commandId);
    if (confirm('Are you sure you want to delete this command?')) {
        // Send delete request via WebSocket
        if (window.botSocket) {
            window.botSocket.send(JSON.stringify({
                type: 'delete-command',
                commandId: commandId
            }));
        }
        
        // Remove from UI
        const commandItem = document.getElementById(`command-${commandId}`);
        if (commandItem) {
            commandItem.remove();
        }
        
        addSystemNotification('Command deleted', 'success');
    }
}

// Toggle command enabled/disabled status
function toggleCommand(commandId) {
    console.log("Toggling command:", commandId);
    const commandItem = document.getElementById(`command-${commandId}`);
    if (!commandItem) {
        console.error("Command item not found");
        return;
    }
    
    const isCurrentlyEnabled = !commandItem.innerHTML.includes('Disabled');
    const newStatus = !isCurrentlyEnabled;
    
    // Send toggle request via WebSocket
    if (window.botSocket) {
        window.botSocket.send(JSON.stringify({
            type: 'toggle-command',
            commandId: commandId,
            enabled: newStatus
        }));
    }
    
    // Update UI
    const statusBadge = commandItem.querySelector('.badge.bg-secondary');
    const toggleBtn = commandItem.querySelector('.toggle-command-btn');
    
    if (newStatus) {
        // Command is now enabled
        if (statusBadge) {
            statusBadge.remove();
        }
        toggleBtn.classList.remove('btn-outline-success');
        toggleBtn.classList.add('btn-outline-warning');
        toggleBtn.innerHTML = '<i class="fas fa-power-off"></i>';
    } else {
        // Command is now disabled
        if (!statusBadge) {
            const badgeContainer = commandItem.querySelector('.badge').parentNode;
            const newBadge = document.createElement('span');
            newBadge.className = 'badge bg-secondary ms-1';
            newBadge.textContent = 'Disabled';
            badgeContainer.appendChild(newBadge);
        }
        toggleBtn.classList.remove('btn-outline-warning');
        toggleBtn.classList.add('btn-outline-success');
        toggleBtn.innerHTML = '<i class="fas fa-play"></i>';
    }
    
    addSystemNotification(`Command ${newStatus ? 'enabled' : 'disabled'}`, 'success');
}

// Initialize commands tab when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    initCommandsTab();
}); 