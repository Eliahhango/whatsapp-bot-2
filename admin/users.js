/**
 * Users and Groups Management for WhatsApp Bot Admin Panel
 * 
 * This module provides functionality to manage WhatsApp users and group chats.
 */

// Variables for storing user and group data
let users = [];
let groups = [];
let selectedChat = null;

// DOM elements
let usersList;
let groupsList;
let searchInput;
let tabContent;
let chatInfoPanel;
let messageInput;
let sendMessageBtn;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Skip if we're on the login page
    if (window.location.href.includes('login.html')) return;
    
    // Initialize the tab when Users tab is clicked
    document.querySelector('a[data-tab="users"]')?.addEventListener('click', initUsersTab);
    
    // Initialize WebSocket event listeners for real-time updates
    if (window.botSocket) {
        setupSocketListeners();
    }
});

// Set up WebSocket listeners
function setupSocketListeners() {
    // Listen for initial state data
    window.botSocket.on('stats', (stats) => {
        if (stats.user) {
            // Bot is connected, try to fetch contacts
            setTimeout(() => {
                fetchContacts();
            }, 2000);
        }
    });
}

// Initialize the Users tab
function initUsersTab() {
    if (document.getElementById('usersTabInitialized')) return;
    
    // Create the tab content if it doesn't exist
    const tabContent = document.getElementById('users') || createUsersTabContent();
    
    // Initialize references to DOM elements
    usersList = document.getElementById('usersList');
    groupsList = document.getElementById('groupsList');
    searchInput = document.getElementById('chatSearchInput');
    chatInfoPanel = document.getElementById('chatInfoPanel');
    messageInput = document.getElementById('messageInput');
    sendMessageBtn = document.getElementById('sendMessageBtn');
    
    // Add event listeners
    if (searchInput) {
        searchInput.addEventListener('input', filterChats);
    }
    
    if (sendMessageBtn && messageInput) {
        sendMessageBtn.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    // Mark as initialized
    if (tabContent) {
        tabContent.setAttribute('id', 'usersTabInitialized', 'true');
    }
    
    // Fetch contacts and groups
    fetchContacts();
    
    // Global access
    window.refreshContacts = fetchContacts;
    
    return tabContent;
}

// Create the users tab content
function createUsersTabContent() {
    const tabContentHtml = `
        <div id="usersTab" class="tab-content">
            <div class="container-fluid p-4">
                <h2>Users & Groups Management</h2>
                <p class="text-muted">Manage WhatsApp users and group chats</p>
                
                <div class="row mt-4">
                    <div class="col-md-4">
                        <div class="card">
                            <div class="card-header d-flex justify-content-between align-items-center">
                                <h5 class="mb-0">Chats</h5>
                                <button id="refreshContactsBtn" class="btn btn-sm btn-outline-primary" onclick="window.refreshContacts()">
                                    <i class="fas fa-sync"></i> Refresh
                                </button>
                            </div>
                            <div class="card-body">
                                <div class="input-group mb-3">
                                    <span class="input-group-text"><i class="fas fa-search"></i></span>
                                    <input type="text" id="chatSearchInput" class="form-control" placeholder="Search chats...">
                                </div>
                                
                                <ul class="nav nav-tabs" id="chatTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="users-tab" data-bs-toggle="tab" data-bs-target="#users-pane" type="button" role="tab">Users</button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="groups-tab" data-bs-toggle="tab" data-bs-target="#groups-pane" type="button" role="tab">Groups</button>
                                    </li>
                                </ul>
                                
                                <div class="tab-content mt-3" id="chatTabContent">
                                    <div class="tab-pane fade show active" id="users-pane" role="tabpanel">
                                        <div id="usersList" class="list-group chat-list">
                                            <div class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-2">Loading users...</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="tab-pane fade" id="groups-pane" role="tabpanel">
                                        <div id="groupsList" class="list-group chat-list">
                                            <div class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">Loading...</span>
                                                </div>
                                                <p class="mt-2">Loading groups...</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">Chat Information</h5>
                            </div>
                            <div class="card-body" id="chatInfoPanel">
                                <div class="text-center py-5">
                                    <i class="fas fa-user-circle fa-5x text-muted mb-3"></i>
                                    <h4>No chat selected</h4>
                                    <p class="text-muted">Select a user or group from the list to view details</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="card mt-3">
                            <div class="card-header">
                                <h5 class="mb-0">Send Message</h5>
                            </div>
                            <div class="card-body">
                                <div class="mb-3">
                                    <textarea id="messageInput" class="form-control" rows="3" placeholder="Type your message here..." disabled></textarea>
                                </div>
                                <div class="d-flex justify-content-end">
                                    <button id="sendMessageBtn" class="btn btn-primary" disabled>
                                        <i class="fas fa-paper-plane"></i> Send Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Find the content container or create a new one
    const contentContainer = document.querySelector('.content');
    if (!contentContainer) {
        console.error('Content container not found');
        // Create a fallback container
        const fallbackContainer = document.createElement('div');
        fallbackContainer.className = 'content';
        document.body.appendChild(fallbackContainer);
        fallbackContainer.innerHTML = tabContentHtml;
        return document.getElementById('usersTab');
    }
    
    // Add the tab content to the content area
    contentContainer.insertAdjacentHTML('beforeend', tabContentHtml);
    
    return document.getElementById('usersTab');
}

// Fetch contacts and groups from the bot
function fetchContacts() {
    showLoadingState();
    
    // If we have WebSocket, try to use it
    if (window.botSocket) {
        // For now, we'll simulate the data
        // In a real implementation, we would send a message to get contacts
        // and wait for a response with the data
        simulateFetchContacts();
    } else {
        // Fallback to REST API
        simulateFetchContacts();
    }
}

// Simulate fetching contacts (until we implement the real endpoint)
function simulateFetchContacts() {
    // Show loading state for 1.5 seconds
    setTimeout(() => {
        // Simulate users data
        users = [
            { id: '255617200014@s.whatsapp.net', name: 'You (Bot Owner)', isOwner: true, lastSeen: new Date() },
            { id: '255692267247@s.whatsapp.net', name: 'sirtheprogrammer', lastSeen: new Date(Date.now() - 3600000) },
            { id: '255769411001@s.whatsapp.net', name: 'Trition✌️', lastSeen: new Date(Date.now() - 7200000) },
            { id: '255769171386@s.whatsapp.net', name: 'Unknown Contact', lastSeen: null }
        ];
        
        // Simulate groups data
        groups = [
            { id: '120363397968792820@g.us', name: 'Bot Testing Group', participants: 5 },
            { id: '120363172997847444@g.us', name: 'BBC News', participants: 1000 }
        ];
        
        // Display the data
        displayUsersList();
        displayGroupsList();
        
        if (window.addSystemNotification) {
            window.addSystemNotification('Contacts loaded successfully', 'success');
        }
    }, 1500);
}

// Show loading state
function showLoadingState() {
    if (usersList) {
        usersList.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading users...</p>
            </div>
        `;
    }
    
    if (groupsList) {
        groupsList.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading groups...</p>
            </div>
        `;
    }
}

// Display users list
function displayUsersList() {
    if (!usersList) return;
    
    if (users.length === 0) {
        usersList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-user-slash fa-3x text-muted mb-3"></i>
                <p>No users found</p>
            </div>
        `;
        return;
    }
    
    usersList.innerHTML = '';
    
    // Sort users (owner first, then by name)
    users.sort((a, b) => {
        if (a.isOwner) return -1;
        if (b.isOwner) return 1;
        return (a.name || '').localeCompare(b.name || '');
    });
    
    // Add each user to the list
    users.forEach(user => {
        const userItem = document.createElement('button');
        userItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
        userItem.innerHTML = `
            <div>
                <i class="fas fa-user me-2"></i>
                ${user.name || 'Unknown'}
                ${user.isOwner ? '<span class="badge bg-primary ms-2">Owner</span>' : ''}
            </div>
            <span class="text-muted small">${user.lastSeen ? formatTime(user.lastSeen) : 'Unknown'}</span>
        `;
        
        userItem.addEventListener('click', () => selectChat(user, 'user'));
        usersList.appendChild(userItem);
    });
}

