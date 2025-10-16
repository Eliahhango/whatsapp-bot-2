# WhatsApp Bot Admin Panel

A web-based admin panel for managing your WhatsApp bot.

## Features

- Dashboard with bot statistics
- Live log viewing and filtering
- Bot settings management
- Command management
- Anti-delete message management
- User and group management

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Start the admin panel server:
   ```
   npm run admin
   ```

3. Access the admin panel at:
   ```
   http://localhost:3000
   ```

4. Login with:
   - Username: `sirtheprogrammer`
   - Password: `admin`

## Security Notes

This admin panel uses a simple authentication system for demonstration purposes. In a production environment, you should:

- Use HTTPS for secure connections
- Implement a more robust authentication system
- Store credentials securely (not hardcoded)
- Set up proper access controls

## Technical Details

- Built with Express.js server
- Frontend using Bootstrap 5 and vanilla JavaScript
- Session-based authentication
- RESTful API design

## Folder Structure

```
admin/
├── index.html       # Main dashboard
├── login.html       # Login page
├── admin.js         # Script loader
├── main.js          # Core dashboard functionality
├── logs.js          # Log management
├── settings.js      # Settings management
├── commands.js      # Commands management
├── antidelete.js    # Anti-delete management
└── img/             # Images and assets
```

## API Endpoints

- `/api/login` - Authentication
- `/api/status` - Bot status
- `/api/logs` - Log retrieval
- `/api/config` - Configuration management
- `/api/bot/restart` - Bot restart
- `/api/bot/refresh-qr` - QR code refresh 