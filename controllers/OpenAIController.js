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
            
            if (result.success) {
                return res.status(200).json(result);
            } else {
                return res.status(429).json(result); // 429 Too Many Requests
            }
        } catch (error) {
            console.error('API Key Activation Error:', error);
            
            if (error.message.includes('ER_USER_LIMIT_REACHED')) {
                return res.status(429).json({ 
                    success: false, 
                    message: 'تم تجاوز الحد المسموح من الاتصالات، يرجى المحاولة بعد ساعة' 
                });
            }
            
            return res.status(500).json({ 
                success: false, 
                message: 'حدث خطأ أثناء تفعيل المفتاح' 
            });
        }
    }
}

module.exports = OpenAIController;
