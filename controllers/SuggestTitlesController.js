const SuggestTitlesModel = require('../models/SuggestTitlesModel');

class SuggestTitlesController {
  static async renderSuggestPage(req, res) {
    if (!req.session.user) {
      return res.redirect('/auth/login');
    }
    res.render('suggest-titles');
  }

  static async suggestTitles(req, res) {
    const { content, tone, types } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!content || !tone || typeof types === 'undefined' || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ 
        error: 'وصف المحتوى، النبرة، وأنواع العناوين (على الأقل واحد) مطلوبة',
        details: { content: !!content, tone: !!tone, types: types }
      });
    }

    try {
      const result = await SuggestTitlesModel.generateTitles({ content, tone, types, userId });
      res.json(result);
    } catch (error) {
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجدداً بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async improveTitles(req, res) {
    const { content, currentTitles, tone, types } = req.body;
    const userId = req.session.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'يجب تسجيل الدخول لاستخدام هذه الخدمة' });
    }

    if (!content || !Array.isArray(currentTitles) || !tone || typeof types === 'undefined' || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ 
        error: 'وصف المحتوى، العناوين الحالية، النبرة، وأنواع العناوين (على الأقل واحد) مطلوبة',
        details: { content: !!content, currentTitles: !!currentTitles, tone: !!tone, types: types }
      });
    }

    try {
      const result = await SuggestTitlesModel.improveTitles({ content, currentTitles, tone, types, userId });
      res.json(result);
    } catch (error) {
      if (error.message.includes('429')) {
        return res.status(429).json({ 
          error: 'تم تجاوز حد الطلبات. يرجى المحاولة مجدداً بعد 20 ثانية أو ترقية حسابك في OpenAI.' 
        });
      }
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SuggestTitlesController;