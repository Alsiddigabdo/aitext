const SmartTranslationModel = require('../models/SmartTranslationModel');
const createError = require('http-errors');

class SmartTranslationController {
  static async renderTranslationPage(req, res, next) {
    if (!req.session.user) {
      console.log('📝 إعادة توجيه إلى تسجيل الدخول: المستخدم غير مسجل');
      return res.redirect('/auth/login');
    }
    console.log('📝 عرض صفحة الترجمة الذكية للمستخدم:', req.session.user.id);
    res.render('SmartTranslation');
  }

  static async translateText(req, res, next) {
    const { text, sourceLang, targetLang, options } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة ترجمة بدون تسجيل دخول');
      return next(createError(401, 'يجب تسجيل الدخول لاستخدام هذه الخدمة'));
    }

    if (!text || !sourceLang || !targetLang) {
      console.warn('⚠️ بيانات غير كاملة للترجمة:', { text, sourceLang, targetLang });
      return next(createError(400, 'النص واللغات المصدر والهدف مطلوبة'));
    }

    try {
      console.log('📝 بدء ترجمة النص للمستخدم:', userId);
      const result = await SmartTranslationModel.translateText({ text, sourceLang, targetLang, options, userId });
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
    const userId = req.session.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة تحسين ترجمة بدون تسجيل دخول');
      return next(createError(401, 'يجب تسجيل الدخول لاستخدام هذه الخدمة'));
    }

    if (!text || !translatedText || !targetLang) {
      console.warn('⚠️ بيانات غير كاملة لتحسين الترجمة:', { text, translatedText, targetLang });
      return next(createError(400, 'النص الأصلي والترجمة الحالية واللغة الهدف مطلوبة'));
    }

    try {
      console.log('📝 بدء تحسين الترجمة للمستخدم:', userId);
      const result = await SmartTranslationModel.improveTranslation({ text, translatedText, targetLang, options, userId });
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
