const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

// Dummy data matching the Slattery template structure
const SLATTERY_TOC_DATA = [
  { title: "Table Of Contents", page: 2 },
  { title: "An Australian Business With A Global Reach", page: 3 },
  { title: "Slattery Asset Advisory", page: 4 },
  { title: "Slattery Auctions And Valuations", page: 5 },
  { title: "Remarketing Solutions", page: 6 },
  { title: "Skill And Expertise", page: 7 },
  { title: "Technology Leaders", page: 8 },
  { title: "Our Client Promise", page: 9 },
  { title: "Staff Profiles", page: 10 },
  { title: "Our Offices & Auctions Sites - NSW", page: 51 },
  { title: "Our Offices & Auction Sites - NSW", page: 52 },
  { title: "Our Offices & Auction Sites - VIC", page: 53 },
  { title: "Our Offices & Auction Sites - QLD", page: 54 },
  { title: "Our Offices & Auction Sites - WA", page: 55 },
  { title: "Our Offices & Auction Sites - ROMA", page: 56 },
  { title: "Road Transport", page: 57 },
  { title: "Automotive", page: 58 },
  { title: "Mining & Earthmoving", page: 59 },
  { title: "Aviation", page: 60 },
  { title: "Agricultural", page: 61 },
  { title: "Marine", page: 62 },
  { title: "Manufacturing", page: 63 },
  { title: "Retail", page: 64 },
  { title: "Specialised Assets", page: 65 },
  { title: "Valuations & Asset Management Overview", page: 66 },
  { title: "Valuation Experience", page: 67 },
  { title: "Valuation Reports", page: 68 },
  { title: "Sample Valuation", page: 69 },
  { title: "Marketing", page: 79 },
  { title: "Transportation Solutions", page: 94 },
  { title: "Online Vendor Interface", page: 95 },
  { title: "Online Auctions", page: 96 },
  { title: "Our Fee Structure", page: 97 },
  { title: "Trucks & Machinery", page: 98 },
  { title: "Small Plant & Equipment", page: 99 },
  { title: "Motor Vehicles", page: 100 },
  { title: "Office Furniture & IT Equipment", page: 101 },
  { title: "Specialised Auctions", page: 102 },
  { title: "Reporting", page: 104 },
  { title: "Insurances", page: 105 },
  { title: "Trust Account & Payments", page: 105 },
  { title: "Workplace Health", page: 106 },
  { title: "Code of Ethics", page: 107 },
  { title: "References", page: 108 },
  { title: "Member Association", page: 110 },
  { title: "Member Association", page: 111 },
  { title: "Member Association", page: 112 },
  { title: "Member Association", page: 113 },
  { title: "Member Association", page: 114 },
  { title: "Member Association", page: 115 },
  { title: "Member Association", page: 116 },
];

/**
 * Generate a Table of Contents PDF programmatically using pdf-lib
 * Mimics the Slattery template design with 2-column layout
 */
