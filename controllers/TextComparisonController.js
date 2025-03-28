const TextComparisonModel = require('../models/TextComparisonModel');

class TextComparisonController {
  static async renderComparePage(req, res) {
    res.render('compare-texts');
  }

  static async compareTexts(req, res) {
    const { originalText, newText } = req.body;

    if (!originalText || !newText) {
      return res.status(400).json({ error: 'النص الأصلي والنص الجديد مطلوبان' });
    }

    try {
      const result = await TextComparisonModel.compareTexts(originalText, newText);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TextComparisonController;