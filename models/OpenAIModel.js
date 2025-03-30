const db = require('../config/db');
const crypto = require('crypto');

class OpenAIModel {
  static async saveApiKey(userId, apiKey) {
    try {
      // تشفير المفتاح قبل حفظه
      const encryptedKey = this.encryptKey(apiKey);
      
      const sql = `
        INSERT INTO api_keys (user_id, api_key, created_at, updated_at) 
        VALUES (?, ?, NOW(), NOW()) 
        ON DUPLICATE KEY UPDATE 
          api_key = VALUES(api_key),
          updated_at = NOW()
      `;
      
      await db.query(sql, [userId, encryptedKey]);
      
      console.log(`✅ API key saved/updated successfully for user ${userId}`);
      return { success: true, message: 'تم حفظ مفتاح OpenAI بنجاح' };
    } catch (error) {
      console.error('❌ Error saving API key:', error.message || error);
      throw new Error('فشل في حفظ مفتاح API');
    }
  }

  static async getApiKey(userId) {
    try {
      const [rows] = await db.query('SELECT api_key FROM api_keys WHERE user_id = ?', [userId]);
      
      if (rows.length > 0) {
        // فك تشفير المفتاح عند استرجاعه
        return this.decryptKey(rows[0].api_key);
      }
      return null;
    } catch (error) {
      console.error('❌ Error retrieving API key:', error.message || error);
      throw new Error('فشل في استرجاع مفتاح API');
    }
  }

  // دالة لتشفير المفتاح
  static encryptKey(key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      iv
    );
    let encrypted = cipher.update(key);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  // دالة لفك تشفير المفتاح
  static decryptKey(encryptedKey) {
    const parts = encryptedKey.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
      iv
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }
}

module.exports = OpenAIModel;
