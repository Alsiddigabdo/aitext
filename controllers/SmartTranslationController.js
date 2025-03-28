const SmartTranslationModel = require('../models/SmartTranslationModel');

class SmartTranslationController {
  static async renderTranslationPage(req, res) {
    res.render('SmartTranslation');
  }

  static async translateText(req, res) {
    const { text, sourceLang, targetLang, options } = req.body;

    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ error: 'النص واللغات المصدر والهدف مطلوبة' });
    }

    try {
      const result = await SmartTranslationModel.translateText({ text, sourceLang, targetLang, options });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async improveTranslation(req, res) {
    const { text, translatedText, targetLang, options } = req.body;

    if (!text || !translatedText || !targetLang) {
      return res.status(400).json({ error: 'النص الأصلي والترجمة الحالية واللغة الهدف مطلوبة' });
    }

    try {
      const result = await SmartTranslationModel.improveTranslation({ text, translatedText, targetLang, options });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SmartTranslationController;