async function generateTOCProgrammatically(outputPath, tocData = SLATTERY_TOC_DATA) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
  const { width, height } = page.getSize();
  
  // Load fonts
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Header styling - matching the template
  const headerY = height - 100;
  const headerText = "TABLE OF\nCONTENTS";
  
  // Draw green "TABLE OF CONTENTS" header
  page.drawText(headerText, {
    x: 50,
    y: headerY,
    size: 42,
    font: boldFont,
    color: rgb(0.42, 0.73, 0.31), // Green color matching template
    lineHeight: 45,
  });
  
  // Content area setup
  const contentStartY = headerY - 100;
  const leftColumnX = 50;
  const rightColumnX = width / 2 + 20;
  const columnWidth = (width / 2) - 70;
  
  let leftY = contentStartY;
  let rightY = contentStartY;
  let useLeftColumn = true;
  
  // Draw TOC entries in 2-column layout
  for (let i = 0; i < tocData.length; i++) {
    const entry = tocData[i];
    const currentX = useLeftColumn ? leftColumnX : rightColumnX;
    const currentY = useLeftColumn ? leftY : rightY;
    
    // Check if we need to move to next column or page
    if (currentY < 100) {
      if (useLeftColumn) {
        useLeftColumn = false;
        continue; // Try right column
      } else {
        // Need new page (not implemented in this example)
        break;
      }
    }
    
    // Text truncation and alignment setup
    const maxTitleWidth = columnWidth - 50; // Reserve space for page numbers and dots
    const pageText = entry.page.toString();
    const pageWidth = regularFont.widthOfTextAtSize(pageText, 11);
    
    // Truncate title if too long
    let titleText = entry.title;
    let titleWidth = regularFont.widthOfTextAtSize(titleText, 11);
    
    if (titleWidth > maxTitleWidth) {
      // Find the maximum characters that fit with "..."
      let truncatedTitle = titleText;
      while (titleWidth > maxTitleWidth - 20 && truncatedTitle.length > 10) {
        truncatedTitle = truncatedTitle.slice(0, -1);
        titleWidth = regularFont.widthOfTextAtSize(truncatedTitle + '...', 11);
      }
      titleText = truncatedTitle + '...';
      titleWidth = regularFont.widthOfTextAtSize(titleText, 11);
    }
    
    // Draw title
    page.drawText(titleText, {
      x: currentX,
      y: currentY,
      size: 11,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    // Calculate dot leader position and count
    const dotsStartX = currentX + titleWidth + 5;
    const pageNumberX = currentX + columnWidth - pageWidth;
    const dotsEndX = pageNumberX - 5;
    const dotsWidth = dotsEndX - dotsStartX;
    const dotCount = Math.max(0, Math.floor(dotsWidth / 4));
    const dots = '.'.repeat(dotCount);
    
    // Draw dots if there's space
    if (dotsWidth > 10) {
      page.drawText(dots, {
        x: dotsStartX,
        y: currentY,
        size: 11,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5), // Lighter gray for dots
      });
    }
    
    // Draw page number (right-aligned within column)
    page.drawText(pageText, {
      x: pageNumberX,
      y: currentY,
      size: 11,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    // Update Y position
    if (useLeftColumn) {
      leftY -= 16;
    } else {
      rightY -= 16;
    }
    
    // Switch columns after each entry
    useLeftColumn = !useLeftColumn;
  }
  
  // Note: No page number added to TOC page as per requirements
  
  // Save the PDF
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  
  console.log(` Programmatic TOC PDF generated: ${outputPath}`);
  console.log(`=� Entries: ${tocData.length}`);
}

/**
 * Use the existing PDF template and fill form fields with TOC data
 * This approach uses the actual Slattery template design
 */
async function generateTOCFromTemplate(templatePath, outputPath, tocData = SLATTERY_TOC_DATA) {
  try {
    // Read the template PDF
    const templateBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);
    
    // Get the form from the template
    const form = pdfDoc.getForm();
    const fields = form.getFields();
    
    console.log('=� Available form fields in template:');
    fields.forEach(field => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      console.log(`  - ${fieldName} (${fieldType})`);
    });
    
    // Check if TableOfContents field exists
    try {
      const tocField = form.getTextField('TableOfContents');
      
      // Format TOC data as text for the form field
      const tocText = tocData.map(entry => {
        const dots = '.'.repeat(Math.max(0, 50 - entry.title.length - entry.page.toString().length));
        return `${entry.title} ${dots} ${entry.page}`;
      }).join('\n');
      
      // Fill the form field
      tocField.setText(tocText);
      
      console.log(' Filled TableOfContents form field with TOC data');
      
    } catch (error) {
      console.warn('�  TableOfContents field not found in template, trying alternative approach...');
      
      // Alternative: Try to find and fill any text fields
      const textFields = form.getFields().filter(field => field.constructor.name === 'PDFTextField');
      
      if (textFields.length > 0) {
        const firstTextField = textFields[0];
        const tocText = tocData.map(entry => 
          `${entry.title} ............................ ${entry.page}`
        ).join('\n');
        
        firstTextField.setText(tocText);
        console.log(` Filled field "${firstTextField.getName()}" with TOC data`);
      } else {
        console.warn('�  No suitable text fields found in template');
      }
    }
    
    // Flatten the form to make fields non-editable
    form.flatten();
    
    // Save the filled PDF
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log(` Template-based TOC PDF generated: ${outputPath}`);
    console.log(`=� Entries: ${tocData.length}`);
    
  } catch (error) {
    console.error('L Error generating TOC from template:', error.message);
    throw error;
  }
}

/**
 * Test function to generate both versions
 */
async function testTOCGeneration() {
  const templatePath = path.join(__dirname, 'Templates', 'Table of Contents.pdf');
  const outputDir = path.join(__dirname, 'Output');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const programmaticOutput = path.join(outputDir, 'TOC_Programmatic.pdf');
  const templateOutput = path.join(outputDir, 'TOC_Template.pdf');
  
  console.log('>� Testing TOC generation...\n');
  
  // Test programmatic generation
  console.log('1. Generating programmatic TOC...');
  await generateTOCProgrammatically(programmaticOutput);
  
  console.log('\n2. Generating template-based TOC...');
  await generateTOCFromTemplate(templatePath, templateOutput);
  
  console.log('\n Test complete! Check the Output folder for results.');
}

// Run test if this file is executed directly
if (require.main === module) {
  testTOCGeneration().catch(console.error);
}

module.exports = {
  generateTOCProgrammatically,
  generateTOCFromTemplate,
  SLATTERY_TOC_DATA,
  testTOCGeneration
};