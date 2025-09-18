const path = require('path');
const FrontPageService = require('./frontPageService');
const TemplateProcessorService = require('./templateProcessorService');
const PDFMergerService = require('./pdfMergerService');
const ProposalDatabaseService = require('./proposalDatabaseService');
const supabase = require('../config/supabase');
const { generateTOCProgrammatically } = require('../tableOfContent');
const FileUtils = require('../utils/fileUtils');
const ValidationUtils = require('../utils/validationUtils');

/**
 * Proposal Generator Service
 * Main service orchestrating the proposal generation process
 */
class ProposalGeneratorService {

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'Templates');
    this.outputDir = path.join(__dirname, '..', 'Output');
  }

  /**
   * Generate a complete proposal PDF based on configuration
   */
  async generateProposal(config, outputFileName = null) {
    try {
      // Validate configuration
      const validationErrors = ValidationUtils.validateProposalConfig(config);
      if (validationErrors.length > 0) {
        throw new Error(`Configuration validation failed: ${validationErrors.join(', ')}`);
      }

      console.log('🚀 Starting proposal generation...');
      console.log(`📊 Company: ${config.Company}`);
      console.log(`📄 Templates to process: ${config.Templates.length}`);
      
      // Setup paths
      FileUtils.ensureDirectoryExists(this.outputDir);

      let finalOutputPath;
      let dbResult = null;

      if (outputFileName) {
        // Use provided filename (for refine operations)
        console.log(`\n📁 Using provided filename: ${outputFileName}`);
        finalOutputPath = path.join(this.outputDir, outputFileName);
      } else {
        // Create or find proposal in database first to get version info
        console.log('\n🗄️ Creating/updating proposal in database...');
        dbResult = await ProposalDatabaseService.createProposalWithVersion(config, null);

        // Generate versioned filename
        const versionedFilename = ProposalDatabaseService.generateVersionedFilename(
          config.Company,
          dbResult.versionNumber
        );
        finalOutputPath = path.join(this.outputDir, versionedFilename);
      }
      
      // Step 1: Generate Front Page
      console.log('\n1️⃣ Generating front page...');
      const frontPagePath = await FrontPageService.generateFrontPage(
        config, 
        this.templatesDir, 
        this.outputDir
      );
      
      // Step 2: Process templates and build TOC data
      console.log('\n2️⃣ Processing templates...');
      const { processedTemplates, tocData } = await TemplateProcessorService.processTemplates(
        config, 
        this.templatesDir, 
        this.outputDir
      );
      
      // Step 3: Generate Table of Contents
      console.log('\n3️⃣ Generating table of contents...');
      const tocPath = await this._generateTableOfContents(tocData);
      
      // Step 4: Merge all PDFs
      console.log('\n4️⃣ Merging final proposal...');
      await PDFMergerService.mergeFinalProposal(
        [frontPagePath, tocPath, ...processedTemplates], 
        finalOutputPath
      );
      
      // Step 5: Update database with final document path (only for new proposals)
      if (dbResult) {
        console.log('\n🗄️ Updating database with document path...');
        const documentPath = path.basename(finalOutputPath); // Just the filename, not the full path
        await supabase
          .from('proposal_versions')
          .update({ document_path: documentPath })
          .eq('id', dbResult.version.id);
      }

      // Step 6: Cleanup temporary files
      console.log('\n🧹 Cleaning up temporary files...');
      const allTempFiles = [frontPagePath, tocPath, ...processedTemplates];
      PDFMergerService.cleanupTempFiles(allTempFiles);

      // Generate result summary
      const result = this._generateResultSummary(finalOutputPath, tocData, config, dbResult);

      const versionInfo = dbResult ? dbResult.versionLabel : path.basename(outputFileName || finalOutputPath);
      console.log(`\n✅ Proposal ${versionInfo} generated successfully: ${finalOutputPath}`);
      return result;
      
    } catch (error) {
      console.error('❌ Error generating proposal:', error.message);
      throw error;
    }
  }

  /**
   * Generate proposal with custom configuration object
   */
  async generateCustomProposal(customConfig, outputFileName = null) {
    return await this.generateProposal(customConfig, outputFileName);
  }

  /**
   * Generate proposal from configuration file
   */
  async generateFromConfigFile(configFilePath = null, outputFileName = null) {
    const configPath = configFilePath || path.join(__dirname, '..', 'data.json');
    const config = FileUtils.loadConfig(configPath);
    return await this.generateProposal(config, outputFileName);
  }

  /**
   * Get proposal generation status/health check
   */
  async getStatus() {
    const templatesDir = this.templatesDir;
    const outputDir = this.outputDir;
    
    return {
      service: 'Proposal Generator',
      status: 'operational',
      templatesDirectory: templatesDir,
      outputDirectory: outputDir,
      templatesDirectoryExists: FileUtils.ensureDirectoryExists(templatesDir),
      outputDirectoryExists: FileUtils.ensureDirectoryExists(outputDir),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate templates availability
   */
  async validateTemplates(config) {
    const requiredTemplates = ['Template Company.pdf'];
    const templateFiles = config.Templates.map(t => t.fileName);
    requiredTemplates.push(...templateFiles);
    
    const missingTemplates = FileUtils.validateTemplatesExist(this.templatesDir, requiredTemplates);
    
    return {
      valid: missingTemplates.length === 0,
      missingTemplates,
      totalTemplates: requiredTemplates.length,
      availableTemplates: requiredTemplates.length - missingTemplates.length
    };
  }


  /**
   * Generate table of contents PDF
   * @private
   */
  async _generateTableOfContents(tocData) {
    const tocPath = path.join(this.outputDir, 'temp_toc.pdf');
    await generateTOCProgrammatically(tocPath, tocData);
    console.log(`✅ Table of contents generated with ${tocData.length} entries`);
    return tocPath;
  }

  /**
   * Generate result summary
   * @private
   */
  _generateResultSummary(outputPath, tocData, config, dbResult = null) {
    const fileSize = FileUtils.getFileSize(outputPath);
    const fileName = path.basename(outputPath);

    // Generate URL for the file (base_url/output/filename)
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const fileUrl = `${baseUrl}/api/proposals/download/${fileName}`;

    const result = {
      success: true,
      outputPath,
      fileName: fileName,
      location: fileUrl,
      fileSize: FileUtils.formatFileSize(fileSize),
      fileSizeBytes: fileSize,
      company: config.Company,
      sectionsCount: tocData.length,
      templatesProcessed: config.Templates.length,
      generatedAt: new Date().toISOString()
    };

    // Add database information if available
    if (dbResult) {
      result.database = {
        proposalId: dbResult.proposal.id,
        versionId: dbResult.version.id,
        versionNumber: dbResult.versionNumber,
        versionLabel: dbResult.versionLabel,
        status: dbResult.version.status
      };
    }

    return result;
  }
}

module.exports = ProposalGeneratorService;