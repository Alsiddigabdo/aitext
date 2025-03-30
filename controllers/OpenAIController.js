const OpenAIModel = require('../models/OpenAIModel');

class OpenAIController {
  static async activateOpenAI(req, res) {
    const { openaiKey } = req.body;
    const userId = req.user.id;

    if (!openaiKey || !openaiKey.startsWith('sk-')) {
      return res.status(400).json({ 
        success: false, 
        message: 'يرجى إدخال مفتاح OpenAI صالح يبدأ بـ sk-' 
      });
    }

    try {
      const result = await OpenAIModel.saveApiKey(userId, openaiKey);
      res.status(200).json(result);
    } catch (error) {
      console.error('API Key Activation Error:', error);
      res.status(500).json({ 
        success: false, 
        message: 'حدث خطأ أثناء تفعيل المفتاح' 
      });
    }
  }

  static async getApiKey(req, res) {
    const userId = req.user.id;
    
    try {
      const apiKey = await OpenAIModel.getApiKey(userId);
      res.status(200).json({ 
        success: true, 
        hasApiKey: !!apiKey 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: error.message 
      });
    }
  }
}

module.exports = OpenAIController;
