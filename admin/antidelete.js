// Anti-Delete Module for WhatsApp Bot Admin Panel

// Function to load the anti-delete tab content
function initAntiDeleteTab() {
    // Inject the anti-delete tab content into index.html
    const antiDeleteTabHTML = `
        <div class="tab-content" id="antidelete">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <h4>Anti-Delete Management</h4>
                <div>
                    <button class="btn btn-sm btn-whatsapp" id="refreshTrashBtn">
                        <i class="fas fa-sync-alt"></i> Refresh Trash
                    </button>
                    <button class="btn btn-sm btn-outline-secondary" id="clearTrashBtn">
                        <i class="fas fa-trash"></i> Clear Trash
                    </button>
                </div>
            </div>
            
            <div class="row">
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <i class="fas fa-trash-restore"></i> Anti-Delete Status
                        </div>
                        <div class="card-body">
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="antiDeleteEnabled" checked>
                                <label class="form-check-label" for="antiDeleteEnabled">Enable Anti-Delete</label>
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="antiDeleteAllChats" checked>
                                <label class="form-check-label" for="antiDeleteAllChats">Monitor All Chats</label>
                            </div>
                            <div class="mb-3">
                                <label for="storageTimeMinutes" class="form-label">Storage Time (minutes)</label>
                                <input type="number" class="form-control" id="storageTimeMinutes" value="60">
                            </div>
                            <div class="mb-3">
                                <label for="maxStoredMessages" class="form-label">Max Stored Messages</label>
                                <input type="number" class="form-control" id="maxStoredMessages" value="100">
                            </div>
                            <button class="btn btn-whatsapp w-100" id="saveAntiDeleteSettings">
                                <i class="fas fa-save"></i> Save Settings
                            </button>
                        </div>
                    </div>
                    
                    <div class="card mt-4">
                        <div class="card-header">
                            <i class="fas fa-chart-pie"></i> Trash Statistics
                        </div>
                        <div class="card-body">
                            <div class="d-flex justify-content-between mb-2">
                                <span>Total Deleted Messages:</span>
                                <strong id="totalDeletedCount">0</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Text Messages:</span>
                                <strong id="textDeletedCount">0</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Media Messages:</span>
                                <strong id="mediaDeletedCount">0</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Groups:</span>
                                <strong id="groupDeletedCount">0</strong>
                            </div>
                            <div class="d-flex justify-content-between mb-2">
                                <span>Private Chats:</span>
                                <strong id="privateDeletedCount">0</strong>
                            </div>
                            <hr>
                            <h6>Top Deleters</h6>
                            <div id="topDeletersContainer">
                                <p class="text-muted">No data available</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <i class="fas fa-trash-alt"></i> Trash Content
                                </div>
                                <div class="input-group input-group-sm" style="width: 300px;">
                                    <input type="text" class="form-control" placeholder="Search trash..." id="searchTrash">
                                    <button class="btn btn-outline-secondary" type="button" id="searchTrashBtn">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="card-body p-0">
                            <div class="list-group list-group-flush" id="trashContentList">
                                <!-- Trash content will be loaded here -->
                                <div class="text-center p-3">
                                    <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    Loading trash content...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.querySelector('.content').insertAdjacentHTML('beforeend', antiDeleteTabHTML);
    
    // Initialize event listeners
    initAntiDeleteEventListeners();
    
    // Load trash statistics and content
    loadTrashStats();
    loadTrashContent();
}

// Initialize event listeners for the anti-delete tab
function initAntiDeleteEventListeners() {
    // Save anti-delete settings
    document.getElementById('saveAntiDeleteSettings').addEventListener('click', function() {
        saveAntiDeleteSettings();
    });
    
    // Refresh trash button
    document.getElementById('refreshTrashBtn').addEventListener('click', function() {
        loadTrashStats();
        loadTrashContent();
    });
    
    // Clear trash button
    document.getElementById('clearTrashBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all deleted messages from trash? This action cannot be undone.')) {
            clearTrash();
        }
    });
    
    // Search trash
    document.getElementById('searchTrashBtn').addEventListener('click', function() {
        searchTrash();
    });
    
    document.getElementById('searchTrash').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchTrash();
        }
    });
}

// Load trash statistics
function loadTrashStats() {
    // In a real application, this would fetch stats from the server
    // For demonstration, we'll use dummy data
    
    // Simulate API call delay
    setTimeout(() => {
        // Update trash statistics
        document.getElementById('totalDeletedCount').textContent = '26';
        document.getElementById('textDeletedCount').textContent = '18';
        document.getElementById('mediaDeletedCount').textContent = '8';
        document.getElementById('groupDeletedCount').textContent = '10';
        document.getElementById('privateDeletedCount').textContent = '16';
        
        // Update top deleters
        const topDeleters = [
            { name: 'John Doe', count: 8 },
            { name: 'Alice Smith', count: 5 },
            { name: 'Bob Johnson', count: 4 },
            { name: 'Jane Williams', count: 3 }
        ];
        
        const topDeletersContainer = document.getElementById('topDeletersContainer');
        topDeletersContainer.innerHTML = '';
        
        topDeleters.forEach(deleter => {
            const deleterDiv = document.createElement('div');
            deleterDiv.className = 'd-flex justify-content-between mb-1';
            deleterDiv.innerHTML = `
                <span class="text-truncate">${deleter.name}</span>
                <strong>${deleter.count}</strong>
            `;
            topDeletersContainer.appendChild(deleterDiv);
        });
        
        addSystemNotification('Trash statistics updated', 'info');
    }, 1000);
}

// Load trash content
function loadTrashContent() {
    const trashContentList = document.getElementById('trashContentList');
    
    // Show loading state
    trashContentList.innerHTML = `
        <div class="text-center p-3">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Loading trash content...
        </div>
    `;
    
    // In a real application, this would fetch deleted messages from the server
    // For demonstration, we'll use dummy data
    
    // Simulate API call delay
    setTimeout(() => {
        // Dummy deleted messages
        const deletedMessages = [
            {
                id: '1743610346888_5B0902FDCDC2770F27C20BC751DD1E76',
                sender: 'sirtheprogrammer (255692267247)',
                time: '2025-04-02 16:12:26',
                chatType: 'private',
                mediaType: 'image',
                content: 'Check out this new logo I designed!'
            },
            {
                id: '1743610381775_00936D8B7BED201B9B33584DE3AE538C',
                sender: 'sirtheprogrammer (255692267247)',
                time: '2025-04-02 16:13:01',
                chatType: 'private',
                mediaType: 'audio',
                content: 'Voice message (0:37)'
            },
            {
                id: '1743610760372_3A01F6CFA5AD91299851',
                sender: 'Trition✌️ (255769411001)',
                time: '2025-04-02 16:19:20',
                chatType: 'private',
                mediaType: 'text',
                content: 'Hello'
            },
            {
                id: '1743600123456_ABC123DEF456GHI789',
                sender: 'Group Member (255712345678)',
                time: '2025-04-02 13:35:23',
                chatType: 'group',
                mediaType: 'text',
                content: 'Can someone help me with this problem?'
            },
            {
                id: '1743605789012_JKL012MNO345PQR678',
                sender: 'Jane (255798765432)',
                time: '2025-04-02 15:09:49',
                chatType: 'private',
                mediaType: 'video',
                content: 'Video (0:45) - Check out this cool thing!'
            }
        ];
        
        // Clear loading state
        trashContentList.innerHTML = '';
        
        // Add deleted messages to list
        if (deletedMessages.length === 0) {
            trashContentList.innerHTML = `
                <div class="text-center p-3 text-muted">
                    <i class="fas fa-trash-alt fa-2x mb-2"></i>
                    <p>No deleted messages found</p>
                </div>
            `;
        } else {
            deletedMessages.forEach(message => {
                const messageItem = document.createElement('div');
                messageItem.className = 'list-group-item';
                
                // Determine icon based on media type
                let mediaIcon = 'fas fa-comment';
                let mediaClass = 'text-info';
                
                switch (message.mediaType) {
                    case 'image':
                        mediaIcon = 'fas fa-image';
                        mediaClass = 'text-primary';
                        break;
                    case 'video':
                        mediaIcon = 'fas fa-video';
                        mediaClass = 'text-danger';
                        break;
                    case 'audio':
                        mediaIcon = 'fas fa-microphone';
                        mediaClass = 'text-success';
                        break;
                    case 'document':
                        mediaIcon = 'fas fa-file';
                        mediaClass = 'text-warning';
                        break;
                    case 'sticker':
                        mediaIcon = 'fas fa-sticky-note';
                        mediaClass = 'text-secondary';
                        break;
                }
                
                messageItem.innerHTML = `
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <div class="d-flex align-items-center mb-1">
                                <i class="${mediaIcon} ${mediaClass} me-2"></i>
                                <strong class="me-2">${message.sender}</strong>
                                <small class="text-muted">${message.time} • ${message.chatType}</small>
                            </div>
                            <p class="mb-1">${message.content}</p>
                        </div>
                        <div class="btn-group btn-group-sm" role="group">
                            <button type="button" class="btn btn-outline-secondary view-message" data-id="${message.id}">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button type="button" class="btn btn-outline-secondary forward-message" data-id="${message.id}">
                                <i class="fas fa-share"></i>
                            </button>
                            <button type="button" class="btn btn-outline-danger delete-message" data-id="${message.id}">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                trashContentList.appendChild(messageItem);
            });
            
            // Add event listeners to message actions
            document.querySelectorAll('.view-message').forEach(button => {
                button.addEventListener('click', function() {
                    const messageId = this.getAttribute('data-id');
                    viewDeletedMessage(messageId);
                });
            });
            
            document.querySelectorAll('.forward-message').forEach(button => {
                button.addEventListener('click', function() {
                    const messageId = this.getAttribute('data-id');
                    forwardDeletedMessage(messageId);
                });
            });
            
            document.querySelectorAll('.delete-message').forEach(button => {
                button.addEventListener('click', function() {
                    const messageId = this.getAttribute('data-id');
                    deleteFromTrash(messageId);
                });
            });
        }
        
        addSystemNotification('Trash content loaded', 'info');
    }, 1500);
}

