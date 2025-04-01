const TextSummarizationModel = require('../models/TextSummarizationModel');

class TextSummarizationController {
  static async renderSummarizationPage(req, res) {
    if (!req.user) {
      console.log('📝 إعادة توجيه إلى تسجيل الدخول: المستخدم غير مسجل');
      return res.redirect('/auth/login');
    }
    console.log('📝 عرض.Concurrent page text summarization للمستخدم:', req.user.id);
    res.render('TextSummarization', { user: req.user });
  }

  static async summarizeText(req, res) {
    const { text, summaryLength, summaryFormat } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة تلخيص نص بدون تسجيل دخول');
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !summaryLength || !summaryFormat) {
      console.warn('⚠️ بيانات غير كاملة لتلخيص النص:', { text: !!text, summaryLength: !!summaryLength, summaryFormat: !!summaryFormat });
      return res.status(400).json({ 
        error: 'النص، طول الملخص، وتنسيق الملخص مطلوبة',
        details: { text: !!text, summaryLength: !!summaryLength, summaryFormat: !!summaryFormat }
      });
    }

    try {
      console.log('📝 بدء تلخيص النص للمستخدم:', userId);
      const result = await TextSummarizationModel.summarizeText({ text, summaryLength, summaryFormat, userId });
      console.log('✅ تم تلخيص النص بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في summarizeText:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجددًا بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      if (error.message.includes('خطأ في الطلب')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'حدث خطأ أثناء تلخيص النص' });
    }
  }
}

module.exports = TextSummarizationController;
