# SirTheProgrammer WhatsApp Bot

A feature-rich WhatsApp bot with multiple capabilities including AI responses, music downloads, status features, and more.

## Features

- 🧠 **AI Integration**: Chat with Google's Gemini AI
- 🎵 **Music Downloads**: Download MP3 songs from YouTube
- 📱 **Status Features**: View and react to WhatsApp statuses
- 🌦️ **Weather Information**: Get weather forecasts
- 📊 **Statistics**: View bot performance and usage stats
- 🤖 **Utility Commands**: Various helpful commands

## Setup

### Prerequisites

- Node.js (v14+)
- A WhatsApp account for the bot
- Google Gemini API key (for AI features)

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure API keys in the `config.js` file
4. Start the bot:
   ```
   npm start
   ```

### Getting Google Gemini API Key

For the AI features to work, you need a Google Gemini API key:

1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Go to the "API Keys" section
4. Create a new API key
5. Copy the API key to your `config.js` file

## Commands

| Command | Description |
|---------|-------------|
| `.help` | Show help menu |
| `.menu` | Display main menu |
| `.play [song]` | Download MP3 from YouTube |
| `.gemini [prompt]` | Ask Gemini AI a question |
| `.sreact [on/off/test]` | Control auto-reactions to status |
| `.status` | View status features |
| `.weather [city]` | Get weather forecast |
| `.ping` | Check bot connectivity |

## Owner Commands

| Command | Description |
|---------|-------------|
| `.restart` | Restart the bot |
| `.stats` | View detailed statistics |
| `.gemini admin` | Access Gemini admin features |

## Troubleshooting

If you encounter any issues:

1. Make sure all API keys are set correctly in `config.js`
2. Check that all dependencies are installed
3. Verify your internet connection
4. Look at the console logs for specific error messages

## License

This project is open source and available under the MIT License. 