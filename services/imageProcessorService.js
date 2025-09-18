const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');

/**
 * Image Processor Service
 * Handles dynamic image insertion into PDF templates
 */
class ImageProcessorService {

  /**
   * Process template with dynamic images
   * @param {string} templatePath - Path to the PDF template
   * @param {Object} imageMapping - Mapping of field names to image paths
   * @param {string} outputPath - Path where processed PDF should be saved
   */
  static async processTemplateWithImages(templatePath, imageMapping, outputPath) {
    try {
      // Load the PDF template
      const templateBytes = fs.readFileSync(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      const form = pdfDoc.getForm();

      console.log(`     📸 Processing template with ${Object.keys(imageMapping).length} images`);

      // Process each image mapping
      for (const [fieldName, imagePath] of Object.entries(imageMapping)) {
        if (imagePath && fs.existsSync(imagePath)) {
          try {
            await this.insertImageIntoField(pdfDoc, form, fieldName, imagePath);
            console.log(`     ✅ Inserted image: ${fieldName} -> ${path.basename(imagePath)}`);
          } catch (error) {
            console.warn(`     ⚠️ Failed to insert image for ${fieldName}: ${error.message}`);
          }
        } else {
          console.warn(`     ⚠️ Image not found for ${fieldName}: ${imagePath}`);
        }
      }

      // Flatten the form to make it non-editable
      form.flatten();

      // Now draw all queued images on top of the flattened form
      console.log(`     🎨 Drawing queued images...`);
      const pages = pdfDoc.getPages();
      let totalImagesDrawn = 0;

      for (const page of pages) {
        if (page._imagesToDraw && page._imagesToDraw.length > 0) {
          for (const imageInfo of page._imagesToDraw) {
            try {
              // Draw the image directly
              page.drawImage(imageInfo.image, {
                x: imageInfo.x,
                y: imageInfo.y,
                width: imageInfo.width,
                height: imageInfo.height,
              });
              console.log(`     ✅ Drew image for ${imageInfo.fieldName}`);
              totalImagesDrawn++;
            } catch (error) {
              console.warn(`     ⚠️ Failed to draw image for ${imageInfo.fieldName}: ${error.message}`);
            }
          }
          // Clean up the temporary property
          delete page._imagesToDraw;
        }
      }

      console.log(`     🖼️ Total images drawn: ${totalImagesDrawn}`);

      // Save the processed PDF
      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(outputPath, pdfBytes);

      console.log(`     📄 Saved processed PDF: ${path.basename(outputPath)}`);
      return outputPath;

    } catch (error) {
      console.error(`     ❌ Error processing template with images: ${error.message}`);
      throw error;
    }
  }

  /**
   * Insert an image into a specific form field area
   * @param {PDFDocument} pdfDoc - The PDF document
   * @param {PDFForm} form - The PDF form
   * @param {string} fieldName - Name of the form field
   * @param {string} imagePath - Path to the image file
   */
  static async insertImageIntoField(pdfDoc, form, fieldName, imagePath) {
    try {
      // Try to get the field - it could be a text field or button field
      let field = null;
      let widgets = null;

      try {
        // First try as a text field
        field = form.getTextField(fieldName);
        widgets = field.acroField.getWidgets();
      } catch (textFieldError) {
        try {
          // Then try as a button field
          field = form.getButton(fieldName);
          widgets = field.acroField.getWidgets();
        } catch (buttonFieldError) {
          // Try to find the field by iterating through all fields
          const allFields = form.getFields();
          for (const f of allFields) {
            if (f.getName() === fieldName) {
              field = f;
              widgets = f.acroField.getWidgets();
              break;
            }
          }
          if (!field) {
            throw new Error(`Field "${fieldName}" not found in PDF form`);
          }
        }
      }

      if (widgets.length === 0) {
        throw new Error(`No widgets found for field ${fieldName}`);
      }

      // Get the first widget (form field location)
      const widget = widgets[0];
      const rect = widget.getRectangle();

      // For button fields, we need to find the page differently
      let targetPage = null;
      let pageRef = null;

      // Try to get page reference
      try {
        if (typeof widget.getPageRef === 'function') {
          pageRef = widget.getPageRef();
        } else if (widget.P) {
          pageRef = widget.P;
        }
      } catch (error) {
        // If we can't get page reference, we'll find it another way
      }

      // Find the page that contains this field
      const pages = pdfDoc.getPages();

      if (pageRef) {
        for (const page of pages) {
          if (page.ref === pageRef) {
            targetPage = page;
            break;
          }
        }
      }

      // If we couldn't find the page by reference, assume it's on the first page
      // This is a fallback for button fields that don't provide proper page references
      if (!targetPage) {
        console.warn(`Could not determine page for field ${fieldName}, using first page`);
        targetPage = pages[0];
      }

      if (!targetPage) {
        throw new Error(`Could not find any page for field ${fieldName}`);
      }

      // Load and embed the image
      const imageBytes = fs.readFileSync(imagePath);
      let image;

      const ext = path.extname(imagePath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        image = await pdfDoc.embedJpg(imageBytes);
      } else if (ext === '.png') {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        throw new Error(`Unsupported image format: ${ext}`);
      }

      // Calculate image dimensions to fit within the field
      const fieldWidth = rect.width;
      const fieldHeight = rect.height;
      const imageAspectRatio = image.width / image.height;
      const fieldAspectRatio = fieldWidth / fieldHeight;

      let drawWidth, drawHeight;

      if (imageAspectRatio > fieldAspectRatio) {
        // Image is wider, fit to width
        drawWidth = fieldWidth;
        drawHeight = fieldWidth / imageAspectRatio;
      } else {
        // Image is taller, fit to height
        drawHeight = fieldHeight;
        drawWidth = fieldHeight * imageAspectRatio;
      }

      // Center the image within the field
      const x = rect.x + (fieldWidth - drawWidth) / 2;
      const y = rect.y + (fieldHeight - drawHeight) / 2;


      // Store image info for later drawing (after form flattening)
      if (!targetPage._imagesToDraw) {
        targetPage._imagesToDraw = [];
      }

      // Store image info for drawing
      targetPage._imagesToDraw.push({
        image: image,
        x: x,
        y: y,
        width: drawWidth,
        height: drawHeight,
        fieldName: fieldName
      });

      console.log(`     📍 Queued image for ${fieldName}: ${drawWidth.toFixed(1)}x${drawHeight.toFixed(1)} at (${x.toFixed(1)}, ${y.toFixed(1)})`);

      // Clear the field if it's a text field
      if (field.constructor.name === 'PDFTextField') {
        field.setText('');
      }

    } catch (error) {
      console.error(`Error inserting image for field ${fieldName}:`, error.message);
      throw error;
    }
  }

  /**
   * Auto-map images from a directory to numbered field names
   * @param {string} imagesDir - Directory containing images
   * @param {string} fieldPrefix - Prefix for field names (e.g., 'Image')
   * @param {number} maxFields - Maximum number of fields to map
   * @param {string} fieldSuffix - Suffix for field names (e.g., '_af_image')
   */
  static autoMapImages(imagesDir, fieldPrefix = 'Image', maxFields = 7, fieldSuffix = '_af_image') {
    const imageMapping = {};

    if (!fs.existsSync(imagesDir)) {
      console.warn(`Images directory not found: ${imagesDir}`);
      return imageMapping;
    }

    // Get all image files from the directory
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png'].includes(ext);
      })
      .sort(); // Sort alphabetically for consistent mapping

    // Map images to numbered fields
    for (let i = 0; i < Math.min(imageFiles.length, maxFields); i++) {
      const fieldName = `${fieldPrefix}${i + 1}${fieldSuffix}`;
      const imagePath = path.join(imagesDir, imageFiles[i]);
      imageMapping[fieldName] = imagePath;

      console.log(`     🗂️ Mapped ${fieldName} -> ${imageFiles[i]}`);
    }

    return imageMapping;
  }

  /**
   * Create a test configuration for Member Association template
   */
  static createMemberAssociationTestConfig() {
    const imagesDir = path.join(__dirname, '..', 'Templates', 'Member Association');
    const imageMapping = this.autoMapImages(imagesDir, 'Image', 7, '_af_image');

    return {
      Company: 'Test Company - Member Association',
      Templates: [
        {
          name: 'Member Association',
          fileName: 'Member Association.pdf',
          editable: true,
          hasImages: true,
          imageMapping: imageMapping,
          fieldValues: {
            // Add any text field values if needed
          }
        }
      ]
    };
  }
}

module.exports = ImageProcessorService;