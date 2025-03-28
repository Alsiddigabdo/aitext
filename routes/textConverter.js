const express = require('express');
const router = express.Router();
const TextConverterController = require('../controllers/TextConverterController');

router.get('/', TextConverterController.renderConverterPage);
router.post('/convert', TextConverterController.convertText);

module.exports = router;