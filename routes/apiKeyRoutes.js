const express = require('express');
const router = express.Router();
const ApiKeyController = require('../controllers/apiKeyController');

router.post('/activate-openai', ApiKeyController.updateApiKey);

module.exports = router;