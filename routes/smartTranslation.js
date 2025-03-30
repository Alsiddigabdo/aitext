const express = require('express');
const router = express.Router();
const SmartTranslationController = require('../controllers/SmartTranslationController');

router.get('/', SmartTranslationController.renderTranslationPage);
router.post('/translate', SmartTranslationController.translateText);
router.post('/improve', SmartTranslationController.improveTranslation);

module.exports = router;
