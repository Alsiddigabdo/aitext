const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/FeedbackController');

router.get('/', FeedbackController.renderFeedbackPage);
router.post('/submit', FeedbackController.addFeedback);
router.get('/list', FeedbackController.getFeedback);
router.post('/like', FeedbackController.addLike);

module.exports = router;