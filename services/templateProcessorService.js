const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const ImageProcessorService = require('./imageProcessorService');

/**
 * Template Processor Service
 * Handles processing of different template types (non-editable, editable, staff profiles)
 */
class TemplateProcessorService {

  /**
   * Process all templates and handle different types
   */
  static async processTemplates(config, templatesDir, outputDir) {
    const fs = require('fs');
    console.log(`\n🔍 DEBUG: Processing ${config.Templates.length} templates:`);
    config.Templates.forEach((template, index) => {
      console.log(`   ${index + 1}. "${template.name}" (editable: ${template.editable})`);
    });

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
          
        } else if (template.name === 'Member Association' && template.members) {
          // Handle Member Association template with dynamic images based on members array
          const processedPath = await this.processMemberAssociationTemplate(template, templatesDir, outputDir);
          if (processedPath) {
            processedTemplates.push(processedPath);
            tocData.push({ title: template.name, page: pageCounter });
            pageCounter += await this.getPageCount(processedPath);
          }

        } else if (template.editable === true && template.name === 'Member Association' && Array.isArray(template.fieldValues)) {
          // Handle Member Association template with fieldValues array for dynamic images
          // Convert fieldValues to members format for processing
          const convertedTemplate = {
            name: template.name,
            fileName: template.fileName,
            editable: false, // Use the working path
            members: template.fieldValues // Convert fieldValues to members
          };

          console.log(`     🔄 Converting fieldValues to members format for processing...`);
          const processedPath = await this.processMemberAssociationTemplate(convertedTemplate, templatesDir, outputDir);
          if (processedPath) {
            processedTemplates.push(processedPath);
            tocData.push({ title: template.name, page: pageCounter });
            pageCounter += await this.getPageCount(processedPath);
          }

        } else if (template.editable === true && (template.fieldValues || template.hasImages)) {
          // Handle editable templates with form fields and/or images
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
   * Process Member Association template with dynamic images based on members array
   */
  static async processMemberAssociationTemplate(template, templatesDir, outputDir) {
    const templatePath = path.join(templatesDir, template.fileName);

    if (!fs.existsSync(templatePath)) {
      console.warn(`     ⚠️ Member Association template not found: ${template.fileName}`);
      return null;
    }

    console.log(`     📋 Processing Member Association with ${template.members.length} members`);

    // Create image mapping from members array
    const imagesDir = path.join(templatesDir, 'Member Association');
    const imageMapping = {};

    for (let i = 0; i < template.members.length && i < 7; i++) {
      const memberName = template.members[i];
      const fieldName = `Image${i + 1}_af_image`;

      // Try different image formats
      const possibleExtensions = ['.jpg', '.jpeg', '.png'];
      let imagePath = null;

      for (const ext of possibleExtensions) {
        const testPath = path.join(imagesDir, memberName + ext);
        if (fs.existsSync(testPath)) {
          imagePath = testPath;
          break;
        }
      }

      if (imagePath) {
        imageMapping[fieldName] = imagePath;
        console.log(`     🔗 Mapped ${fieldName} -> ${memberName}${path.extname(imagePath)}`);
      } else {
        console.warn(`     ⚠️ Image not found for member: ${memberName}`);
      }
    }

    if (Object.keys(imageMapping).length === 0) {
      console.warn(`     ⚠️ No images found for Member Association`);
      // Return original template if no images found
      return templatePath;
    }

    // Create a modified template object that follows the working format
    const modifiedTemplate = {
      name: template.name,
      fileName: template.fileName,
      editable: true,
      hasImages: true,
      imageMapping: imageMapping,
      fieldValues: {} // Empty field values
    };

    // Use the existing processEditableTemplate method which handles images correctly
    console.log(`     🔄 Processing as editable template with images...`);
    const processedPath = await this.processEditableTemplate(modifiedTemplate, templatesDir, outputDir);

    if (processedPath) {
      console.log(`     ✅ Member Association processed with ${Object.keys(imageMapping).length} images`);
      return processedPath;
    } else {
      console.error(`     ❌ Failed to process Member Association template`);
      return templatePath; // Return original if processing fails
    }
  }

  /**
   * Process Member Association template with fieldValues array for dynamic images
   */
  static async processMemberAssociationWithFieldValues(template, templatesDir, outputDir) {
    const templatePath = path.join(templatesDir, template.fileName);

    if (!fs.existsSync(templatePath)) {
      console.warn(`     ⚠️ Member Association template not found: ${template.fileName}`);
      return null;
    }

    console.log(`     📋 Processing Member Association with ${template.fieldValues.length} field values`);

    // Create image mapping from fieldValues array (treating it as members)
    const imagesDir = path.join(templatesDir, 'Member Association');
    const imageMapping = {};

    for (let i = 0; i < template.fieldValues.length && i < 7; i++) {
      const memberName = template.fieldValues[i];
      const fieldName = `Image${i + 1}_af_image`;

      // Try different image formats
      const possibleExtensions = ['.jpg', '.jpeg', '.png'];
      let imagePath = null;

      for (const ext of possibleExtensions) {
        const testPath = path.join(imagesDir, memberName + ext);
        if (fs.existsSync(testPath)) {
          imagePath = testPath;
          break;
        }
      }

      if (imagePath) {
        imageMapping[fieldName] = imagePath;
        console.log(`     🔗 Mapped ${fieldName} -> ${memberName}${path.extname(imagePath)}`);
      } else {
        console.warn(`     ⚠️ Image not found for field value: ${memberName}`);
      }
    }

    if (Object.keys(imageMapping).length === 0) {
      console.warn(`     ⚠️ No images found for Member Association field values`);
      // Return original template if no images found
      return templatePath;
    }

    // Create a modified template object that follows the working format
    const modifiedTemplate = {
      name: template.name,
      fileName: template.fileName,
      editable: true,
      hasImages: true,
      imageMapping: imageMapping,
      fieldValues: {} // Empty text field values since we're using images
    };

    // Use the existing processEditableTemplate method which handles images correctly
    console.log(`     🔄 Processing as editable template with images (from fieldValues)...`);
    const processedPath = await this.processEditableTemplate(modifiedTemplate, templatesDir, outputDir);

    if (processedPath) {
      console.log(`     ✅ Member Association processed with ${Object.keys(imageMapping).length} images from fieldValues`);
      return processedPath;
    } else {
      console.error(`     ❌ Failed to process Member Association template with fieldValues`);
      return templatePath; // Return original if processing fails
    }
  }

  /**
   * Process editable template with form field values and/or images
   */
  static async processEditableTemplate(template, templatesDir, outputDir) {
    const templatePath = path.join(templatesDir, template.fileName);

    if (!fs.existsSync(templatePath)) {
      console.warn(`     ⚠️ Editable template not found: ${template.fileName}`);
      return null;
    }

    const outputPath = path.join(outputDir, `temp_${template.fileName}`);

    try {
      // Check if template has images to process
      if (template.hasImages && template.imageMapping) {
        console.log(`     🖼️ Processing template with images: ${template.name}`);
        return await ImageProcessorService.processTemplateWithImages(
          templatePath,
          template.imageMapping,
          outputPath
        );
      }

      // Load template for text field processing
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      // Fill form fields with provided values
      if (template.fieldValues) {
        for (const [fieldName, value] of Object.entries(template.fieldValues)) {
          try {
            const field = form.getTextField(fieldName);
            field.setText(value.toString());
            console.log(`     ✅ Filled field: ${fieldName} = ${value}`);
          } catch (error) {
            console.warn(`     ⚠️ Field not found: ${fieldName}`);
          }
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