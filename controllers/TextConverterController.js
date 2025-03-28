const TextConverterModel = require('../models/TextConverterModel');

class TextConverterController {
  static async renderConverterPage(req, res) {
    res.render('TextConverter');
  }

  static async convertText(req, res) {
    const { text, conversionType, addBreaks, fixSpelling, improveSentences } = req.body;

    if (!text || !conversionType) {
      return res.status(400).json({ error: 'النص ونوع التحويل مطلوبان' });
    }

    try {
      const result = await TextConverterModel.convertText({
        text,
        conversionType,
        addBreaks: addBreaks === 'on',
        fixSpelling: fixSpelling === 'on',
        improveSentences: improveSentences === 'on'
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = TextConverterController;