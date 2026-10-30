const express = require('express');
const router = express.Router();
const multer = require("multer");

const {
  validateDataAndCreateEmbeddings
} = require('../controller/index');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

router.post(
  '/documents/upload',
  upload.single('document'),
  validateDataAndCreateEmbeddings
);

router.get('/health', (req, res) => {
  res.send('Health check passed!');
});


module.exports = router;