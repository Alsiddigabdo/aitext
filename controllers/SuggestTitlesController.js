const SuggestTitlesModel = require('../models/SuggestTitlesModel');

class SuggestTitlesController {
  static async renderSuggestPage(req, res) {
    res.render('suggest-titles');
  }

  static async suggestTitles(req, res) {
    const { content, tone, types } = req.body;

    if (!content || !tone || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ error: 'وصف المحتوى، النبرة، وأنواع العناوين (على الأقل واحد) مطلوبة' });
    }

    try {
      const result = await SuggestTitlesModel.generateTitles({ content, tone, types });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async improveTitles(req, res) {
    const { content, currentTitles, tone, types } = req.body;

    if (!content || !Array.isArray(currentTitles) || !tone || !Array.isArray(types) || types.length === 0) {
      return res.status(400).json({ error: 'وصف المحتوى، العناوين الحالية، النبرة، وأنواع العناوين (على الأقل واحد) مطلوبة' });
    }

    try {
      const result = await SuggestTitlesModel.improveTitles({ content, currentTitles, tone, types });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = SuggestTitlesController;