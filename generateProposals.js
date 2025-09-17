const ProposalGeneratorService = require('./services/proposalGeneratorService');

/**
 * Legacy wrapper for backward compatibility
 * This maintains the original API while using the new modular structure
 */

const proposalService = new ProposalGeneratorService();

/**
 * Generate a complete proposal PDF based on data.json configuration
 */
async function generateProposals(dataFilePath = null, outputFileName = null) {
  if (dataFilePath) {
    return await proposalService.generateFromConfigFile(dataFilePath, outputFileName);
  } else {
    return await proposalService.generateFromConfigFile(null, outputFileName);
  }
}

/**
 * Generate proposal with custom configuration
 */
async function generateCustomProposal(customConfig, outputFileName = null) {
  return await proposalService.generateCustomProposal(customConfig, outputFileName);
}

// Run if called directly (backward compatibility)
if (require.main === module) {
  generateProposals()
    .then(result => {
      console.log(`\n🎉 Proposal generation completed!`);
      console.log(`📄 Output: ${result.outputPath}`);
      console.log(`📊 Company: ${result.company}`);
      console.log(`📋 Sections: ${result.sectionsCount}`);
    })
    .catch(error => {
      console.error('\n💥 Proposal generation failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  generateProposals,
  generateCustomProposal,
  ProposalGeneratorService
};