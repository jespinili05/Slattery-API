const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

/**
 * PDF Merger Service
 * Handles merging multiple PDFs into a final proposal with consistent formatting
 */
class PDFMergerService {

  /**
   * Merge all PDFs into final proposal
   */
  static async mergeFinalProposal(pdfPaths, outputPath) {
    const mergedPdf = await PDFDocument.create();
    const font = await mergedPdf.embedFont(StandardFonts.Helvetica);
    
    let totalPages = 0;
    
    // Copy all pages from all PDFs
    for (const pdfPath of pdfPaths) {
      if (fs.existsSync(pdfPath)) {
        try {
          const pdfBytes = fs.readFileSync(pdfPath);
          const pdf = await PDFDocument.load(pdfBytes);
          const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
          
          // Add white rectangle cleanup to each page before adding to merged PDF
          pages.forEach(page => {
            this.addPageNumberCleanup(page);
            mergedPdf.addPage(page);
            totalPages++;
          });
          
          console.log(`   ✅ Merged: ${path.basename(pdfPath)}`);
        } catch (error) {
          console.error(`   ❌ Error merging ${pdfPath}: ${error.message}`);
        }
      }
    }
    
    // Add page numbers to all pages
    await this.addPageNumbers(mergedPdf, font, totalPages);
    
    // Save final merged PDF
    const finalBytes = await mergedPdf.save();
    fs.writeFileSync(outputPath, finalBytes);
    
    console.log(`✅ Final proposal merged: ${totalPages} pages`);
    return outputPath;
  }

  /**
   * Add white rectangle to clean up old page numbers
   */
  static addPageNumberCleanup(page) {
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

  /**
   * Add consistent page numbers to all pages
   * Skip page numbers for front page and table of contents
   * Content pages start numbering from 1 (not 3)
   */
  static async addPageNumbers(pdfDoc, font, totalPages) {
    const allPages = pdfDoc.getPages();
    const contentPageCount = totalPages - 2; // Subtract front page and TOC
    
    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      const { width } = page.getSize();
      
      // Skip page numbers for front page (index 0) and TOC (index 1)
      if (i === 0 || i === 1) {
        continue; // Don't add page numbers to front page and TOC
      }
      
      // Content pages start numbering from 1
      const contentPageNumber = i - 1; // i=2 becomes page 1, i=3 becomes page 2, etc.
      const pageNumText = `Page ${contentPageNumber} of ${contentPageCount}`;
      
      // Page number text (the white rectangle is already applied above)
      page.drawText(pageNumText, {
        x: width / 2 - font.widthOfTextAtSize(pageNumText, 10) / 2,
        y: 15,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }

  /**
   * Clean up temporary files
   */
  static cleanupTempFiles(tempPaths) {
    for (const tempPath of tempPaths) {
      try {
        if (fs.existsSync(tempPath) && tempPath.includes('temp_')) {
          fs.unlinkSync(tempPath);
        }
      } catch (error) {
        console.warn(`⚠️ Could not delete temp file ${tempPath}: ${error.message}`);
      }
    }
  }
}

module.exports = PDFMergerService;