const PersonalityAnalysisModel = require('../models/PersonalityAnalysisModel');

class PersonalityAnalysisController {
  static async renderAnalysisPage(req, res) {
    if (!req.user) {
      console.log('📝 إعادة توجيه إلى تسجيل الدخول: المستخدم غير مسجل');
      return res.redirect('/auth/login');
    }
    console.log('📝 عرض صفحة تحليل الشخصية للمستخدم:', req.user.id);
    res.render('personality-analysis', { user: req.user });
  }

  static async analyzePersonality(req, res) {
    const { type, responses } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة تحليل الشخصية بدون تسجيل دخول');
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!type || !responses || responses.length !== 20) {
      console.warn('⚠️ بيانات غير كاملة لتحليل الشخصية:', { type: !!type, responses: responses?.length });
      return res.status(400).json({
        error: 'نوع الاختبار و20 إجابة مطلوبة',
        details: { type: !!type, responses: responses?.length === 20 }
      });
    }

    try {
      console.log('📝 بدء تحليل الشخصية للمستخدم:', userId);
      const result = await PersonalityAnalysisModel.analyzePersonality({ type, responses, userId });
      console.log('✅ تم تحليل الشخصية بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في analyzePersonality:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجددًا بعد 20 ثانية أو ترقية حسابك في OpenAI.'
        });
      }
      if (error.message.includes('خطأ في الطلب')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: error.message || 'حدث خطأ أثناء تحليل الشخصية' });
    }
  }
}

module.exports = PersonalityAnalysisController;