// Save anti-delete settings
function saveAntiDeleteSettings() {
    // Get settings from form
    const settings = {
        enabled: document.getElementById('antiDeleteEnabled').checked,
        allChats: document.getElementById('antiDeleteAllChats').checked,
        storageTime: document.getElementById('storageTimeMinutes').value,
        maxStored: document.getElementById('maxStoredMessages').value
    };
    
    // In a real application, this would send settings to the server
    // For demonstration, we'll just show a success notification
    
    // Simulate API call delay
    setTimeout(() => {
        addSystemNotification('Anti-delete settings saved successfully!', 'success');
        addActivityEntry('Admin', 'Updated anti-delete settings');
    }, 1000);
}

// Search trash
function searchTrash() {
    const searchTerm = document.getElementById('searchTrash').value.toLowerCase();
    
    if (!searchTerm) {
        addSystemNotification('Please enter a search term', 'warning');
        return;
    }
    
    // In a real application, this would search the server-side data
    // For demonstration, we'll search client-side
    
    const messageItems = document.querySelectorAll('#trashContentList .list-group-item');
    let matchesFound = 0;
    
    messageItems.forEach(item => {
        const messageText = item.textContent.toLowerCase();
        
        if (messageText.includes(searchTerm)) {
            item.style.display = 'block';
            
            // Highlight matches
            const htmlContent = item.innerHTML;
            const highlightedContent = htmlContent.replace(
                new RegExp('(' + searchTerm + ')', 'gi'),
                '<span class="bg-warning">$1</span>'
            );
            item.innerHTML = highlightedContent;
            
            matchesFound++;
        } else {
            item.style.display = 'none';
        }
    });
    
    if (matchesFound > 0) {
        addSystemNotification(`Found ${matchesFound} matching deleted messages`, 'success');
    } else {
        addSystemNotification('No deleted messages found matching your search', 'info');
    }
}

