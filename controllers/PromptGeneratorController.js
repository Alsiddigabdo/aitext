const PromptGeneratorModel = require('../models/PromptGeneratorModel');

class PromptGeneratorController {
  /**
   * عرض صفحة منشئ البرومبتات
   */
  static async renderPromptGeneratorPage(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    res.render('PromptGenerator', { user: req.session.user });
  }

  /**
   * إنشاء برومبت بناءً على الإدخال
   */
  static async generatePrompt(req, res) {
    const { type, input, settings } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!type || !input || !settings) {
      return res.status(400).json({
        error: 'نوع البرومبت والإدخال والإعدادات مطلوبة',
        details: { type: !!type, input: !!input, settings: !!settings },
      });
    }

    try {
      const result = await PromptGeneratorModel.generatePrompt({ type, input, settings, userId });
      res.json(result);
    } catch (error) {
      console.error('خطأ في generatePrompt:', error.message);
      if (error.message.includes('429')) {
        return res.status(429).json({
          error: 'تم تجاوز حد الطلبات. حاول مجددًا بعد 20 ثانية أو قم بترقية حسابك في OpenAI.',
        });
      }
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * حفظ البرومبت في قاعدة البيانات
   */
  static async savePrompt(req, res) {
    const { type, input, settings, result } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!type || !input || !settings || !result) {
      return res.status(400).json({
        error: 'جميع الحقول مطلوبة لحفظ البرومبت',
        details: { type: !!type, input: !!input, settings: !!settings, result: !!result },
      });
    }

    try {
      const saveResult = await PromptGeneratorModel.savePrompt({ type, input, settings, result, userId });
      res.json({ success: true, message: 'تم حفظ البرومبت بنجاح', promptId: saveResult.promptId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * استرجاع البرومبتات المحفوظة للمستخدم
   */
  static async getSavedPrompts(req, res) {
    const userId = req.session.user?.id;
    const { limit = 10, offset = 0, type } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    try {
      const prompts = await PromptGeneratorModel.getUserPrompts(userId, { limit: parseInt(limit), offset: parseInt(offset), type });
      res.json({ success: true, prompts });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * حذف برومبت معين
   */
  static async deletePrompt(req, res) {
    const { promptId } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!promptId) {
      return res.status(400).json({ error: 'معرف البرومبت مطلوب' });
    }

    try {
      await PromptGeneratorModel.deletePrompt(promptId, userId);
      res.json({ success: true, message: 'تم حذف البرومبت بنجاح' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = PromptGeneratorController;