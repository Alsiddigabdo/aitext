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
            // التحقق من عدم وجود أحرف غير آمنة
            if (/[^a-zA-Z0-9\-_]/.test(openaiKey)) {
                return res.status(400).json({
                    success: false,
                    message: 'المفتاح يحتوي على أحرف غير مسموح بها'
                });
            }

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
}

module.exports = OpenAIController;
