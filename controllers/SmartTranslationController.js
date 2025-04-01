const SmartTranslationModel = require('../models/SmartTranslationModel');

class SmartTranslationController {
  static async renderTranslationPage(req, res) {
    if (!req.user) {
      console.log('📝 إعادة توجيه إلى تسجيل الدخول: المستخدم غير مسجل');
      return res.redirect('/auth/login');
    }
    console.log('📝 عرض صفحة الترجمة الذكية للمستخدم:', req.user.id);
    res.render('SmartTranslation', { user: req.user });
  }

  static async translateText(req, res) {
    const { text, sourceLang, targetLang, options } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة ترجمة نص بدون تسجيل دخول');
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !sourceLang || !targetLang) {
      console.warn('⚠️ بيانات غير كاملة لترجمة النص:', { text: !!text, sourceLang: !!sourceLang, targetLang: !!targetLang });
      return res.status(400).json({ 
        error: 'النص واللغات المصدر والهدف مطلوبة',
        details: { text: !!text, sourceLang: !!sourceLang, targetLang: !!targetLang }
      });
    }

    try {
      console.log('📝 بدء ترجمة النص للمستخدم:', userId);
      const result = await SmartTranslationModel.translateText({ text, sourceLang, targetLang, options, userId });
      console.log('✅ تمت الترجمة بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في translateText:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجددًا بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      if (error.message.includes('خطأ في الطلب')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'حدث خطأ أثناء ترجمة النص' });
    }
  }

  static async improveTranslation(req, res) {
    const { text, translatedText, targetLang, options } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة تحسين ترجمة بدون تسجيل دخول');
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !translatedText || !targetLang) {
      console.warn('⚠️ بيانات غير كاملة لتحسين الترجمة:', { text: !!text, translatedText: !!translatedText, targetLang: !!targetLang });
      return res.status(400).json({ 
        error: 'النص الأصلي والترجمة الحالية واللغة الهدف مطلوبة',
        details: { text: !!text, translatedText: !!translatedText, targetLang: !!targetLang }
      });
    }

    try {
      console.log('📝 بدء تحسين الترجمة للمستخدم:', userId);
      const result = await SmartTranslationModel.improveTranslation({ text, translatedText, targetLang, options, userId });
      console.log('✅ تم تحسين الترجمة بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في improveTranslation:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجددًا بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      if (error.message.includes('خطأ في الطلب')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحسين الترجمة' });
    }
  }
}

module.exports = SmartTranslationController;
