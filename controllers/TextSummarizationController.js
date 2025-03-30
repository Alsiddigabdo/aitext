const TextSummarizationModel = require('../models/TextSummarizationModel');

class TextSummarizationController {
  static async renderSummarizationPage(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    res.render('TextSummarization');
  }

  static async summarizeText(req, res) {
    const { text, summaryLength, summaryFormat } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !summaryLength || !summaryFormat) {
      return res.status(400).json({ 
        error: 'النص، طول الملخص، وتنسيق الملخص مطلوبة',
        details: { text: !!text, summaryLength: !!summaryLength, summaryFormat: !!summaryFormat }
      });
    }

    try {
      const result = await TextSummarizationModel.summarizeText({ text, summaryLength, summaryFormat, userId });
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

module.exports = TextSummarizationController;