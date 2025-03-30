const { pool, handleDisconnect } = require('../config/db');

class OpenAIModel {
    static async saveApiKey(userId, apiKey) {
        let connection;
        try {
            await handleDisconnect();
            connection = await pool.getConnection();
            
            const cleanedKey = apiKey.replace(/[^a-zA-Z0-9\-_]/g, '');
            
            const sql = `
                INSERT INTO api_keys (user_id, api_key, created_at, updated_at) 
                VALUES (?, ?, NOW(), NOW()) 
                ON DUPLICATE KEY UPDATE 
                    api_key = VALUES(api_key),
                    updated_at = NOW()
            `;
            
            await connection.query(sql, [userId, cleanedKey]);
            
            console.log(`✅ تم حفظ مفتاح API للمستخدم ${userId}`);
            return { success: true, message: 'تم حفظ مفتاح OpenAI بنجاح' };
        } catch (error) {
            console.error('❌ خطأ في حفظ مفتاح API:', error);
            
            if (error.code === 'ER_USER_LIMIT_REACHED') {
                return { 
                    success: false, 
                    message: 'تم تجاوز الحد المسموح من الاتصالات، يرجى المحاولة لاحقًا' 
                };
            }
            
            throw new Error('فشل في حفظ مفتاح API');
        } finally {
            if (connection) connection.release();
        }
    }
}

module.exports = OpenAIModel;
