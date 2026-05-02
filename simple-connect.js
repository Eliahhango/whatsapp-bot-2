const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

// Start WhatsApp connection with minimal settings
async function connectWhatsApp() {
    console.log('\n========== WHATSAPP SIMPLE CONNECT ==========');
    console.log('This script will help you connect to WhatsApp using QR code');
    console.log('Keep your phone ready to scan the QR code that will appear\n');
    
    // Clean up auth_info directory to start fresh
    console.log('Cleaning up old authentication files...');
    if (fs.existsSync('./auth_info')) {
        fs.rmSync('./auth_info', { recursive: true, force: true });
    }
    fs.mkdirSync('./auth_info', { recursive: true });
    
    // Load auth state
    console.log('Setting up authentication state...');
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    
    // Create socket with minimal settings
    console.log('Connecting to WhatsApp...');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Print QR code in terminal
        browser: ["Chrome", "Windows", "10.0"],
        version: [2, 2321, 4], // Using stable version
        syncFullHistory: false,
        logger: undefined // Disable logs except errors
    });
    
    // Listen for auth updates
    sock.ev.on('creds.update', saveCreds);
    
    // Listen for connection updates
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('\n======================================================');
            console.log('📱 SCAN THIS QR CODE WITH YOUR PHONE:');
            console.log('1. Open WhatsApp on your phone');
            console.log('2. Go to Settings > Linked Devices');
            console.log('3. Tap on "Link a Device"');
            console.log('4. Point your phone camera at the QR code in the terminal');
            console.log('======================================================\n');
        }
        
        if (connection === 'open') {
            console.log('\n🎉 SUCCESS! Your device is now connected to WhatsApp!\n');
            console.log('✅ Authentication saved to the auth_info folder');
            console.log('✅ You can now start your bot with "node bot.js"');
            
            // Save user info
            if (sock.user) {
                console.log(`✅ Connected as: ${sock.user.id}`);
                fs.writeFileSync('./auth_info/user_info.json', JSON.stringify(sock.user, null, 2));
            }
            
            // Exit the process after successful connection
            setTimeout(() => {
                process.exit(0);
            }, 5000); // Wait 5 seconds before exiting
        }
        
        if (connection === 'close') {
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Connection closed (status: ${statusCode})`);
            
            // Check if we should reconnect
            if (statusCode !== DisconnectReason.loggedOut) {
                console.log('🔄 Attempting to reconnect...');
                connectWhatsApp(); // Recursive call to reconnect
            } else {
                console.log('❌ WhatsApp logged you out. Please restart this script.');
                process.exit(1);
            }
        }
    });
}

// Start the connection process
connectWhatsApp().catch(err => {
    console.error('Fatal error:', err);
    console.log('\nPlease try these steps:');
    console.log('1. Install the official Baileys package: npm install baileys');
    console.log('2. Make sure your internet connection is stable');
    console.log('3. Try using a different phone number');
    process.exit(1);
}); 