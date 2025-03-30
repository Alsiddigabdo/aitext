const EnvManager = require('../models/envManager');

class ApiKeyController {
    static async updateApiKey(req, res) {
        const { openaiKey } = req.body;

        if (!openaiKey || typeof openaiKey !== 'string' || openaiKey.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'يرجى إدخال مفتاح OpenAI صالح'
            });
        }

        try {
            await EnvManager.updateApiKey(openaiKey.trim());
            require('dotenv').config({ override: true });
            return res.status(200).json({
                success: true,
                message: 'تم تحديث مفتاح OpenAI بنجاح'
            });
        } catch (error) {
            console.error('خطأ في تحديث مفتاح API:', error.message);
            return res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء تحديث المفتاح. حاول مرة أخرى لاحقًا'
            });
        }
    }
}

module.exports = ApiKeyController;