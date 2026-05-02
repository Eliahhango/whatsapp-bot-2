const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Create readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Ask for phone number if not provided
async function getPhoneNumber() {
    return new Promise((resolve) => {
        rl.question('Enter your WhatsApp phone number with country code (e.g., +1234567890): ', (answer) => {
            // Clean the phone number (remove +, spaces, etc.)
            const phoneNumber = answer.replace(/[^0-9]/g, '');
            console.log(`Using phone number: ${phoneNumber}`);
            resolve(phoneNumber);
        });
    });
}

// Main pairing function
async function pairPhone() {
    console.log('\n========== WHATSAPP PAIRING UTILITY ==========');
    console.log('This utility will help you pair your WhatsApp account');
    console.log('Make sure you have your phone nearby with WhatsApp installed\n');
    
    // Ensure auth directory exists
    const AUTH_DIR = './auth_info';
    if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
        console.log('Created auth directory');
    } else {
        // Clean directory to ensure fresh start
        try {
            fs.rmSync(AUTH_DIR, { recursive: true, force: true });
            fs.mkdirSync(AUTH_DIR, { recursive: true });
            console.log('Cleaned auth directory for fresh pairing');
        } catch (err) {
            console.log('Could not clean auth directory, continuing anyway');
        }
    }
    
    // Get phone number
    let phoneNumber = await getPhoneNumber();
    
    // Create very minimal WhatsApp connection
    try {
        // Load auth state
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
        
        console.log('\nInitiating WhatsApp connection...');
        // Using the simplest configuration to avoid initialization issues
        const sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            version: [2, 2308, 7],
            browser: ["Chrome", "Windows", "10.0"],
            syncFullHistory: false,
        });
        
        console.log('Connection initialized successfully.');
        
        // Save credentials
        sock.ev.on('creds.update', saveCreds);
        
        // Setup connection handler
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;
            
            if (connection === 'connecting') {
                console.log('Connecting to WhatsApp...');
            } else if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log(`Connection closed with status: ${statusCode || 'unknown'}`);
                
                if (statusCode === 428 || statusCode === 440) {
                    console.log('Connection closed while waiting for pairing. This is normal.');
                    console.log('If you already entered the code on your phone, check if authentication was saved by looking for files in the auth_info directory.');
                    console.log('If your phone showed "device connected", your auth files should be ready to use with the bot.');
                } else if (statusCode === 401) {
                    console.log('Authentication failed, please try again with the correct phone number.');
                }
                
                // Ask if user wants to try again
                rl.question('\nDo you want to try again? (y/n): ', async (answer) => {
                    if (answer.toLowerCase() === 'y') {
                        phoneNumber = await getPhoneNumber();
                        await requestPairingCode(sock, phoneNumber);
                    } else {
                        console.log('Exiting pairing utility');
                        process.exit(0);
                    }
                });
            } else if (connection === 'open') {
                console.log('\n🎉 SUCCESS! Your device has been paired!');
                console.log('You can now start your bot with "node bot.js"');
                process.exit(0);
            }
        });
        
        // Wait a moment before requesting pairing code
        console.log('Waiting for connection to establish before requesting pairing code...');
        setTimeout(() => {
            requestPairingCode(sock, phoneNumber);
        }, 5000);
        
    } catch (error) {
        console.error('Fatal error:', error);
        console.log('\nThere was a problem initializing the WhatsApp connection.');
        console.log('Please try these steps:');
        console.log('1. Make sure you have the latest version of the baileys library');
        console.log('   npm install @whiskeysockets/baileys@latest');
        console.log('2. Delete the node_modules folder and run npm install again');
        console.log('3. Try again with a different browser configuration');
        rl.close();
        process.exit(1);
    }
}

// Function to request pairing code
async function requestPairingCode(sock, phoneNumber) {
    try {
        console.log('\n-------------------------------------------------------------');
        console.log('🔄 Requesting pairing code...');
        console.log(`📱 For phone number: ${phoneNumber}`);
        console.log('-------------------------------------------------------------\n');
        
        try {
            const code = await sock.requestPairingCode(phoneNumber);
        
            console.log('\n-------------------------------------------------------------');
            console.log('✅ PAIRING CODE RECEIVED!');
            console.log(`📲 Your pairing code: ${code}`);
            console.log('🔐 Enter this code on your WhatsApp mobile app:');
            console.log('   1. Open WhatsApp on your phone');
            console.log('   2. Go to Settings > Linked Devices');
            console.log('   3. Tap on "Link a Device"');
            console.log('   4. When it shows the QR scanner, tap "Link with phone number"');
            console.log('   5. Enter the pairing code shown above');
            console.log('-------------------------------------------------------------\n');
            console.log('⏳ Waiting for you to enter the code on your phone...');
            console.log('(The connection may close while waiting, which is normal)');
        } catch (pairingError) {
            console.error('\nError requesting pairing code:', pairingError.message);
            console.log('\nThere was a problem getting the pairing code. This could be because:');
            console.log('1. The connection to WhatsApp servers is not established yet');
            console.log('2. Your phone number format might be incorrect');
            console.log('3. WhatsApp servers might be having issues');
            
            // Give option to try QR code instead
            console.log('\nAlternatively, you can try using QR code method:');
            console.log('- Delete the auth_info folder');
            console.log('- Edit bot.js to set printQRInTerminal: true');
            console.log('- Run node bot.js and scan the QR code directly');
        }
        
        // Allow user to request new code if needed
        rl.question('\nPress "r" and Enter to request a new code, or "q" to quit: ', async (answer) => {
            if (answer.toLowerCase() === 'r') {
                await requestPairingCode(sock, phoneNumber);
            } else if (answer.toLowerCase() === 'q') {
                console.log('Exiting pairing utility');
                process.exit(0);
            }
        });
        
    } catch (error) {
        console.error('General error:', error);
        console.log('\nThere was an error in the pairing process.');
        
        rl.question('Do you want to try again? (y/n): ', async (answer) => {
            if (answer.toLowerCase() === 'y') {
                setTimeout(() => {
                    requestPairingCode(sock, phoneNumber);
                }, 3000);
            } else {
                console.log('Exiting pairing utility');
                process.exit(0);
            }
        });
    }
}

// Start the pairing process
pairPhone().catch(err => {
    console.error('Fatal error in pairing process:', err);
    process.exit(1);
}); 