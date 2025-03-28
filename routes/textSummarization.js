const express = require('express');
const router = express.Router();
const TextSummarizationController = require('../controllers/TextSummarizationController');

router.get('/', TextSummarizationController.renderSummarizationPage);
router.post('/summarize', TextSummarizationController.summarizeText);

module.exports = router;