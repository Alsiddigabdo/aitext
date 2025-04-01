const db = require('../config/db');

class OpenAIModel {
    static async saveApiKey(userId, openaiKey) {
        try {
            console.log('Executing saveApiKey with:', { userId, openaiKey: openaiKey.substring(0, 10) + '...' });
            const sql = 'UPDATE users SET openai_key = ? WHERE id = ?';
            const result = await db.query(sql, [openaiKey, userId]);
            console.log('Full SQL query result:', result);

            if (result.affectedRows === 0) {
                console.log(`No user found with ID: ${userId}`);
                return { success: false, message: 'لم يتم العثور على المستخدم' };
            }
            console.log(`Successfully updated openai_key for user ${userId}, affected rows: ${result.affectedRows}`);
            return { success: true, message: 'تم حفظ مفتاح OpenAI بنجاح' };
        } catch (error) {
            console.error('Error saving OpenAI key:', error);
            throw error;
        }
    }

    static async getApiKey(userId) {
        try {
            console.log('Executing getApiKey for user:', userId);
            const sql = 'SELECT openai_key FROM users WHERE id = ?';
            const result = await db.query(sql, [userId]); // إزالة التفكيك لأننا نتعامل مع الكائن مباشرة
            console.log('Raw SQL query result:', result);

            // التحقق مما إذا كانت النتيجة مصفوفة أو كائن
            const row = Array.isArray(result) ? result[0] : result;
            const openaiKey = row?.openai_key || null;

            if (!openaiKey) {
                console.log(`❌ No API key found for user ID: ${userId}`);
                return null;
            }

            console.log(`✅ Successfully retrieved API key for user ${userId}:`, openaiKey.substring(0, 10) + '...');
            return openaiKey;
        } catch (error) {
            console.error('❌ Error retrieving OpenAI key:', error);
            throw error;
        }
    }
}

module.exports = OpenAIModel;
