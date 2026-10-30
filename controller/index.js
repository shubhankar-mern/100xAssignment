
const { vectorizeAndStore } = require('../service/vectorService');
const pdfParse = require('pdf-parse');

const validateDataAndCreateEmbeddings = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Please upload a PDF or TXT file'
      });
    }

    const { originalname, size, buffer } = req.file;

    const extension = originalname
      .slice(originalname.lastIndexOf('.'))
      .toLowerCase();

    if (!['.pdf', '.txt'].includes(extension)) {
      return res.status(400).json({
        success: false,
        error: 'Only PDF and TXT files are supported'
      });
    }

    if (size > 10 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'Maximum file size is 10 MB'
      });
    }

    let text;

    if (extension === '.pdf') {
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else {
      text = buffer.toString('utf8');
    }

    text = text.trim();

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'No extractable text found in this file'
      });
    }

    const result = await vectorizeAndStore({
      text,
      fileName: originalname,
      sourceType: 'visitor_upload'
    });

    return res.status(201).json({
      success: true,
      message: 'Document indexed successfully',
      ...result
    });

  } catch (error) {
    console.error('Document processing error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to process document'
    });
  }
};

module.exports = { validateDataAndCreateEmbeddings };
