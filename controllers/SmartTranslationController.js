const SmartTranslationModel = require('../models/SmartTranslationModel');
const { authenticateToken } = require('./AuthController');
class TranslationController {
  static async translate(req, res) {
    const { text, sourceLang, targetLang, options } = req.body;
    const userId = req.user.id;

    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال النص ولغات الترجمة' });
    }

    try {
      const translatedText = await TranslationModel.translateText(userId, text, sourceLang, targetLang, options);
      const quality = TranslationModel.evaluateQuality(translatedText, text, options); // دالة تقييم وهمية
      res.status(200).json({
        success: true,
        translatedText,
        quality,
        feedback: 'ترجمة ناجحة باستخدام مفتاح OpenAI الخاص بك',
      });
    } catch (error) {
      console.error('Translation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  static async improve(req, res) {
    const { text, translatedText, targetLang, options } = req.body;
    const userId = req.user.id;

    if (!translatedText || !targetLang) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال النص المترجم ولغة الهدف' });
    }

    try {
      const improvedText = await TranslationModel.improveText(userId, text, translatedText, targetLang, options);
      const quality = TranslationModel.evaluateQuality(improvedText, text, options); // دالة تقييم وهمية
      res.status(200).json({
        success: true,
        translatedText: improvedText,
        quality,
        feedback: 'تم تحسين الترجمة بنجاح باستخدام مفتاح OpenAI الخاص بك',
      });
    } catch (error) {
      console.error('Improve error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}
module.exports = TranslationController;
