const express = require('express');
const path = require('path');
const fs = require('fs');
const ProposalGeneratorService = require('../services/proposalGeneratorService');
const ProposalDatabaseService = require('../services/proposalDatabaseService');
const ValidationUtils = require('../utils/validationUtils');
const supabase = require('../config/supabase');

const router = express.Router();
const proposalService = new ProposalGeneratorService();

/**
 * @route   POST /api/proposals/generate
 * @desc    Generate a proposal PDF from configuration
 * @access  Public
 * @body    { config: Object, outputFileName?: string } - config can be wrapped in JSON/config objects or arrays
 */
router.post('/generate', async (req, res) => {
  try {
    // Normalize config from various JSON structures first
    if (!req.body.config) {
      req.body.config = ValidationUtils.normalizeConfig(req.body);
    } else {
      req.body.config = ValidationUtils.normalizeConfig(req.body.config);
    }

    // Validate request
    const validationErrors = ValidationUtils.validateApiRequest(req);
    if (validationErrors.length > 0) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Request validation failed',
          validationErrors,
          400
        )
      );
    }

    const { config, outputFileName } = req.body;

    // Generate proposal
    const result = await proposalService.generateProposal(config, outputFileName);

    // Return success response
    res.json(ValidationUtils.createSuccessResponse(result, 'Proposal generated successfully'));

  } catch (error) {
    console.error('API Error - Generate proposal:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to generate proposal',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   POST /api/proposals/generate-from-file
 * @desc    Generate a proposal PDF from configuration file
 * @access  Public
 * @body    { configFilePath?: string, outputFileName?: string }
 */
router.post('/generate-from-file', async (req, res) => {
  try {
    const { configFilePath, outputFileName } = req.body;

    // Generate proposal from file
    const result = await proposalService.generateFromConfigFile(configFilePath, outputFileName);

    // Return success response
    res.json(ValidationUtils.createSuccessResponse(result, 'Proposal generated from file successfully'));

  } catch (error) {
    console.error('API Error - Generate from file:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to generate proposal from file',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   GET /api/proposals/status
 * @desc    Get service status and health check
 * @access  Public
 */
router.get('/status', async (req, res) => {
  try {
    const status = await proposalService.getStatus();
    res.json(ValidationUtils.createSuccessResponse(status, 'Service status retrieved successfully'));
  } catch (error) {
    console.error('API Error - Get status:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to retrieve service status',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   POST /api/proposals/validate-templates
 * @desc    Validate that required templates are available
 * @access  Public
 * @body    { config: Object }
 */
router.post('/validate-templates', async (req, res) => {
  try {
    const { config } = req.body;

    if (!config) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Configuration is required',
          ['Request body must include config object'],
          400
        )
      );
    }

    const validation = await proposalService.validateTemplates(config);
    
    if (validation.valid) {
      res.json(ValidationUtils.createSuccessResponse(validation, 'All templates are available'));
    } else {
      res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Some templates are missing',
          validation.missingTemplates.map(t => `Missing template: ${t}`),
          400
        )
      );
    }

  } catch (error) {
    console.error('API Error - Validate templates:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to validate templates',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   GET /api/proposals/download/:filename
 * @desc    Download a generated proposal file
 * @access  Public
 * @param   filename - The filename to download
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate and sanitize filename
    const sanitizedFilename = ValidationUtils.sanitizeFilename(filename);
    const filePath = path.join(__dirname, '..', 'Output', sanitizedFilename);
    
    // Security check - ensure file is in output directory
    const outputDir = path.join(__dirname, '..', 'Output');
    if (!filePath.startsWith(outputDir)) {
      return res.status(403).json(
        ValidationUtils.createErrorResponse(
          'Access denied',
          ['File access outside output directory not allowed'],
          403
        )
      );
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(
        ValidationUtils.createErrorResponse(
          'File not found',
          [`File ${sanitizedFilename} does not exist`],
          404
        )
      );
    }

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedFilename}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('API Error - Download file:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to download file',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   GET /api/proposals/files
 * @desc    List all generated proposal files
 * @access  Public
 */
router.get('/files', (req, res) => {
  try {
    const outputDir = path.join(__dirname, '..', 'Output');
    
    if (!fs.existsSync(outputDir)) {
      return res.json(ValidationUtils.createSuccessResponse([], 'No files found (output directory does not exist)'));
    }

    const files = fs.readdirSync(outputDir)
      .filter(file => file.toLowerCase().endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(outputDir, file);
        const stats = fs.statSync(filePath);
        
        return {
          filename: file,
          size: stats.size,
          sizeFormatted: ValidationUtils.formatFileSize ? ValidationUtils.formatFileSize(stats.size) : `${stats.size} bytes`,
          createdAt: stats.birthtime.toISOString(),
          modifiedAt: stats.mtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(ValidationUtils.createSuccessResponse(files, `Found ${files.length} proposal files`));

  } catch (error) {
    console.error('API Error - List files:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to list files',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   POST /api/proposals/templates
 * @desc    Get templates that match proposalSections from Templates table
 * @access  Public
 * @body    [{ companyName: string, proposalSections: string[] }] or { companyName: string, proposalSections: string[] }
 */
router.post('/templates', async (req, res) => {
  try {
    let requestData = req.body;

    // Handle array format - take the first object
    if (Array.isArray(requestData) && requestData.length > 0) {
      requestData = requestData[0];
    }

    const { companyName, proposalSections } = requestData;

    if (!proposalSections || !Array.isArray(proposalSections)) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Invalid request',
          ['proposalSections array is required'],
          400
        )
      );
    }

    // Clean up Staff Profiles text if it includes "(Please list names)"
    const cleanedProposalSections = proposalSections.map(section => {
      if (section.includes('Staff Profiles') && section.includes('(Please list names)')) {
        return 'Staff Profiles';
      }
      return section;
    });

const { data, error } = await supabase
  .from('Templates')
  .select('name, path, editable')
  .in('name', cleanedProposalSections);

if (error) {
  return res.status(400).json(
    ValidationUtils.createErrorResponse(
      'Failed to fetch templates',
      [error.message],
      400
    )
  );
}

    let formattedData = data.map(item => ({
      name: item.name,
      path: item.path,
      editable: item.editable
    }));

    // TODO: Remove this test data after testing - adds "not found" templates for missing sections
    // const foundTemplateNames = formattedData.map(item => item.name);
    // const missingTemplates = cleanedProposalSections.filter(section => !foundTemplateNames.includes(section));

    // // Add "not found" templates for each missing section
    // const notFoundTemplates = missingTemplates.map(sectionName => ({
    //   name: sectionName,
    //   path: `/test/path/not-found/${sectionName.toLowerCase().replace(/\s+/g, '-')}.pdf`,
    //   editable: true
    // }));

    // Combine found templates with "not found" templates
    //const allTemplates = [...formattedData, ...notFoundTemplates];
  const allTemplates = [...formattedData];
    // Sort data to match the order in cleanedProposalSections
    const orderedData = cleanedProposalSections
      .map(name => allTemplates.find(item => item.name === name))
      .filter(Boolean);

    formattedData = orderedData;

    res.json(ValidationUtils.createSuccessResponse(
      formattedData,
      `Found ${data.length} matching template(s) for ${companyName || 'company'}`
    ));

  } catch (error) {
    console.error('API Error - Get templates:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to retrieve templates',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   GET /api/proposals/:id
 * @desc    Get proposal with all versions
 * @access  Public
 * @param   id - The proposal ID
 */
router.get('/proposal/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Proposal ID is required',
          ['Proposal ID parameter is missing'],
          400
        )
      );
    }

    const proposal = await ProposalDatabaseService.getProposalWithVersions(id);

    if (!proposal) {
      return res.status(404).json(
        ValidationUtils.createErrorResponse(
          'Proposal not found',
          [`Proposal with ID ${id} does not exist`],
          404
        )
      );
    }

    res.json(ValidationUtils.createSuccessResponse(
      proposal,
      `Retrieved proposal with ${proposal.versions.length} version(s)`
    ));

  } catch (error) {
    console.error('API Error - Get proposal:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to retrieve proposal',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   PUT /api/proposals/version/:id/status
 * @desc    Update proposal version status
 * @access  Public
 * @param   id - The version ID
 * @body    { status: string }
 */
router.put('/version/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Version ID is required',
          ['Version ID parameter is missing'],
          400
        )
      );
    }

    const validStatuses = ['draft', 'submitted', 'under_review', 'approved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Invalid status',
          [`Status must be one of: ${validStatuses.join(', ')}`],
          400
        )
      );
    }

    const updatedVersion = await ProposalDatabaseService.updateVersionStatus(id, status);

    res.json(ValidationUtils.createSuccessResponse(
      updatedVersion,
      `Version status updated to ${status}`
    ));

  } catch (error) {
    console.error('API Error - Update version status:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to update version status',
        [error.message],
        500
      )
    );
  }
});

/**
 * @route   POST /api/proposals/:proposalId/refine
 * @desc    Refine an existing proposal by creating a new version
 * @access  Public
 * @param   proposalId - The proposal ID
 * @body    { config?: Object, createdBy?: string }
 */
router.post('/:proposalId/refine', async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { config, createdBy } = req.body;

    if (!proposalId) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'Proposal ID is required',
          ['Proposal ID parameter is missing'],
          400
        )
      );
    }

    // Fetch the existing proposal
    const existingProposal = await ProposalDatabaseService.getProposalWithVersions(proposalId);

    if (!existingProposal) {
      return res.status(404).json(
        ValidationUtils.createErrorResponse(
          'Proposal not found',
          [`Proposal with ID ${proposalId} does not exist`],
          404
        )
      );
    }

    // Get the latest version's proposal data
    const latestVersion = existingProposal.versions[0]; // versions are ordered by version_number desc

    // Normalize the config if provided, otherwise use existing proposal data
    let proposalData;
    if (config) {
      // First normalize the config from the request body, handling various JSON structures
      proposalData = ValidationUtils.normalizeConfig(config);
    } else {
      // Try to normalize the entire request body in case config is wrapped in JSON/config objects
      const normalizedBody = ValidationUtils.normalizeConfig(req.body);
      if (normalizedBody && normalizedBody.Company && normalizedBody.Templates) {
        proposalData = normalizedBody;
      } else {
        proposalData = latestVersion.proposal_data;
      }
    }

    if (!proposalData) {
      return res.status(400).json(
        ValidationUtils.createErrorResponse(
          'No proposal data available',
          ['No proposal data found in existing version and none provided in request'],
          400
        )
      );
    }

    // Get the next version number
    const nextVersionNumber = await ProposalDatabaseService.getNextVersionNumber(proposalId);
    const versionLabel = `v${nextVersionNumber}`;

    // Generate versioned filename for this specific version
    const versionedFilename = ProposalDatabaseService.generateVersionedFilename(
      proposalData.Company,
      nextVersionNumber
    );

    // Generate the new proposal using the generator service with custom filename
    const result = await proposalService.generateProposal(proposalData, versionedFilename);

    // Create the new version in the database with the generated document path
    const newVersion = await ProposalDatabaseService.createProposalVersion({
      proposalId: proposalId,
      versionNumber: nextVersionNumber,
      versionLabel: versionLabel,
      documentPath: versionedFilename,
      status: 'submitted',
      createdBy: createdBy || 'db46f7c1-a3ea-4a11-855b-4b3c3cd76562',
      proposalData: proposalData
    });

    // Prepare response data
    const responseData = {
      proposal: {
        id: existingProposal.id,
        title: existingProposal.title
      },
      newVersion: {
        id: newVersion.id,
        versionNumber: nextVersionNumber,
        versionLabel: versionLabel,
        documentPath: newVersion.document_path,
        status: newVersion.status,
        createdAt: newVersion.created_at
      },
      generationResult: {
        fileName: result.fileName,
        location: result.location,
        fileSize: result.fileSize,
        sectionsCount: result.sectionsCount,
        templatesProcessed: result.templatesProcessed
      }
    };

    res.json(ValidationUtils.createSuccessResponse(
      responseData,
      `Proposal refined successfully. Created ${versionLabel} with ${result.sectionsCount} sections.`
    ));

  } catch (error) {
    console.error('API Error - Refine proposal:', error);
    res.status(500).json(
      ValidationUtils.createErrorResponse(
        'Failed to refine proposal',
        [error.message],
        500
      )
    );
  }
});

module.exports = router;