const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * Front Page Service
 * Handles generation of proposal front pages using templates or programmatically
 */
class FrontPageService {
  
  /**
   * Generate the front page using Template Company.pdf template
   */
  static async generateFrontPage(config, templatesDir, outputDir) {
    const companyTemplatePath = path.join(templatesDir, 'Template Company.pdf');
    const frontPagePath = path.join(outputDir, 'temp_frontpage.pdf');
    
    if (!fs.existsSync(companyTemplatePath)) {
      console.warn('⚠️ Template Company.pdf not found, creating basic front page...');
      return await this.createBasicFrontPage(config, frontPagePath);
    }
    
    try {
      // Load company template
      const templateBytes = fs.readFileSync(companyTemplatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      
      // Try to fill company name and date fields
      await this.fillFormFields(form, config);
      
      // Clean up old page numbers
      this.addPageNumberCleanup(pdfDoc);
      
      // Flatten form to make it non-editable
      form.flatten();
      
      // Save front page
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(frontPagePath, pdfBytes);
      
      console.log('✅ Front page generated using Template Company.pdf');
      return frontPagePath;
      
    } catch (error) {
      console.warn('⚠️ Error with Template Company.pdf, creating basic front page...');
      return await this.createBasicFrontPage(config, frontPagePath);
    }
  }

  /**
   * Fill form fields in the template
   */
  static async fillFormFields(form, config) {
    try {
      const companyField = form.getTextField('CompanyName');
      companyField.setText(config.Company || 'Company Name');
      console.log(`   ✅ Filled CompanyName: ${config.Company || 'Company Name'}`);
    } catch (e) {
      console.warn('⚠️ CompanyName field not found in template');
    }
    
    try {
      const dateField = form.getTextField('date');
      const currentYear = new Date().getFullYear().toString();
      dateField.setText(currentYear);
      console.log(`   ✅ Filled date: ${currentYear}`);
    } catch (e) {
      console.warn('⚠️ date field not found in template');
    }
  }

  /**
   * Add white rectangles to clean up old page numbers
   */
  static addPageNumberCleanup(pdfDoc) {
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const { width } = page.getSize();
      
      // Add white rectangle to hide old page numbers at bottom
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: 30,
        color: rgb(1, 1, 1),
      });
    }
  }

  /**
   * Create a basic front page programmatically
   */
  static async createBasicFrontPage(config, outputPath) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Draw company name
    const companyText = config.Company || 'Company Proposal';
    page.drawText(companyText, {
      x: 50,
      y: height - 100,
      size: 24,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    // Draw proposal title
    page.drawText('Asset Advisory Proposal', {
      x: 50,
      y: height - 150,
      size: 18,
      font: regularFont,
      color: rgb(0, 0, 0),
    });
    
    // Draw date
    const currentDate = new Date().toLocaleDateString();
    page.drawText(`Generated: ${currentDate}`, {
      x: 50,
      y: height - 200,
      size: 12,
      font: regularFont,
      color: rgb(0.5, 0.5, 0.5),
    });
    
    const pdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, pdfBytes);
    
    console.log('✅ Basic front page created programmatically');
    return outputPath;
  }
}

module.exports = FrontPageService;