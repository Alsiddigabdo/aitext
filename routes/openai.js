const express = require('express');
const router = express.Router();
const OpenAIController = require('../controllers/OpenAIController');
const { authenticateToken } = require('../controllers/AuthController'); // افترض أن هذا موجود

router.post('/activate-openai', authenticateToken, OpenAIController.activateOpenAI);

module.exports = router;
