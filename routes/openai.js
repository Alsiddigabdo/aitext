const express = require('express');
const router = express.Router();
const OpenAIController = require('../controllers/OpenAIController');
const { authenticateToken } = require('../controllers/AuthController');

router.post('/activate-openai', authenticateToken, OpenAIController.activateOpenAI);
router.get('/api-key', authenticateToken, OpenAIController.getApiKey);

module.exports = router;
