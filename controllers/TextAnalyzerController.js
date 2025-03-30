const TextAnalyzerModel = require('../models/TextAnalyzerModel');
const { authenticateToken } = require('./AuthController');

class TextAnalyzerController {
  static async renderPage(req, res) {
    try {
      res.render('AdvancedTextAnalyzer', { title: 'التحليل المتقدم للنصوص' });
    } catch (error) {
      console.error('Error rendering page:', error);
      res.status(500).send('خطأ في عرض الصفحة');
    }
  }

  static async analyzeText(req, res) {
    const { text, analysisType } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!text || !analysisType) {
      return res.status(400).json({ 
        error: 'النص ونوع التحليل مطلوبان',
        details: { text: !!text, analysisType: !!analysisType }
      });
    }

    try {
      const analysisResult = await TextAnalyzerModel.analyzeText(text, analysisType, userId);
      res.json(analysisResult);
    } catch (error) {
      console.error('Error in analyzeText:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجدداً بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      res.status(500).json({ error: error.message || 'حدث خطأ أثناء التحليل' });
    }
  }
}

module.exports = TextAnalyzerController;
