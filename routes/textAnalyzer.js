const express = require('express');
const TextAnalyzerController = require('../controllers/TextAnalyzerController');

const router = express.Router();

router.get('/', TextAnalyzerController.renderPage);
router.post('/analyze', TextAnalyzerController.analyzeText);

module.exports = router;