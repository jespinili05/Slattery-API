/**
 * Validation Utilities
 * Input validation and error handling utilities
 */
class ValidationUtils {

  /**
   * Validate proposal configuration
   */
  static validateProposalConfig(config) {
    const errors = [];

    // Required fields
    if (!config.Company || typeof config.Company !== 'string') {
      errors.push('Company name is required and must be a string');
    }

    if (!config.Templates || !Array.isArray(config.Templates)) {
      errors.push('Templates must be an array');
    } else {
      // Validate each template
      config.Templates.forEach((template, index) => {
        if (!template.name || typeof template.name !== 'string') {
          errors.push(`Template[${index}] missing required field: name`);
        }

        if (!template.fileName || typeof template.fileName !== 'string') {
          errors.push(`Template[${index}] missing required field: fileName`);
        }

        if (typeof template.editable !== 'boolean') {
          errors.push(`Template[${index}] editable must be a boolean`);
        }

        // Validate editable template fields
        if (template.editable === true) {
          if (!template.fieldValues || typeof template.fieldValues !== 'object') {
            errors.push(`Editable template[${index}] missing fieldValues object`);
          }
        }

        // Validate staff profiles
        if (template.name === 'Staff Profiles' && template.staffs) {
          if (!Array.isArray(template.staffs)) {
            errors.push(`Staff Profiles template[${index}] staffs must be an array`);
          } else {
            template.staffs.forEach((staff, staffIndex) => {
              if (!staff.name || !staff.fileName) {
                errors.push(`Staff[${staffIndex}] in template[${index}] missing name or fileName`);
              }
            });
          }
        }
      });
    }

    return errors;
  }

  /**
   * Validate API request parameters
   */
  static validateApiRequest(req) {
    const errors = [];
    const { config, outputFileName } = req.body;

    if (!config) {
      errors.push('Request body must include config object');
    } else {
      const configErrors = this.validateProposalConfig(config);
      errors.push(...configErrors);
    }

    if (outputFileName && typeof outputFileName !== 'string') {
      errors.push('outputFileName must be a string');
    }

    if (outputFileName && !/^[\w\-. ]+\.pdf$/i.test(outputFileName)) {
      errors.push('outputFileName must be a valid PDF filename');
    }

    return errors;
  }

  /**
   * Validate file paths for security
   */
  static validateFilePath(filePath, allowedDir) {
    const errors = [];

    if (!filePath || typeof filePath !== 'string') {
      errors.push('File path must be a non-empty string');
      return errors;
    }

    // Check for path traversal attempts
    if (filePath.includes('..')) {
      errors.push('Path traversal not allowed');
    }

    // Check if path is within allowed directory
    if (allowedDir && !filePath.startsWith(allowedDir)) {
      errors.push('File path outside allowed directory');
    }

    return errors;
  }

  /**
   * Sanitize filename for safe usage
   */
  static sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
      return 'output.pdf';
    }

    // Remove dangerous characters and normalize
    let sanitized = filename
      .replace(/[<>:"/\\|?*]/g, '') // Remove dangerous characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .trim();

    // Ensure .pdf extension
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      sanitized += '.pdf';
    }

    // Limit length
    if (sanitized.length > 255) {
      const ext = '.pdf';
      sanitized = sanitized.substring(0, 255 - ext.length) + ext;
    }

    return sanitized || 'output.pdf';
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse(message, errors = [], statusCode = 400) {
    return {
      success: false,
      message,
      errors,
      statusCode,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create standardized success response
   */
  static createSuccessResponse(data, message = 'Operation successful') {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = ValidationUtils;