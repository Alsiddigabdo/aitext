const TextConverterModel = require('../models/TextConverterModel');

class TextConverterController {
  static async renderConverterPage(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    res.render('TextConverter');
  }

  static async convertText(req, res) {
    const { text, conversionType, addBreaks, fixSpelling, improveSentences } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !conversionType) {
      return res.status(400).json({ 
        error: 'النص ونوع التحويل مطلوبان',
        details: { text: !!text, conversionType: !!conversionType }
      });
    }

    try {
      const result = await TextConverterModel.convertText({
        text,
        conversionType,
        addBreaks: addBreaks === 'on',
        fixSpelling: fixSpelling === 'on',
        improveSentences: improveSentences === 'on',
        userId
      });
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

module.exports = TextConverterController;