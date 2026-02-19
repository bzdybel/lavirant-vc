const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Configure worker
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

const pdfPath = 'c:\\Users\\PC\\Documents\\Projects\\lavirant-vc\\attached_assets\\instruction.pdf';
const pdfData = fs.readFileSync(pdfPath);

(async () => {
  try {
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    console.log('PDF loaded, pages:', pdf.numPages);
    
    let allText = '';
    for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      allText += '\n--- Page ' + i + ' ---\n';
      allText += textContent.items.map(item => item.str).join(' ');
    }
    
    console.log(allText);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
