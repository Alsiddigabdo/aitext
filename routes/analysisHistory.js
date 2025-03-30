const express = require('express');
const router = express.Router();
const AnalysisHistoryController = require('../controllers/AnalysisHistoryController');

router.get('/', AnalysisHistoryController.renderAnalysisHistory);
router.delete('/:id', AnalysisHistoryController.deleteAnalysis);
router.get('/download/:id', AnalysisHistoryController.downloadAnalysis);

module.exports = router;