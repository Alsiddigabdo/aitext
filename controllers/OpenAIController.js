const OpenAIModel = require('../models/OpenAIModel');

class OpenAIController {
    static async activateOpenAI(req, res) {
        console.log('Received request to /api/activate-openai');
        console.log('Full request body:', req.body);

        const { openaiKey } = req.body;
        const userId = req.user.id;

        console.log('Parsed data:', { userId, openaiKey: openaiKey || 'undefined' });

        if (!openaiKey) {
            console.log('Validation failed: No openaiKey provided');
            return res.status(400).json({ success: false, message: 'مفتاح OpenAI مطلوب' });
        }
        if (!openaiKey.startsWith('sk-')) {
            console.log('Validation failed: Invalid key prefix');
            return res.status(400).json({ success: false, message: 'يجب أن يبدأ مفتاح OpenAI بـ sk-' });
        }
        if (openaiKey.length < 30) {
            console.log('Validation failed: Key too short');
            return res.status(400).json({ success: false, message: 'المفتاح قصير جدًا، يرجى التأكد من صحته' });
        }

        try {
            console.log('Attempting to save API key for user:', userId);
            const result = await OpenAIModel.saveApiKey(userId, openaiKey);
            console.log('Save API Key response:', result);

            if (result.success) {
                console.log('API key saved successfully for user:', userId);
                const savedKey = await OpenAIModel.getApiKey(userId);
                console.log('Verified saved API key:', savedKey ? savedKey.substring(0, 10) + '...' : 'null');
                if (!savedKey) {
                    console.log('Error: No key retrieved after saving');
                    return res.status(500).json({ success: false, message: 'فشل في استرجاع المفتاح بعد الحفظ' });
                }
                if (savedKey !== openaiKey) {
                    console.log('Mismatch detected: Saved key does not match provided key');
                    return res.status(500).json({ success: false, message: 'المفتاح المحفوظ لا يتطابق مع المُدخل' });
                }
                return res.status(200).json({ success: true, message: 'تم حفظ مفتاح OpenAI بنجاح', openaiKey: savedKey });
            } else {
                console.log('Failed to save API key:', result.message);
                return res.status(400).json(result);
            }
        } catch (error) {
            console.error('API Key Activation Error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'حدث خطأ أثناء تفعيل المفتاح: ' + error.message 
            });
        }
    }

    static async getApiKey(req, res) {
        const userId = req.user.id;
        console.log('Get API Key request for user:', userId);

        try {
            const openaiKey = await OpenAIModel.getApiKey(userId);
            console.log('Retrieved API Key:', openaiKey ? openaiKey.substring(0, 10) + '...' : 'null');
            return res.status(200).json({
                success: true,
                hasApiKey: !!openaiKey,
                openaiKey: openaiKey || null
            });
        } catch (error) {
            console.error('Error retrieving API key:', error);
            return res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء استرجاع المفتاح: ' + error.message
            });
        }
    }
}

module.exports = OpenAIController;
