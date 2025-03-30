const AnalysisHistoryModel = require('../models/AnalysisHistoryModel');

class AnalysisHistoryController {
  // عرض صفحة سجل التحليلات مع الفلاتر
  static async renderAnalysisHistory(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }

    const userId = req.session.user.id;
    const filters = {
      search: req.query.search || '',
      dateFilter: req.query.dateFilter || 'all',
      startDate: req.query.startDate || '',
      endDate: req.query.endDate || '',
      analysisTypes: req.query.analysisTypes ? (Array.isArray(req.query.analysisTypes) ? req.query.analysisTypes : [req.query.analysisTypes]) : []
    };

    // التحقق من صحة التواريخ إذا كانت موجودة
    if (filters.startDate && filters.endDate) {
      if (new Date(filters.startDate) > new Date(filters.endDate)) {
        return res.status(400).json({ error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' });
      }
    }

    try {
      const analyses = await AnalysisHistoryModel.getAnalyses(userId, filters);
      res.render('AnalysisHistory', { analyses, filters });
    } catch (error) {
      console.error('Error rendering analysis history:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء جلب سجل التحليلات' });
    }
  }

  // حذف تحليل معين
  static async deleteAnalysis(req, res) {
    if (!req.session.user) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    const userId = req.session.user.id;
    const analysisId = req.params.id;

    try {
      const success = await AnalysisHistoryModel.deleteAnalysis(userId, analysisId);
      if (success) {
        res.json({ success: true, message: 'تم حذف التحليل بنجاح' });
      } else {
        res.status(404).json({ error: 'التحليل غير موجود' });
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء الحذف' });
    }
  }

  // تنزيل تحليل كملف JSON
  static async downloadAnalysis(req, res) {
    if (!req.session.user) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    const userId = req.session.user.id;
    const analysisId = req.params.id;

    try {
      const analysis = await AnalysisHistoryModel.getAnalysisById(userId, analysisId);
      if (!analysis) {
        return res.status(404).json({ error: 'التحليل غير موجود' });
      }

      res.setHeader('Content-Disposition', `attachment; filename=analysis_${analysisId}.json`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(analysis, null, 2));
    } catch (error) {
      console.error('Error downloading analysis:', error);
      res.status(500).json({ error: 'حدث خطأ أثناء التنزيل' });
    }
  }
}

module.exports = AnalysisHistoryController;