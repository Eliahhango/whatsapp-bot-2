/**
 * Config Manager Module
 * 
 * This module provides functions to read and update the bot's configuration.
 */

const fs = require('fs');
const path = require('path');
const botState = require('./botState');

class ConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, '..', 'config.js');
        this.configBackupDir = path.join(__dirname, '..', 'config_backups');
        
        // Create backup directory if it doesn't exist
        if (!fs.existsSync(this.configBackupDir)) {
            fs.mkdirSync(this.configBackupDir, { recursive: true });
        }
        
        // Cache the config object
        this.configCache = null;
    }
    
    // Get the current configuration
    getConfig() {
        // Clear cache to ensure we always have the latest config
        delete require.cache[require.resolve(this.configPath)];
        
        // Import the config file
        const config = require(this.configPath);
        
        // Update cache
        this.configCache = JSON.parse(JSON.stringify(config));
        
        return this.configCache;
    }
    
    // Update the configuration
    updateConfig(newConfig) {
        // Get the current config first
        const currentConfig = this.getConfig();
        
        // Create a backup of the current config
        this.createBackup();
        
        // Merge the new config with the current config
        const mergedConfig = this.mergeConfigs(currentConfig, newConfig);
        
        // Convert the config object to a string representation
        const configString = this.configToString(mergedConfig);
        
        // Write the new config to the file
        fs.writeFileSync(this.configPath, configString, 'utf8');
        
        // Log the update
        botState.log('info', 'Configuration file updated');
        
        // Return the updated config
        return mergedConfig;
    }
    
    // Create a backup of the current config
    createBackup() {
        try {
            // Read the current config file
            const configContent = fs.readFileSync(this.configPath, 'utf8');
            
            // Create a backup filename with timestamp
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
            const backupPath = path.join(this.configBackupDir, `config_${timestamp}.js.bak`);
            
            // Write the backup
            fs.writeFileSync(backupPath, configContent, 'utf8');
            
            botState.log('info', `Configuration backup created: ${path.basename(backupPath)}`);
            
            // Clean up old backups (keep only the 10 most recent)
            this.cleanupBackups();
            
            return true;
        } catch (error) {
            botState.log('error', `Failed to create configuration backup: ${error.message}`);
            return false;
        }
    }
    
    // Clean up old backups
    cleanupBackups() {
        try {
            const files = fs.readdirSync(this.configBackupDir)
                .filter(file => file.startsWith('config_') && file.endsWith('.js.bak'))
                .map(file => ({
                    name: file,
                    path: path.join(this.configBackupDir, file),
                    time: fs.statSync(path.join(this.configBackupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // Sort by modified time, newest first
            
            // Keep only the 10 most recent backups
            if (files.length > 10) {
                files.slice(10).forEach(file => {
                    fs.unlinkSync(file.path);
                    botState.log('info', `Deleted old configuration backup: ${file.name}`);
                });
            }
        } catch (error) {
            botState.log('error', `Failed to cleanup configuration backups: ${error.message}`);
        }
    }
    
    // Merge configs (deep merge)
    mergeConfigs(target, source) {
        const output = { ...target };
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.mergeConfigs(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }
    
    // Check if value is an object
    isObject(item) {
        return (item && typeof item === 'object' && !Array.isArray(item));
    }
    
    // Convert config object to a string representation
    configToString(config) {
        // Start with the module exports
        let configString = `/**
 * Configuration File
 * Contains API keys and configuration settings
 * Last updated: ${new Date().toISOString()}
 */

module.exports = `;

        // Convert the config object to a string with proper formatting
        configString += this.formatConfigObject(config, 0);
        
        // Add a final semicolon
        configString += ';';
        
        return configString;
    }
    
    // Format config object with proper indentation
    formatConfigObject(obj, depth) {
        const indent = '    '.repeat(depth);
        const objIndent = '    '.repeat(depth + 1);
        
        // Convert the object to a string
        let result = '{\n';
        
        // Add properties
        Object.keys(obj).forEach((key, index, array) => {
            const value = obj[key];
            
            // Add comment if there is one in the original config
            // result += `${objIndent}// ${key}\n`;
            
            // Add the key
            result += `${objIndent}${key}: `;
            
            // Add the value based on its type
            if (this.isObject(value)) {
                result += this.formatConfigObject(value, depth + 1);
            } else if (typeof value === 'string') {
                result += `'${value.replace(/'/g, "\\'")}'`;
            } else if (typeof value === 'number' || typeof value === 'boolean') {
                result += value;
            } else if (value === null) {
                result += 'null';
            } else if (Array.isArray(value)) {
                result += `[${value.map(item => {
                    if (typeof item === 'string') {
                        return `'${item.replace(/'/g, "\\'")}'`;
                    }
                    return item;
                }).join(', ')}]`;
            } else {
                result += 'undefined';
            }
            
            // Add a comma if it's not the last property
            if (index < array.length - 1) {
                result += ',';
            }
            
            // Add a newline
            result += '\n';
        });
        
        // Close the object
        result += `${indent}}`;
        
        return result;
    }
    
    // Restore a config from backup
    restoreBackup(backupFile) {
        try {
            const backupPath = path.join(this.configBackupDir, backupFile);
            
            if (!fs.existsSync(backupPath)) {
                throw new Error(`Backup file not found: ${backupFile}`);
            }
            
            // Create a backup of the current config first
            this.createBackup();
            
            // Read the backup file
            const backupContent = fs.readFileSync(backupPath, 'utf8');
            
            // Write the backup content to the config file
            fs.writeFileSync(this.configPath, backupContent, 'utf8');
            
            botState.log('info', `Configuration restored from backup: ${backupFile}`);
            
            // Clear require cache
            delete require.cache[require.resolve(this.configPath)];
            
            return true;
        } catch (error) {
            botState.log('error', `Failed to restore configuration from backup: ${error.message}`);
            return false;
        }
    }
    
    // Get available backups
    getBackups() {
        try {
            const files = fs.readdirSync(this.configBackupDir)
                .filter(file => file.startsWith('config_') && file.endsWith('.js.bak'))
                .map(file => ({
                    name: file,
                    date: file.replace('config_', '').replace('.js.bak', '').replace(/-/g, ':'),
                    path: path.join(this.configBackupDir, file),
                    time: fs.statSync(path.join(this.configBackupDir, file)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // Sort by modified time, newest first
            
            return files;
        } catch (error) {
            botState.log('error', `Failed to get configuration backups: ${error.message}`);
            return [];
        }
    }
}

// Create a singleton instance
const configManager = new ConfigManager();

module.exports = configManager; 