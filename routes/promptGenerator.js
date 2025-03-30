const express = require('express');
const router = express.Router();
const PromptGeneratorController = require('../controllers/PromptGeneratorController');

router.get('/', PromptGeneratorController.renderPromptGeneratorPage);
router.post('/generate', PromptGeneratorController.generatePrompt);
router.post('/save', PromptGeneratorController.savePrompt);
router.get('/saved', PromptGeneratorController.getSavedPrompts);
router.post('/delete', PromptGeneratorController.deletePrompt);

module.exports = router;