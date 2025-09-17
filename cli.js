#!/usr/bin/env node

const ProposalGeneratorService = require('./services/proposalGeneratorService');
const ValidationUtils = require('./utils/validationUtils');

/**
 * Command Line Interface for Proposal Generator
 * Allows generation of proposals from command line
 */
class CLI {
  constructor() {
    this.proposalService = new ProposalGeneratorService();
  }

  /**
   * Display help information
   */
  showHelp() {
    console.log(`
🚀 Slattery Proposal Generator CLI

Usage:
  node cli.js [command] [options]

Commands:
  generate                 Generate proposal using data.json
  generate-custom          Generate proposal with inline configuration
  status                   Check service status
  validate                 Validate templates
  help                     Show this help message

Options:
  --config <path>          Path to configuration file (default: data.json)
  --output <filename>      Output filename (default: auto-generated)
  --company <name>         Company name for custom generation

Examples:
  node cli.js generate
  node cli.js generate --config custom-data.json --output "My Proposal.pdf"
  node cli.js status
  node cli.js validate
  node cli.js help
`);
  }

  /**
   * Parse command line arguments
   */
  parseArgs() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    const options = {};

    for (let i = 1; i < args.length; i += 2) {
      const flag = args[i];
      const value = args[i + 1];

      if (flag && flag.startsWith('--') && value) {
        options[flag.substring(2)] = value;
      }
    }

    return { command, options };
  }

  /**
   * Execute CLI command
   */
  async run() {
    try {
      const { command, options } = this.parseArgs();

      switch (command.toLowerCase()) {
        case 'generate':
          await this.generateCommand(options);
          break;

        case 'generate-custom':
          await this.generateCustomCommand(options);
          break;

        case 'status':
          await this.statusCommand();
          break;

        case 'validate':
          await this.validateCommand(options);
          break;

        case 'help':
        case '--help':
        case '-h':
        default:
          this.showHelp();
          break;
      }
    } catch (error) {
      console.error('❌ CLI Error:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate proposal command
   */
  async generateCommand(options) {
    console.log('🚀 Generating proposal...\n');

    try {
      const result = await this.proposalService.generateFromConfigFile(
        options.config,
        options.output
      );

      console.log('\n✅ Proposal generation completed successfully!');
      console.log('📊 Summary:');
      console.log(`   Company: ${result.company}`);
      console.log(`   Output: ${result.fileName}`);
      console.log(`   File Size: ${result.fileSize}`);
      console.log(`   Sections: ${result.sectionsCount}`);
      console.log(`   Templates: ${result.templatesProcessed}`);
      console.log(`   Generated: ${result.generatedAt}`);

    } catch (error) {
      throw new Error(`Failed to generate proposal: ${error.message}`);
    }
  }

  /**
   * Generate custom proposal command
   */
  async generateCustomCommand(options) {
    console.log('🚀 Generating custom proposal...\n');

    if (!options.company) {
      throw new Error('--company option is required for custom generation');
    }

    // Create minimal configuration
    const customConfig = {
      Company: options.company,
      Templates: [
        {
          name: "Sample Template",
          fileName: "Our Client Promise.pdf",
          editable: false
        }
      ]
    };

    try {
      const result = await this.proposalService.generateCustomProposal(
        customConfig,
        options.output
      );

      console.log('\n✅ Custom proposal generation completed!');
      console.log('📊 Summary:');
      console.log(`   Company: ${result.company}`);
      console.log(`   Output: ${result.fileName}`);
      console.log(`   File Size: ${result.fileSize}`);

    } catch (error) {
      throw new Error(`Failed to generate custom proposal: ${error.message}`);
    }
  }

  /**
   * Status command
   */
  async statusCommand() {
    console.log('🔍 Checking service status...\n');

    try {
      const status = await this.proposalService.getStatus();

      console.log('📊 Service Status:');
      console.log(`   Service: ${status.service}`);
      console.log(`   Status: ${status.status}`);
      console.log(`   Templates Directory: ${status.templatesDirectory}`);
      console.log(`   Output Directory: ${status.outputDirectory}`);
      console.log(`   Last Check: ${status.timestamp}`);
      console.log('\n✅ Service is operational');

    } catch (error) {
      throw new Error(`Failed to get status: ${error.message}`);
    }
  }

  /**
   * Validate templates command
   */
  async validateCommand(options) {
    console.log('🔍 Validating templates...\n');

    try {
      // Load configuration
      const config = await this.proposalService._loadConfig(options.config);
      const validation = await this.proposalService.validateTemplates(config);

      console.log('📊 Template Validation:');
      console.log(`   Total Templates: ${validation.totalTemplates}`);
      console.log(`   Available Templates: ${validation.availableTemplates}`);
      console.log(`   Missing Templates: ${validation.missingTemplates.length}`);

      if (validation.missingTemplates.length > 0) {
        console.log('\n❌ Missing Templates:');
        validation.missingTemplates.forEach(template => {
          console.log(`   - ${template}`);
        });
        console.log('\n⚠️  Please ensure all required templates are in the Templates directory');
      } else {
        console.log('\n✅ All templates are available');
      }

    } catch (error) {
      throw new Error(`Failed to validate templates: ${error.message}`);
    }
  }
}

// Run CLI if called directly
if (require.main === module) {
  const cli = new CLI();
  cli.run();
}

module.exports = CLI;