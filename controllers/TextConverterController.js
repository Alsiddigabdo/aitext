const TextConverterModel = require('../models/TextConverterModel');

class TextConverterController {
  static async renderConverterPage(req, res) {
    if (!req.user) {
      console.log('📝 إعادة توجيه إلى تسجيل الدخول: المستخدم غير مسجل');
      return res.redirect('/auth/login');
    }
    console.log('📝 عرض صفحة محول النصوص للمستخدم:', req.user.id);
    res.render('TextConverter', { user: req.user });
  }

  static async convertText(req, res) {
    const { text, conversionType, addBreaks, fixSpelling, improveSentences } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة تحويل نص بدون تسجيل دخول');
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !conversionType) {
      console.warn('⚠️ بيانات غير كاملة لتحويل النص:', { text: !!text, conversionType: !!conversionType });
      return res.status(400).json({ 
        error: 'النص ونوع التحويل مطلوبان',
        details: { text: !!text, conversionType: !!conversionType }
      });
    }

    try {
      console.log('📝 بدء تحويل النص للمستخدم:', userId);
      const result = await TextConverterModel.convertText({
        text,
        conversionType,
        addBreaks: addBreaks === 'on',
        fixSpelling: fixSpelling === 'on',
        improveSentences: improveSentences === 'on',
        userId
      });
      console.log('✅ تم تحويل النص بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في convertText:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجددًا بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      if (error.message.includes('خطأ في الطلب')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحويل النص' });
    }
  }
}

module.exports = TextConverterController;
