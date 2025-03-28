const TextSummarizationModel = require('../models/TextSummarizationModel');

class TextSummarizationController {
  static async renderSummarizationPage(req, res) {
    res.render('TextSummarization');
  }

  static async summarizeText(req, res) {
    const { text, summaryLength, summaryFormat } = req.body;

    if (!text || !summaryLength || !summaryFormat) {
      return res.status(400).json({ error: 'النص، طول الملخص، وتنسيق الملخص مطلوبة' });
    }

    try {
      const result = await TextSummarizationModel.summarizeText({ text, summaryLength, summaryFormat });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TextSummarizationController;