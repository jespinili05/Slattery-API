const fs = require('fs');
const path = require('path');

/**
 * File Utilities
 * Common file operations used throughout the application
 */
class FileUtils {

  /**
   * Ensure a directory exists, create if it doesn't
   */
  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Generate a timestamped filename
   */
  static generateTimestampedFilename(baseName, extension = '.pdf') {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${baseName}_${timestamp}${extension}`;
  }

  /**
   * Validate that required templates exist
   */
  static validateTemplatesExist(templatesDir, requiredTemplates) {
    const missingTemplates = [];
    
    for (const template of requiredTemplates) {
      const templatePath = path.join(templatesDir, template);
      if (!fs.existsSync(templatePath)) {
        missingTemplates.push(template);
      }
    }
    
    return missingTemplates;
  }

  /**
   * Load and validate JSON configuration file
   */
  static loadConfig(configPath) {
    try {
      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);
      
      // Basic validation
      if (!config.Company) {
        throw new Error('Configuration missing required field: Company');
      }
      
      if (!config.Templates || !Array.isArray(config.Templates)) {
        throw new Error('Configuration missing or invalid Templates array');
      }
      
      return config;
    } catch (error) {
      throw new Error(`Error loading configuration: ${error.message}`);
    }
  }

  /**
   * Write temporary configuration file
   */
  static writeTempConfig(config, tempDir = __dirname) {
    const tempConfigPath = path.join(tempDir, `temp_config_${Date.now()}.json`);
    fs.writeFileSync(tempConfigPath, JSON.stringify(config, null, 2));
    return tempConfigPath;
  }

  /**
   * Safe file deletion
   */
  static safeDelete(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
    } catch (error) {
      console.warn(`⚠️ Could not delete file ${filePath}: ${error.message}`);
    }
    return false;
  }

  /**
   * Get file size in bytes
   */
  static getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = FileUtils;