const path = require('path');
const fs = require('fs');
const ValidationUtils = require('../../../utils/validationUtils');

/**
 * Vercel serverless function for downloading proposal files
 * @route   GET /api/proposals/download/[filename]
 * @desc    Download a generated proposal file
 * @access  Public
 * @param   filename - The filename to download
 */
module.exports = async (req, res) => {
  try {
    // Enable CORS for download endpoint
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    if (req.method !== 'GET') {
      return res.status(405).json({
        success: false,
        message: 'Method not allowed',
        statusCode: 405
      });
    }

    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required',
        statusCode: 400
      });
    }

    // Validate and sanitize filename
    const sanitizedFilename = ValidationUtils.sanitizeFilename(filename);

    // Use /tmp directory in serverless environments
    const outputDir = '/tmp';
    const filePath = path.join(outputDir, sanitizedFilename);

    // Security check - ensure file is in output directory
    if (!filePath.startsWith(outputDir)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied - file access outside output directory not allowed',
        statusCode: 403
      });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: `File ${sanitizedFilename} does not exist`,
        statusCode: 404
      });
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

    // Get file stats for content-length
    const stats = fs.statSync(filePath);
    res.setHeader('Content-Length', stats.size);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file',
      error: error.message,
      statusCode: 500
    });
  }
};