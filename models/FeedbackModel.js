const db = require('../config/db');

class FeedbackModel {
  static async addFeedback({ name, email, rating, title, comment, isFeatureRequest }) {
    try {
      const sql = `
        INSERT INTO feedback (name, email, rating, title, comment, is_feature_request, created_at, likes)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), 0)
      `;
      const result = await db.query(sql, [
        name || 'مجهول',
        email || null,
        rating || null,
        title || 'بدون عنوان',
        comment || 'لا يوجد تعليق',
        isFeatureRequest ? 1 : 0
      ]);
      const insertId = result.insertId || (result[0] && result[0].insertId);
      if (!insertId) throw new Error('فشل في استرجاع معرف السجل الجديد');
      return { id: insertId };
    } catch (error) {
      console.error('❌ خطأ في addFeedback:', error.stack || error.message);
      throw new Error('فشل في إضافة التقييم.');
    }
  }

  static async getFeedback(page = 1, limit = 4) {
    try {
      const offset = (page - 1) * limit;
      const sql = `
        SELECT id, name, rating, title, comment, is_feature_request, created_at, likes
        FROM feedback
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `;
      const rowsResult = await db.query(sql, [limit, offset]);
      const rows = Array.isArray(rowsResult[0]) ? rowsResult[0] : rowsResult;
      console.log('📋 التقييمات المُرجعة:', rows);

      const countResult = await db.query('SELECT COUNT(*) as total FROM feedback');
      const totalItems = countResult[0] && countResult[0][0] ? countResult[0][0].total : 0;
      console.log('📋 نتيجة العدد:', countResult);

      const totalPages = Math.ceil(totalItems / limit);
      return {
        items: Array.isArray(rows) ? rows : [],
        totalItems,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      console.error('❌ خطأ في getFeedback:', error.stack || error.message);
      throw new Error('فشل في جلب التقييمات.');
    }
  }

  static async addLike(feedbackId) {
    try {
      const sql = `UPDATE feedback SET likes = likes + 1 WHERE id = ?`;
      await db.query(sql, [feedbackId]);
      const [updated] = await db.query('SELECT likes FROM feedback WHERE id = ?', [feedbackId]);
      return updated[0].likes;
    } catch (error) {
      console.error('❌ خطأ في addLike:', error.stack || error.message);
      throw new Error('فشل في إضافة الإعجاب.');
    }
  }
}

module.exports = FeedbackModel;