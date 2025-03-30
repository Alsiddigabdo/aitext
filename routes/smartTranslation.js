const express = require('express');
const router = express.Router();
const TranslationController = require('../controllers/TranslationController');
const { authenticateToken } = require('../controllers/AuthController');

router.post('/translate', authenticateToken, TranslationController.translate);
router.post('/improve', authenticateToken, TranslationController.improve);

module.exports = router;
