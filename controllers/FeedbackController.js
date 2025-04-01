const FeedbackModel = require('../models/FeedbackModel');
const authenticateToken = require('../middleware/authenticateToken');

class FeedbackController {
  static async renderFeedbackPage(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      console.log('📝 جلب التقييمات من قاعدة البيانات للصفحة:', page);
      const feedbackData = await FeedbackModel.getFeedback(page);
      console.log('✅ تم جلب التقييمات بنجاح:', feedbackData.items.length, 'عنصر');
      res.render('Feedback', { feedback: feedbackData.items, pagination: feedbackData, user: req.user });
    } catch (error) {
      console.error(' خطأ في renderFeedbackPage:', error.stack || error.message);
      res.status(500).send(`خطأ في تحميل صفحة التقييمات: ${error.message}`);
    }
  }

  static async addFeedback(req, res) {
    authenticateToken(req, res, async () => {
      const { name, email, rating, title, comment, isFeatureRequest } = req.body;
      if (!name || !title || !comment) {
        console.warn('⚠️ بيانات غير كاملة:', { name, title, comment });
        return res.status(400).json({ success: false, message: 'الاسم، العنوان، والتعليق مطلوبة' });
      }
      try {
        console.log('📝 إضافة تقييم جديد:', { name, title });
        const result = await FeedbackModel.addFeedback({
          name,
          email,
          rating: rating ? parseInt(rating) : null,
          title,
          comment,
          isFeatureRequest: isFeatureRequest === 'true' || isFeatureRequest === true
        });
        console.log('✅ تم إضافة التقييم بنجاح:', result.id);
        res.json({ success: true, message: 'تم إرسال التقييم بنجاح', id: result.id });
      } catch (error) {
        console.error('❌ خطأ في addFeedback:', error.stack || error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }

  static async getFeedback(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      console.log('📝 جلب قائمة التقييمات للصفحة:', page);
      const feedbackData = await FeedbackModel.getFeedback(page);
      console.log('✅ تم جلب القائمة بنجاح:', feedbackData.items.length, 'عنصر');
      res.json(feedbackData);
    } catch (error) {
      console.error('❌ خطأ في getFeedback:', error.stack || error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  static async addLike(req, res) {
    authenticateToken(req, res, async () => {
      const { feedbackId } = req.body;
      if (!feedbackId) {
        return res.status(400).json({ success: false, message: 'معرف التقييم مطلوب' });
      }
      try {
        const newLikes = await FeedbackModel.addLike(feedbackId);
        res.json({ success: true, message: 'تم إضافة الإعجاب بنجاح', likes: newLikes });
      } catch (error) {
        console.error('❌ خطأ في addLike:', error.stack || error.message);
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }
}

module.exports = FeedbackController;
