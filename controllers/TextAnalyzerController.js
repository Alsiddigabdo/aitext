const TextAnalyzerModel = require('../models/TextAnalyzerModel');

class TextAnalyzerController {
  static async renderPage(req, res) {
    try {
      res.render('AdvancedTextAnalyzer', { title: 'التحليل المتقدم للنصوص' });
    } catch (error) {
      res.status(500).send('خطأ في عرض الصفحة');
    }
  }

  static async analyzeText(req, res) {
    const { text, analysisType } = req.body;
    try {
      const analysisResult = await TextAnalyzerModel.analyzeText(text, analysisType);
      await TextAnalyzerModel.saveAnalysis({ text, analysisType, result: analysisResult });
      res.json(analysisResult);
    } catch (error) {
      res.status(500).json({ error: 'حدث خطأ أثناء التحليل' });
    }
  }
}

module.exports = TextAnalyzerController;