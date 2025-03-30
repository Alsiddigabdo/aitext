const db = require('../config/db');

class OpenAIModel {
  static async saveApiKey(userId, apiKey) {
    try {
      const sql = `
        INSERT INTO api_keys (user_id, api_key, created_at, updated_at) 
        VALUES (?, ?, NOW(), NOW()) 
        ON DUPLICATE KEY UPDATE 
          api_key = VALUES(api_key),
          updated_at = NOW()
      `;
      
      await db.query(sql, [userId, apiKey]);
      
      console.log(`✅ API key saved/updated for user ${userId}`);
      return { success: true, message: 'تم حفظ مفتاح OpenAI بنجاح' };
    } catch (error) {
      console.error('❌ Error saving API key:', error);
      throw new Error('فشل في حفظ مفتاح API');
    }
  }

  static async getApiKey(userId) {
    try {
      const [rows] = await db.query('SELECT api_key FROM api_keys WHERE user_id = ?', [userId]);
      
      if (rows.length > 0) {
        return rows[0].api_key;
      }
      return null;
    } catch (error) {
      console.error('❌ Error retrieving API key:', error);
      throw new Error('فشل في استرجاع مفتاح API');
    }
  }
}

module.exports = OpenAIModel;
