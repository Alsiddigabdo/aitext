const express = require('express');
const router = express.Router();
const SmartTranslationController = require('../controllers/SmartTranslationController');
const { authenticateToken } = require('../controllers/AuthController');

router.get('/', SmartTranslationController.renderTranslationPage); // صفحة عامة
router.post('/translate', authenticateToken, SmartTranslationController.translateText); // محمية
router.post('/improve', authenticateToken, SmartTranslationController.improveTranslation); // محمية

module.exports = router;
