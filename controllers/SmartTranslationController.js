const SmartTranslationModel = require('../models/SmartTranslationModel');
const { authenticateToken } = require('./AuthController');

class SmartTranslationController {
  static async renderTranslationPage(req, res) {
    res.render('SmartTranslation');
  }

  static async translateText(req, res) {
    const { text, sourceLang, targetLang, options } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !sourceLang || !targetLang) {
      return res.status(400).json({ 
        error: 'النص واللغات المصدر والهدف مطلوبة',
        details: { text: !!text, sourceLang: !!sourceLang, targetLang: !!targetLang }
      });
    }

    try {
      const result = await SmartTranslationModel.translateText({ text, sourceLang, targetLang, options, userId });
      res.json(result);
    } catch (error) {
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجدداً بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async improveTranslation(req, res) {
    const { text, translatedText, targetLang, options } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !translatedText || !targetLang) {
      return res.status(400).json({ 
        error: 'النص الأصلي والترجمة الحالية واللغة الهدف مطلوبة',
        details: { text: !!text, translatedText: !!translatedText, targetLang: !!targetLang }
      });
    }

    try {
      const result = await SmartTranslationModel.improveTranslation({ text, translatedText, targetLang, options, userId });
      res.json(result);
    } catch (error) {
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجدداً بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SmartTranslationController;
