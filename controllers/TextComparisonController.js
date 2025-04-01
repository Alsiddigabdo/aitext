const TextComparisonModel = require('../models/TextComparisonModel');

class TextComparisonController {
  static async renderComparePage(req, res) {
    if (!req.user) {
      return res.redirect('/auth/login');
    }
    res.render('compare-texts', { user: req.user });
  }

  static async compareTexts(req, res) {
    const { originalText, newText } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!originalText || !newText) {
      return res.status(400).json({ 
        error: 'النص الأصلي والنص الجديد مطلوبان',
        details: { originalText: !!originalText, newText: !!newText }
      });
    }

    try {
      const result = await TextComparisonModel.compareTexts({ originalText, newText, userId });
      res.json(result);
    } catch (error) {
      console.error('Error in compareTexts:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجددًا بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      if (error.message.includes('خطأ في الطلب')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'حدث خطأ أثناء المقارنة' });
    }
  }
}

module.exports = TextComparisonController;
