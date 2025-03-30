const PersonalityAnalysisModel = require('../models/PersonalityAnalysisModel');

class PersonalityAnalysisController {
  static async renderAnalysisPage(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    res.render('personality-analysis');
  }

  static async analyzePersonality(req, res) {
    const { type, responses } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!type || !responses || responses.length !== 20) {
      return res.status(400).json({
        error: 'نوع الاختبار و20 إجابة مطلوبة',
        details: { type: !!type, responses: responses?.length === 20 }
      });
    }

    try {
      const result = await PersonalityAnalysisModel.analyzePersonality({ type, responses, userId });
      res.json(result);
    } catch (error) {
      if (error.message.includes('429')) {
        return res.status(429).json({
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجددًا بعد 20 ثانية أو ترقية حسابك في OpenAI.'
        });
      }
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PersonalityAnalysisController;