// View deleted message
function viewDeletedMessage(messageId) {
    // In a real application, this would fetch the full message details from the server
    // For demonstration, we'll use dummy data based on the ID
    
    // Find message info from the dummy data based on ID
    const messageIndex = messageId.split('_')[1][0]; // Just using first character of ID for demo
    
    // Dummy message content
    let mediaContent = '';
    let messageContent = 'This is the full content of the deleted message that would be retrieved from the server.';
    
    // Create different media previews based on index
    if (messageIndex === '5') {
        // Image
        mediaContent = `
            <div class="text-center mb-3">
                <img src="https://via.placeholder.com/400x300" class="img-fluid rounded" alt="Deleted Image">
            </div>
        `;
    } else if (messageIndex === '0') {
        // Audio
        mediaContent = `
            <div class="mb-3">
                <audio controls class="w-100">
                    <source src="#" type="audio/mpeg">
                    Your browser does not support the audio element.
                </audio>
            </div>
        `;
    } else if (messageIndex === '3') {
        // Video
        mediaContent = `
            <div class="text-center mb-3">
                <video controls class="img-fluid rounded">
                    <source src="#" type="video/mp4">
                    Your browser does not support the video element.
                </video>
            </div>
        `;
    } else if (messageIndex === 'J') {
        // Video
        mediaContent = `
            <div class="text-center mb-3">
                <video controls class="img-fluid rounded">
                    <source src="#" type="video/mp4">
                    Your browser does not support the video element.
                </video>
            </div>
        `;
    }
    
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="viewMessageModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Deleted Message</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="mb-3">
                            <strong>Message ID:</strong>
                            <code>${messageId}</code>
                        </div>
                        ${mediaContent}
                        <div class="card">
                            <div class="card-body">
                                ${messageContent}
                            </div>
                        </div>
                        <div class="mt-3">
                            <strong>Metadata:</strong>
                            <div class="small text-muted">
                                <div>Deleted at: 2025-04-02 16:19:20</div>
                                <div>Original send time: 2025-04-02 16:18:45</div>
                                <div>Chat: Private (255769411001)</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-whatsapp" id="forwardModalBtn" data-id="${messageId}">
                            <i class="fas fa-share"></i> Forward
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('viewMessageModal'));
    modal.show();
    
    // Forward button handler
    document.getElementById('forwardModalBtn').addEventListener('click', function() {
        const messageId = this.getAttribute('data-id');
        modal.hide();
        forwardDeletedMessage(messageId);
    });
    
    // Clean up when modal is hidden
    document.getElementById('viewMessageModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Forward deleted message
function forwardDeletedMessage(messageId) {
    // Create modal HTML
    const modalHTML = `
        <div class="modal fade" id="forwardMessageModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Forward Deleted Message</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <form id="forwardMessageForm">
                            <div class="mb-3">
                                <label for="forwardTo" class="form-label">Forward To</label>
                                <select class="form-select" id="forwardTo" required>
                                    <option value="">Select chat</option>
                                    <option value="255617200014">Owner (255617200014)</option>
                                    <option value="255692267247">sirtheprogrammer (255692267247)</option>
                                    <option value="255769411001">Trition✌️ (255769411001)</option>
                                    <option value="group1">Family Group</option>
                                    <option value="group2">Work Team</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="forwardMessage" class="form-label">Add Note (Optional)</label>
                                <textarea class="form-control" id="forwardMessage" rows="2" placeholder="Add a note to send with the message"></textarea>
                            </div>
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" id="forwardAsIs" checked>
                                <label class="form-check-label" for="forwardAsIs">Forward with original metadata</label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-whatsapp" id="sendForwardBtn">Forward</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('forwardMessageModal'));
    modal.show();
    
    // Handle forward button click
    document.getElementById('sendForwardBtn').addEventListener('click', function() {
        const form = document.getElementById('forwardMessageForm');
        
        // Simple form validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        const forwardTo = document.getElementById('forwardTo').value;
        const forwardNote = document.getElementById('forwardMessage').value;
        const forwardAsIs = document.getElementById('forwardAsIs').checked;
        
        // In a real application, this would send the forward request to the server
        // For demonstration, we'll just show a success notification
        
        modal.hide();
        
        // Simulate API call delay
        setTimeout(() => {
            const recipient = document.getElementById('forwardTo').options[document.getElementById('forwardTo').selectedIndex].text;
            addSystemNotification(`Message forwarded to ${recipient} successfully!`, 'success');
            addActivityEntry('Admin', `Forwarded a deleted message to ${recipient}`);
        }, 1000);
    });
    
    // Clean up when modal is hidden
    document.getElementById('forwardMessageModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Delete message from trash
function deleteFromTrash(messageId) {
    if (confirm('Are you sure you want to permanently delete this message from trash?')) {
        // In a real application, this would send a delete request to the server
        // For demonstration, we'll just hide the message in the UI
        
        const messageElement = document.querySelector(`.delete-message[data-id="${messageId}"]`).closest('.list-group-item');
        
        // Animate removal
        messageElement.style.transition = 'opacity 0.5s, height 0.5s';
        messageElement.style.opacity = '0';
        setTimeout(() => {
            messageElement.style.height = '0';
            messageElement.style.margin = '0';
            messageElement.style.padding = '0';
            messageElement.style.overflow = 'hidden';
            
            setTimeout(() => {
                messageElement.remove();
                
                // Update stats
                const totalCount = document.getElementById('totalDeletedCount');
                totalCount.textContent = (parseInt(totalCount.textContent) - 1).toString();
                
                addSystemNotification('Message permanently deleted from trash', 'success');
                addActivityEntry('Admin', 'Deleted a message from trash');
                
                // If no messages left, show empty state
                if (document.querySelectorAll('#trashContentList .list-group-item').length === 0) {
                    document.getElementById('trashContentList').innerHTML = `
                        <div class="text-center p-3 text-muted">
                            <i class="fas fa-trash-alt fa-2x mb-2"></i>
                            <p>No deleted messages found</p>
                        </div>
                    `;
                }
            }, 500);
        }, 500);
    }
}

// Clear all trash
function clearTrash() {
    // In a real application, this would send a clear request to the server
    // For demonstration, we'll just clear the UI
    
    // Show loading state
    document.getElementById('trashContentList').innerHTML = `
        <div class="text-center p-3">
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            Clearing trash...
        </div>
    `;
    
    // Simulate API call delay
    setTimeout(() => {
        // Update stats
        document.getElementById('totalDeletedCount').textContent = '0';
        document.getElementById('textDeletedCount').textContent = '0';
        document.getElementById('mediaDeletedCount').textContent = '0';
        document.getElementById('groupDeletedCount').textContent = '0';
        document.getElementById('privateDeletedCount').textContent = '0';
        
        // Clear top deleters
        document.getElementById('topDeletersContainer').innerHTML = '<p class="text-muted">No data available</p>';
        
        // Show empty state
        document.getElementById('trashContentList').innerHTML = `
            <div class="text-center p-3 text-muted">
                <i class="fas fa-trash-alt fa-2x mb-2"></i>
                <p>No deleted messages found</p>
            </div>
        `;
        
        addSystemNotification('Trash cleared successfully', 'success');
        addActivityEntry('Admin', 'Cleared all messages from trash');
    }, 1500);
}

// Initialize anti-delete tab when document is loaded
document.addEventListener('DOMContentLoaded', function() {
    initAntiDeleteTab();
}); 