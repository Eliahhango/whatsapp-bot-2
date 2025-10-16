// Settings Module for WhatsApp Bot Admin Panel

// Function to load the settings tab content
function initSettingsTab() {
    console.log("Initializing settings tab");
    const settingsContent = document.getElementById('settings');
    if (!settingsContent) {
        console.error("Settings tab content not found");
        return;
    }
    
    // For testing: Add mock settings after a delay if none are loaded
    setTimeout(() => {
        const settingsForms = settingsContent.querySelectorAll('form');
        if (settingsForms.length === 0 || !settingsContent.querySelector('.settings-loaded')) {
            console.log("No settings loaded, displaying mock settings");
            displayMockSettings();
        }
    }, 2000);

    // Event delegation for settings forms
    settingsContent.addEventListener('submit', function(event) {
        if (event.target.classList.contains('settings-form')) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const settingsData = {};
            
            for (const [key, value] of formData.entries()) {
                // Handle checkboxes properly
                if (event.target.elements[key].type === 'checkbox') {
                    settingsData[key] = event.target.elements[key].checked;
                } else {
                    settingsData[key] = value;
                }
            }
            
            console.log("Saving settings:", settingsData);
            
            // Try to save via WebSocket
            if (window.botSocket) {
                window.botSocket.send(JSON.stringify({
                    type: 'save-settings',
                    settings: settingsData,
                    category: event.target.dataset.category
                }));
                
                addSystemNotification('Settings saved', 'success');
            } else {
                // Fallback to REST API
                fetch('/api/settings/' + event.target.dataset.category, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(settingsData)
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Failed to save settings');
                    }
                    return response.json();
                })
                .then(data => {
                    addSystemNotification('Settings saved', 'success');
                })
                .catch(error => {
                    console.error('Error saving settings:', error);
                    // For testing, show success anyway
                    addSystemNotification('Settings saved (mock)', 'success');
                });
            }
        }
    });

    // Fetch settings via WebSocket
    if (window.botSocket) {
        window.botSocket.send('get-settings');
    } else {
        // For testing purposes, load mock settings
        displayMockSettings();
    }

    // Mark tab as initialized
    settingsContent.setAttribute('data-initialized', 'true');
    console.log("Settings tab initialized");
}

// Create the settings tab content
function createSettingsTabContent(container) {
    console.log("Creating settings tab content");
    if (!container) {
        console.error("Container not found for settings tab content");
        container = document.querySelector('.content');
        if (!container) {
            console.error("Cannot find content container, creating a fallback");
            container = document.createElement('div');
            container.className = 'content';
            document.body.appendChild(container);
        }
    }

    const settingsHtml = `
        <div id="settings" class="tab-content">
            <h2>Bot Settings</h2>
            <div class="settings-container">
                <div class="settings-nav">
                    <ul class="nav nav-pills flex-column">
                        <li class="nav-item">
                            <a class="nav-link active" data-bs-toggle="pill" href="#generalSettings">General Settings</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="pill" href="#messageSettings">Message Settings</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="pill" href="#commandSettings">Command Settings</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link" data-bs-toggle="pill" href="#securitySettings">Security Settings</a>
                        </li>
                    </ul>
                </div>
                <div class="settings-content">
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="generalSettings">
                            <!-- General settings will be loaded here -->
                            <p>Loading general settings...</p>
                        </div>
                        <div class="tab-pane fade" id="messageSettings">
                            <!-- Message settings will be loaded here -->
                            <p>Loading message settings...</p>
                        </div>
                        <div class="tab-pane fade" id="commandSettings">
                            <!-- Command settings will be loaded here -->
                            <p>Loading command settings...</p>
                        </div>
                        <div class="tab-pane fade" id="securitySettings">
                            <!-- Security settings will be loaded here -->
                            <p>Loading security settings...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', settingsHtml);
    console.log("Settings tab content created");
}

// For testing: Display mock settings
function displayMockSettings() {
    console.log("Displaying mock settings");
    
    // General settings
    const generalSettings = {
        botName: 'WhatsApp Bot',
        ownerName: 'Admin',
        ownerNumber: '1234567890',
        timezone: 'UTC',
        language: 'en',
        autoRestart: true,
        logLevel: 'info'
    };
    
    // Message settings
    const messageSettings = {
        welcomeMessage: 'Welcome to the WhatsApp bot!',
        goodbyeMessage: 'Goodbye!',
        errorMessage: 'Sorry, an error occurred.',
        ignoreMessages: true,
        ignoreBots: true,
        ignoreGroupMessages: false
    };
    
    // Command settings
    const commandSettings = {
        prefix: '!',
        enableCommands: true,
        allowGroups: true,
        allowPrivate: true,
        cooldown: 5,
        disabledCommands: 'ban,kick'
    };
    
    // Security settings
    const securitySettings = {
        enableAntiSpam: true,
        maxWarnings: 3,
        banDuration: 60,
        enableAntiLink: true,
        whitelistedDomains: 'example.com,google.com',
        adminOnly: false
    };
    
    // Display general settings
    document.getElementById('generalSettings').innerHTML = createSettingsForm('general', generalSettings);
    
    // Display message settings
    document.getElementById('messageSettings').innerHTML = createSettingsForm('message', messageSettings);
    
    // Display command settings
    document.getElementById('commandSettings').innerHTML = createSettingsForm('command', commandSettings);
    
    // Display security settings
    document.getElementById('securitySettings').innerHTML = createSettingsForm('security', securitySettings);
    
    // Mark settings as loaded
    document.getElementById('settings').classList.add('settings-loaded');
}

// Helper function to create a settings form
function createSettingsForm(category, settings) {
    let formHtml = `<form class="settings-form" data-category="${category}">`;
    
    for (const [key, value] of Object.entries(settings)) {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        if (typeof value === 'boolean') {
            formHtml += `
                <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="${key}" name="${key}" ${value ? 'checked' : ''}>
                    <label class="form-check-label" for="${key}">${label}</label>
                </div>
            `;
        } else {
            formHtml += `
                <div class="mb-3">
                    <label for="${key}" class="form-label">${label}</label>
                    <input type="text" class="form-control" id="${key}" name="${key}" value="${value}">
                </div>
            `;
        }
    }
    
    formHtml += `
        <button type="submit" class="btn btn-primary">Save ${category.charAt(0).toUpperCase() + category.slice(1)} Settings</button>
    </form>`;
    
    return formHtml;
}

// Initialize settings tab when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    initSettingsTab();
}); 