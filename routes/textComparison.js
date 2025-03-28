const express = require('express');
const router = express.Router();
const TextComparisonController = require('../controllers/TextComparisonController');

router.get('/', TextComparisonController.renderComparePage);
router.post('/compare', TextComparisonController.compareTexts);

module.exports = router;