// Display groups list
function displayGroupsList() {
    if (!groupsList) return;
    
    if (groups.length === 0) {
        groupsList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-users-slash fa-3x text-muted mb-3"></i>
                <p>No groups found</p>
            </div>
        `;
        return;
    }
    
    groupsList.innerHTML = '';
    
    // Sort groups by name
    groups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    // Add each group to the list
    groups.forEach(group => {
        const groupItem = document.createElement('button');
        groupItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
        groupItem.innerHTML = `
            <div>
                <i class="fas fa-users me-2"></i>
                ${group.name || 'Unknown Group'}
            </div>
            <span class="badge bg-secondary">${group.participants} members</span>
        `;
        
        groupItem.addEventListener('click', () => selectChat(group, 'group'));
        groupsList.appendChild(groupItem);
    });
}

// Format time
function formatTime(time) {
    const now = new Date();
    const date = new Date(time);
    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    return date.toLocaleDateString();
}

// Select a chat
function selectChat(chat, type) {
    selectedChat = { ...chat, type };
    
    // Update UI
    if (messageInput) messageInput.disabled = false;
    if (sendMessageBtn) sendMessageBtn.disabled = false;
    
    // Update the chat info panel
    updateChatInfoPanel();
}

// Update chat info panel
function updateChatInfoPanel() {
    if (!chatInfoPanel || !selectedChat) return;
    
    let html = '';
    
    if (selectedChat.type === 'user') {
        html = `
            <div class="text-center mb-4">
                <i class="fas fa-user-circle fa-5x text-primary mb-3"></i>
                <h4>${selectedChat.name || 'Unknown'}</h4>
                <p class="text-muted">${selectedChat.id}</p>
                ${selectedChat.isOwner ? '<span class="badge bg-primary">Bot Owner</span>' : ''}
            </div>
            
            <div class="row">
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">Last Seen</h6>
                            <p class="card-text">${selectedChat.lastSeen ? new Date(selectedChat.lastSeen).toLocaleString() : 'Unknown'}</p>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-6 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h6 class="card-title">Status</h6>
                            <p class="card-text">${selectedChat.lastSeen ? 'Active' : 'Unknown'}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="d-flex justify-content-center mt-3">
                <button class="btn btn-sm btn-outline-primary me-2" onclick="blockUser('${selectedChat.id}')">
                    <i class="fas fa-ban"></i> Block
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteChat('${selectedChat.id}')">
                    <i class="fas fa-trash"></i> Delete Chat
                </button>
            </div>
        `;
    } else {
        html = `
            <div class="text-center mb-4">
                <i class="fas fa-users fa-5x text-primary mb-3"></i>
                <h4>${selectedChat.name || 'Unknown Group'}</h4>
                <p class="text-muted">${selectedChat.id}</p>
                <span class="badge bg-secondary">${selectedChat.participants} members</span>
            </div>
            
            <div class="card mb-3">
                <div class="card-header">
                    <h6 class="mb-0">Group Actions</h6>
                </div>
                <div class="card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="leaveGroup('${selectedChat.id}')">
                            <i class="fas fa-sign-out-alt"></i> Leave Group
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="getParticipants('${selectedChat.id}')">
                            <i class="fas fa-users"></i> View Participants
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteChat('${selectedChat.id}')">
                            <i class="fas fa-trash"></i> Delete Chat
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    chatInfoPanel.innerHTML = html;
}

// Filter chats based on search input
function filterChats() {
    const query = searchInput.value.toLowerCase();
    
    if (!query) {
        displayUsersList();
        displayGroupsList();
        return;
    }
    
    // Filter users
    const filteredUsers = users.filter(user => 
        (user.name && user.name.toLowerCase().includes(query)) || 
        user.id.toLowerCase().includes(query)
    );
    
    usersList.innerHTML = '';
    
    if (filteredUsers.length === 0) {
        usersList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p>No users found matching "${query}"</p>
            </div>
        `;
    } else {
        filteredUsers.forEach(user => {
            const userItem = document.createElement('button');
            userItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            userItem.innerHTML = `
                <div>
                    <i class="fas fa-user me-2"></i>
                    ${user.name || 'Unknown'}
                    ${user.isOwner ? '<span class="badge bg-primary ms-2">Owner</span>' : ''}
                </div>
                <span class="text-muted small">${user.lastSeen ? formatTime(user.lastSeen) : 'Unknown'}</span>
            `;
            
            userItem.addEventListener('click', () => selectChat(user, 'user'));
            usersList.appendChild(userItem);
        });
    }
    
    // Filter groups
    const filteredGroups = groups.filter(group => 
        (group.name && group.name.toLowerCase().includes(query)) || 
        group.id.toLowerCase().includes(query)
    );
    
    groupsList.innerHTML = '';
    
    if (filteredGroups.length === 0) {
        groupsList.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p>No groups found matching "${query}"</p>
            </div>
        `;
    } else {
        filteredGroups.forEach(group => {
            const groupItem = document.createElement('button');
            groupItem.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
            groupItem.innerHTML = `
                <div>
                    <i class="fas fa-users me-2"></i>
                    ${group.name || 'Unknown Group'}
                </div>
                <span class="badge bg-secondary">${group.participants} members</span>
            `;
            
            groupItem.addEventListener('click', () => selectChat(group, 'group'));
            groupsList.appendChild(groupItem);
        });
    }
}

// Send a message to the selected chat
function sendMessage() {
    if (!selectedChat || !messageInput.value.trim()) return;
    
    const message = messageInput.value.trim();
    
    // Show a loading state
    sendMessageBtn.disabled = true;
    sendMessageBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';
    
    // If we have WebSocket, use it
    if (window.botSocket) {
        window.botSocket.sendMessage(selectedChat.id, message);
        
        // Simulate a delay for the response
        setTimeout(() => {
            messageInput.value = '';
            sendMessageBtn.disabled = false;
            sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
            
            if (window.addSystemNotification) {
                window.addSystemNotification(`Message sent to ${selectedChat.name || selectedChat.id}`, 'success');
            }
            
            if (window.addActivityEntry) {
                window.addActivityEntry('Admin', `Sent message to ${selectedChat.name || selectedChat.id}`);
            }
        }, 1000);
    } else {
        // Fallback to REST API
        fetch('/api/bot/send-message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: selectedChat.id,
                message: message
            })
        })
        .then(response => response.json())
        .then(data => {
            messageInput.value = '';
            
            if (window.addSystemNotification) {
                window.addSystemNotification(`Message sent to ${selectedChat.name || selectedChat.id}`, 'success');
            }
            
            if (window.addActivityEntry) {
                window.addActivityEntry('Admin', `Sent message to ${selectedChat.name || selectedChat.id}`);
            }
        })
        .catch(error => {
            console.error('Error sending message:', error);
            
            if (window.addSystemNotification) {
                window.addSystemNotification(`Failed to send message: ${error}`, 'danger');
            }
        })
        .finally(() => {
            sendMessageBtn.disabled = false;
            sendMessageBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
        });
    }
}

// Block user (placeholder)
function blockUser(userId) {
    if (window.addSystemNotification) {
        window.addSystemNotification(`User blocking not implemented yet`, 'warning');
    }
    
    console.log('Block user:', userId);
}

// Delete chat (placeholder)
function deleteChat(chatId) {
    if (window.addSystemNotification) {
        window.addSystemNotification(`Chat deletion not implemented yet`, 'warning');
    }
    
    console.log('Delete chat:', chatId);
}

// Leave group (placeholder)
function leaveGroup(groupId) {
    if (window.addSystemNotification) {
        window.addSystemNotification(`Group leaving not implemented yet`, 'warning');
    }
    
    console.log('Leave group:', groupId);
}

// Get participants (placeholder)
function getParticipants(groupId) {
    if (window.addSystemNotification) {
        window.addSystemNotification(`Getting participants not implemented yet`, 'warning');
    }
    
    console.log('Get participants:', groupId);
}

// Make functions available globally
window.blockUser = blockUser;
window.deleteChat = deleteChat;
window.leaveGroup = leaveGroup;
window.getParticipants = getParticipants; 