const OpenAIModel = require('../models/OpenAIModel');

class OpenAIController {
  static async activateOpenAI(req, res) {
    const { openaiKey } = req.body;
    const userId = req.user.id; // يتم استرجاع userId من التوكن بعد المصادقة

    if (!openaiKey) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال مفتاح OpenAI صالح' });
    }

    try {
      const result = await OpenAIModel.saveApiKey(userId, openaiKey);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = OpenAIController;
