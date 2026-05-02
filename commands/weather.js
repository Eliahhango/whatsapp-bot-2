const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Weather command to fetch current weather for a city
 * @param {Object} sock - WhatsApp socket connection
 * @param {String} sender - Sender's WhatsApp ID (chat ID)
 * @param {String} text - Full message text
 * @param {Object} context - Additional context (isOwner, chatType, actualSender)
 */
const execute = async (sock, sender, text, context = {}) => {
    // Extract city name from command
    const city = text.split(' ').slice(1).join(' ');
    
    if (!city) {
        await sock.sendMessage(sender, { 
            text: `╔══✧『 ERROR 』✧══❖
║ Please provide a city name!
╚══════════════════❖

Example usage: .weather DarEsSalaam`
        });
        return;
    }

    const apiKey = '5736ba408815bae719c4fafca862809e';
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

    try {
        // Log with sender context information
        const senderInfo = context.isOwner ? '👑 OWNER' : 
                          (context.chatType === 'group' ? 'group member' : 'user');
        console.log(`🔍 Fetching weather for ${city} requested by ${senderInfo}...`);
        
        const response = await axios.get(url);
        const { name, main, weather, wind, sys } = response.data;
        
        // Create detailed weather information with elegant styling
        let weatherText = `╔══✧『 𝓦𝓮𝓪𝓽𝓱𝓮𝓻 𝓯𝓸𝓻 ${name.toUpperCase()} 』✧══❖
║
║ 🌍 *Location:* ${name}, ${sys.country}
║

╔══✧『 TEMPERATURE 』✧══❖
║ ✦ 𝙲𝚞𝚛𝚛𝚎𝚗𝚝: ${main.temp}°C
║ ✦ 𝙵𝚎𝚎𝚕𝚜 𝙻𝚒𝚔𝚎: ${main.feels_like}°C
║ ✦ 𝙷𝚒𝚐𝚑: ${main.temp_max}°C
║ ✦ 𝙻𝚘𝚠: ${main.temp_min}°C
╚══════════════════❖

╔══✧『 CONDITIONS 』✧══❖
║ ✦ 𝚆𝚎𝚊𝚝𝚑𝚎𝚛: ${weather[0].main}
║ ✦ 𝙳𝚎𝚜𝚌𝚛𝚒𝚙𝚝𝚒𝚘𝚗: ${weather[0].description}
║ ✦ 𝙷𝚞𝚖𝚒𝚍𝚒𝚝𝚢: ${main.humidity}%
║ ✦ 𝚆𝚒𝚗𝚍 𝚂𝚙𝚎𝚎𝚍: ${wind.speed} m/s`;
        
        // Add more details for the owner
        if (context.isOwner) {
            weatherText += `
╚══════════════════❖

╔══✧『 OWNER DATA 』✧══❖
║ ✦ 𝙰𝙿𝙸 𝚁𝚎𝚜𝚙𝚘𝚗𝚜𝚎 𝚃𝚒𝚖𝚎: ${response.headers['x-response-time'] || 'N/A'}
║ ✦ 𝙿𝚛𝚎𝚜𝚜𝚞𝚛𝚎: ${main.pressure} hPa`;
            if (wind.deg) weatherText += `\n║ ✦ 𝚆𝚒𝚗𝚍 𝙳𝚒𝚛𝚎𝚌𝚝𝚒𝚘𝚗: ${wind.deg}°`;
            if (response.data.clouds) weatherText += `\n║ ✦ 𝙲𝚕𝚘𝚞𝚍𝚒𝚗𝚎𝚜𝚜: ${response.data.clouds.all}%`;
            if (response.data.visibility) weatherText += `\n║ ✦ 𝚅𝚒𝚜𝚒𝚋𝚒𝚕𝚒𝚝𝚢: ${response.data.visibility / 1000} km`;
            weatherText += `
╚══════════════════❖`;
        } else {
            weatherText += `
╚══════════════════❖`;
        }
        
        // Add credits footer
        weatherText += `

╔══✧『 THANK YOU 』✧══❖
║ Creator: *SirTheProgrammer*
╚══════════════════❖`;
        
        // Try to send with a weather icon image
        try {
            // Get weather icon code
            const iconCode = weather[0].icon;
            const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
            
            // First try to send with the weather icon
            await sock.sendMessage(sender, {
                image: { url: iconUrl },
                caption: weatherText
            });
        } catch (imgError) {
            console.log('Error sending weather with icon, trying with bot icon:', imgError.message);
            
            // Try with local image as fallback
            try {
                const imagePath = path.join(__dirname, '..', 'pic', 'index.png');
                
                if (fs.existsSync(imagePath)) {
                    const imageBuffer = fs.readFileSync(imagePath);
                    await sock.sendMessage(sender, {
                        image: imageBuffer,
                        caption: weatherText
                    });
                } else {
                    // Try with web image
                    await sock.sendMessage(sender, {
                        image: { url: 'https://i.ibb.co/mNB2R5K/sirtheprogrammer-bot.png' },
                        caption: weatherText
                    });
                }
            } catch (error) {
                console.log('Error sending weather with image, falling back to text-only:', error.message);
                // Fall back to text-only message
                await sock.sendMessage(sender, { text: weatherText });
            }
        }
        
        console.log(`✅ Weather info sent for ${city}`);
    } catch (error) {
        console.error(`❌ Error fetching weather for ${city}:`, error.message);
        
        const errorText = `╔══✧『 WEATHER ERROR 』✧══❖
║ Could not find weather for "${city}"
╚══════════════════❖

Please check the city name and try again.
Example: .weather London`;

        await sock.sendMessage(sender, { text: errorText });
    }
};

module.exports = {
    name: 'weather',
    description: 'Get beautiful weather forecast for any city',
    usage: '.weather [city name]',
    execute
}; 