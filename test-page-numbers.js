const ProposalGeneratorService = require('./services/proposalGeneratorService');

/**
 * Test script to verify page numbering behavior
 * Front page and TOC should not have page numbers
 * Content pages should have page numbers starting from page 3
 */
async function testPageNumbers() {
  console.log('🧪 Testing page numbering behavior...\n');

  const proposalService = new ProposalGeneratorService();

  // Create a minimal test configuration
  const testConfig = {
    Company: "Test Company",
    Templates: [
      {
        name: "Test Template 1",
        fileName: "Our Client Promise.pdf",
        editable: false
      },
      {
        name: "Test Template 2",
        fileName: "Our Contact Details.pdf",
        editable: false
      }
    ]
  };

  try {
    const result = await proposalService.generateProposal(testConfig, 'Page-Number-Test.pdf');
    
    console.log('✅ Test proposal generated successfully!');
    console.log('📊 Results:');
    console.log(`   Output: ${result.fileName}`);
    console.log(`   Company: ${result.company}`);
    console.log(`   Sections: ${result.sectionsCount}`);
    console.log(`   File Size: ${result.fileSize}`);
    
    console.log('\n📋 Expected page numbering:');
    console.log('   Physical Page 1: Front Page (NO page number displayed)');
    console.log('   Physical Page 2: Table of Contents (NO page number displayed)');
    console.log('   Physical Page 3+: Content pages (WITH page numbers: "Page 1 of X", "Page 2 of X", etc.)');
    
    console.log('\n🎯 Please check the generated PDF to verify page numbering!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testPageNumbers();
}

module.exports = testPageNumbers;