const db = require('../config/db');

class AnalysisHistoryModel {
  static async getAnalyses(userId, filters) {
    let sql = 'SELECT * FROM analyses WHERE user_id = ?';
    const params = [userId];

    if (filters.search) {
      sql += ' AND text LIKE ?';
      params.push(`%${filters.search}%`);
    }

    if (filters.dateFilter !== 'all') {
      if (filters.dateFilter === 'last7days') {
        sql += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      } else if (filters.dateFilter === 'thisMonth') {
        sql += ' AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
      } else if (filters.dateFilter === 'custom' && filters.startDate && filters.endDate) {
        sql += ' AND created_at BETWEEN ? AND ?';
        params.push(filters.startDate, filters.endDate);
      }
    }

    if (filters.analysisTypes.length > 0) {
      sql += ' AND analysis_type IN (?)';
      params.push(filters.analysisTypes);
    }

    sql += ' ORDER BY created_at DESC';

    try {
      const rows = await db.query(sql, params);
      console.log('Raw query result:', rows);

      // إذا لم يكن هناك صفوف أو لم تكن مصفوفة، نُرجع مصفوفة فارغة
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        console.log('No analyses found for user:', userId);
        return [];
      }

      // معالجة الصفوف وتحويلها إلى الكائنات المطلوبة
      return rows.map(row => ({
        id: row.id,
        sourceText: row.text,
        analysisType: row.analysis_type,
        analysisResult: row.result ? JSON.parse(row.result) : null,
        createdAt: row.created_at
      }));
    } catch (error) {
      console.error('Error fetching analyses:', error);
      throw new Error('فشل في جلب التحليلات');
    }
  }

  static async getAnalysisById(userId, analysisId) {
    try {
      const rows = await db.query(
        'SELECT * FROM analyses WHERE id = ? AND user_id = ?',
        [analysisId, userId]
      );
      console.log('Raw query result for getAnalysisById:', rows);

      if (!rows || rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        sourceText: row.text,
        analysisType: row.analysis_type,
        analysisResult: row.result ? JSON.parse(row.result) : null,
        createdAt: row.created_at
      };
    } catch (error) {
      console.error('Error fetching analysis by ID:', error);
      throw new Error('فشل في جلب التحليل');
    }
  }

  static async deleteAnalysis(userId, analysisId) {
    try {
      const result = await db.query(
        'DELETE FROM analyses WHERE id = ? AND user_id = ?',
        [analysisId, userId]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Error deleting analysis:', error);
      throw new Error('فشل في حذف التحليل');
    }
  }
}

module.exports = AnalysisHistoryModel;