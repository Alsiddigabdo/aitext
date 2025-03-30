const SmartTranslationModel = require('../models/SmartTranslationModel');
const createError = require('http-errors');

class SmartTranslationController {
  static async renderTranslationPage(req, res, next) {
    console.log('📝 عرض صفحة الترجمة الذكية');
    res.render('SmartTranslation');
  }

  static async translateText(req, res, next) {
    const { text, sourceLang, targetLang, options } = req.body;

    if (!text || !sourceLang || !targetLang) {
      console.warn('⚠️ بيانات غير كاملة للترجمة:', { text, sourceLang, targetLang });
      return next(createError(400, 'النص واللغات المصدر والهدف مطلوبة'));
    }

    try {
      console.log('📝 بدء ترجمة النص');
      const result = await SmartTranslationModel.translateText({ text, sourceLang, targetLang, options });
      console.log('✅ تمت الترجمة بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في translateText:', error.stack || error.message);
      if (error.message.includes('429')) {
        return next(createError(429, 'تم تجاوز حد الطلبات. يرجى المحاولة مجدداً بعد 20 ثانية أو ترقية حسابك في OpenAI.'));
      }
      next(createError(500, error.message));
    }
  }

  static async improveTranslation(req, res, next) {
    const { text, translatedText, targetLang, options } = req.body;

    if (!text || !translatedText || !targetLang) {
      console.warn('⚠️ بيانات غير كاملة لتحسين الترجمة:', { text, translatedText, targetLang });
      return next(createError(400, 'النص الأصلي والترجمة الحالية واللغة الهدف مطلوبة'));
    }

    try {
      console.log('📝 بدء تحسين الترجمة');
      const result = await SmartTranslationModel.improveTranslation({ text, translatedText, targetLang, options });
      console.log('✅ تم تحسين الترجمة بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في improveTranslation:', error.stack || error.message);
      if (error.message.includes('429')) {
        return next(createError(429, 'تم تجاوز حد الطلبات. يرجى المحاولة مجدداً بعد 20 ثانية أو ترقية حسابك في OpenAI.'));
      }
      next(createError(500, error.message));
    }
  }
}

module.exports = SmartTranslationController;
