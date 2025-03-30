const PromptGeneratorModel = require('../models/PromptGeneratorModel');
const createError = require('http-errors');

class PromptGeneratorController {
  /**
   * عرض صفحة منشئ البرومبتات
   */
  static async renderPromptGeneratorPage(req, res, next) {
    if (!req.session.user) {
      console.log('📝 إعادة توجيه إلى تسجيل الدخول: المستخدم غير مسجل');
      return res.redirect('/auth/login');
    }
    console.log('📝 عرض صفحة منشئ البرومبتات للمستخدم:', req.session.user.id);
    res.render('PromptGenerator', { user: req.session.user });
  }

  /**
   * إنشاء برومبت بناءً على الإدخال
   */
  static async generatePrompt(req, res, next) {
    const { type, input, settings } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة إنشاء برومبت بدون تسجيل دخول');
      return next(createError(401, 'يجب تسجيل الدخول لاستخدام هذه الخدمة'));
    }

    if (!type || !input || !settings) {
      console.warn('⚠️ بيانات غير كاملة لإنشاء البرومبت:', { type, input, settings });
      return next(createError(400, 'نوع البرومبت والإدخال والإعدادات مطلوبة'));
    }

    try {
      console.log('📝 بدء إنشاء البرومبت للمستخدم:', userId);
      const result = await PromptGeneratorModel.generatePrompt({ type, input, settings, userId });
      console.log('✅ تم إنشاء البرومبت بنجاح');
      res.json(result);
    } catch (error) {
      console.error('❌ خطأ في generatePrompt:', error.stack || error.message);
      if (error.message.includes('429')) {
        return next(createError(429, 'تم تجاوز حد الطلبات. حاول مجددًا بعد 20 ثانية أو قم بترقية حسابك في OpenAI.'));
      }
      next(createError(500, error.message));
    }
  }

  /**
   * حفظ البرومبت في قاعدة البيانات
   */
  static async savePrompt(req, res, next) {
    const { type, input, settings, result } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة حفظ برومبت بدون تسجيل دخول');
      return next(createError(401, 'يجب تسجيل الدخول لاستخدام هذه الخدمة'));
    }

    if (!type || !input || !settings || !result) {
      console.warn('⚠️ بيانات غير كاملة لحفظ البرومبت:', { type, input, settings, result });
      return next(createError(400, 'جميع الحقول مطلوبة لحفظ البرومبت'));
    }

    try {
      console.log('📝 بدء حفظ البرومبت للمستخدم:', userId);
      const saveResult = await PromptGeneratorModel.savePrompt({ type, input, settings, result, userId });
      console.log('✅ تم حفظ البرومبت بنجاح، ID:', saveResult.promptId);
      res.json({ success: true, message: 'تم حفظ البرومبت بنجاح', promptId: saveResult.promptId });
    } catch (error) {
      console.error('❌ خطأ في savePrompt:', error.stack || error.message);
      next(createError(500, error.message));
    }
  }

  /**
   * استرجاع البرومبتات المحفوظة للمستخدم
   */
  static async getSavedPrompts(req, res, next) {
    const userId = req.session.user?.id;
    const { limit = 10, offset = 0, type } = req.query;

    if (!userId) {
      console.warn('⚠️ محاولة استرجاع البرومبتات بدون تسجيل دخول');
      return next(createError(401, 'يجب تسجيل الدخول لاستخدام هذه الخدمة'));
    }

    try {
      console.log('📝 جلب البرومبتات المحفوظة للمستخدم:', userId);
      const prompts = await PromptGeneratorModel.getUserPrompts(userId, { limit: parseInt(limit), offset: parseInt(offset), type });
      console.log('✅ تم جلب البرومبتات بنجاح:', prompts.length, 'عنصر');
      res.json({ success: true, prompts });
    } catch (error) {
      console.error('❌ خطأ في getSavedPrompts:', error.stack || error.message);
      next(createError(500, error.message));
    }
  }

  /**
   * حذف برومبت معين
   */
  static async deletePrompt(req, res, next) {
    const { promptId } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      console.warn('⚠️ محاولة حذف برومبت بدون تسجيل دخول');
      return next(createError(401, 'يجب تسجيل الدخول لاستخدام هذه الخدمة'));
    }

    if (!promptId) {
      console.warn('⚠️ معرف البرومبت مفقود');
      return next(createError(400, 'معرف البرومبت مطلوب'));
    }

    try {
      console.log('📝 بدء حذف البرومبت:', promptId, 'للمستخدم:', userId);
      await PromptGeneratorModel.deletePrompt(promptId, userId);
      console.log('✅ تم حذف البرومبت بنجاح');
      res.json({ success: true, message: 'تم حذف البرومبت بنجاح' });
    } catch (error) {
      console.error('❌ خطأ في deletePrompt:', error.stack || error.message);
      next(createError(500, error.message));
    }
  }
}

module.exports = PromptGeneratorController;
