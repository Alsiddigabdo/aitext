const express = require('express');
const router = express.Router();
const PersonalityAnalysisController = require('../controllers/PersonalityAnalysisController');

router.get('/', PersonalityAnalysisController.renderAnalysisPage);
router.post('/analyze', PersonalityAnalysisController.analyzePersonality);

module.exports = router;