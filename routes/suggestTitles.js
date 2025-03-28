const express = require('express');
const router = express.Router();
const SuggestTitlesController = require('../controllers/SuggestTitlesController');

router.get('/', SuggestTitlesController.renderSuggestPage);
router.post('/suggest', SuggestTitlesController.suggestTitles);
router.post('/improve', SuggestTitlesController.improveTitles);

module.exports = router;