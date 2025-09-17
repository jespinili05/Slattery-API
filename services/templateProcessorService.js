const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

/**
 * Template Processor Service
 * Handles processing of different template types (non-editable, editable, staff profiles)
 */
class TemplateProcessorService {

  /**
   * Process all templates and handle different types
   */
  static async processTemplates(config, templatesDir, outputDir) {
    const processedTemplates = [];
    const tocData = [];
    let pageCounter = 1; // Content pages start numbering from 1
    
    for (const template of config.Templates) {
      console.log(`   Processing: ${template.name}`);
      
      try {
        if (template.name === 'Staff Profiles' && template.staffs && template.staffs.length > 0) {
          // Handle staff profiles specially
          const staffResults = await this.processStaffProfiles(template, templatesDir, outputDir);
          processedTemplates.push(...staffResults.paths);
          
          // Add TOC entries for staff profiles
          tocData.push({ title: 'Staff Profiles', page: pageCounter });
          pageCounter += staffResults.totalPages;
          
        } else if (template.editable === true && template.fieldValues) {
          // Handle editable templates with form fields
          const processedPath = await this.processEditableTemplate(template, templatesDir, outputDir);
          if (processedPath) {
            processedTemplates.push(processedPath);
            tocData.push({ title: template.name, page: pageCounter });
            pageCounter += await this.getPageCount(processedPath);
          }
          
        } else {
          // Handle non-editable templates
          const templatePath = path.join(templatesDir, template.fileName);
          if (fs.existsSync(templatePath)) {
            processedTemplates.push(templatePath);
            tocData.push({ title: template.name, page: pageCounter });
            pageCounter += await this.getPageCount(templatePath);
          } else {
            console.warn(`   ⚠️ Template not found: ${template.fileName}`);
          }
        }
        
      } catch (error) {
        console.warn(`   ⚠️ Error processing ${template.name}: ${error.message}`);
      }
    }
    
    return { processedTemplates, tocData };
  }

  /**
   * Process staff profiles section
   */
  static async processStaffProfiles(template, templatesDir, outputDir) {
    const staffPaths = [];
    let totalPages = 0;
    
    // Add main staff profiles page if it exists
    const mainStaffPath = path.join(templatesDir, template.fileName);
    if (fs.existsSync(mainStaffPath)) {
      staffPaths.push(mainStaffPath);
      totalPages += await this.getPageCount(mainStaffPath);
    }
    
    // Add individual staff profile PDFs
    for (const staff of template.staffs) {
      const staffPath = path.join(templatesDir, staff.fileName);
      if (fs.existsSync(staffPath)) {
        staffPaths.push(staffPath);
        totalPages += await this.getPageCount(staffPath);
        console.log(`     Added: ${staff.name}`);
      } else {
        console.warn(`     ⚠️ Staff profile not found: ${staff.fileName}`);
      }
    }
    
    return { paths: staffPaths, totalPages };
  }

  /**
   * Process editable template with form field values
   */
  static async processEditableTemplate(template, templatesDir, outputDir) {
    const templatePath = path.join(templatesDir, template.fileName);
    
    if (!fs.existsSync(templatePath)) {
      console.warn(`     ⚠️ Editable template not found: ${template.fileName}`);
      return null;
    }
    
    const outputPath = path.join(outputDir, `temp_${template.fileName}`);
    
    try {
      // Load template
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();
      
      // Fill form fields with provided values
      for (const [fieldName, value] of Object.entries(template.fieldValues)) {
        try {
          const field = form.getTextField(fieldName);
          field.setText(value.toString());
          console.log(`     ✅ Filled field: ${fieldName} = ${value}`);
        } catch (error) {
          console.warn(`     ⚠️ Field not found: ${fieldName}`);
        }
      }
      
      // Add white rectangles to hide old page numbers on all pages
      this.addPageNumberCleanup(pdfDoc);
      
      // Flatten form to make fields non-editable
      form.flatten();
      
      // Save processed template
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);
      
      return outputPath;
      
    } catch (error) {
      console.error(`     ❌ Error processing editable template: ${error.message}`);
      return templatePath; // Return original if processing fails
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
   * Get page count of a PDF file
   */
  static async getPageCount(pdfPath) {
    try {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdf = await PDFDocument.load(pdfBytes);
      return pdf.getPageCount();
    } catch (error) {
      console.warn(`⚠️ Could not get page count for ${pdfPath}: ${error.message}`);
      return 1; // Assume 1 page if can't read
    }
  }
}

module.exports = TemplateProcessorService;