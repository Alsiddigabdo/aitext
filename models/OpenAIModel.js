const db = require('../config/db');

class OpenAIModel {
    static async saveApiKey(userId, apiKey) {
        try {
            // تنظيف المفتاح من أي أحرف خطرة
            const cleanedKey = apiKey.replace(/[^a-zA-Z0-9\-_]/g, '');
            
            const sql = `
                INSERT INTO api_keys (user_id, api_key, created_at, updated_at) 
                VALUES (?, ?, NOW(), NOW()) 
                ON DUPLICATE KEY UPDATE 
                    api_key = VALUES(api_key),
                    updated_at = NOW()
            `;
            
            await db.query(sql, [userId, cleanedKey]);
            
            console.log(`✅ API key saved for user ${userId}`);
            return { success: true, message: 'تم حفظ مفتاح OpenAI بنجاح' };
        } catch (error) {
            console.error('❌ Error saving API key:', error);
            throw new Error('فشل في حفظ مفتاح API');
        }
    }
}

module.exports = OpenAIModel;
