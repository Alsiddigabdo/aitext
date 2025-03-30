const db = require('../config/db');
const axios = require('axios');

class TextComparisonModel {
  static API_KEY = process.env.API_KEY;

  static async getUserApiKey(userId) {
    try {
      const [rows] = await db.query('SELECT api_key FROM api_keys WHERE user_id = ?', [userId]);
      console.log('API key query result:', rows);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0].api_key;
      }
      console.log('No user-specific API key found, using default:', this.API_KEY);
      return this.API_KEY;
    } catch (error) {
      console.error('Error in getUserApiKey:', error.message || error);
      console.log('Falling back to default API key:', this.API_KEY);
      return this.API_KEY;
    }
  }

  /**
   * مقارنة نصين وإرجاع النتائج بتنسيق JSON.
   * @param {Object} data - بيانات المقارنة
   */
  static async compareTexts({ originalText, newText, userId }) {
    try {
      console.log('Comparing texts with:', { originalText, newText, userId });
      const apiKey = await this.getUserApiKey(userId);

      const prompt = `
        أنت أداة مخصصة لمقارنة النصوص فقط. قارن بين النصين التاليين (الأصلي والجديد) وأعد النتائج باختصار ودقة في صيغة JSON تحتوي على:
        - similarity: نسبة التشابه (عدد من 0 إلى 100)
        - added: عدد الكلمات المضافة
        - removed: عدد الكلمات المحذوفة
        - changed: عدد الكلمات المعدلة
        - unchanged: عدد الكلمات غير المعدلة
        - improvementText: وصف موجز للتحسينات بالعربية
        لا تقدم أي معلومات إضافية أو إسهاب خارج هذا الهيكل.
      `;

      console.log('Sending request to API with:', { originalText, newText, userId, apiKey: apiKey.substring(0, 5) + '...' });
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: `النص الأصلي: "${originalText}"\nالنص الجديد: "${newText}"` }
        ],
        temperature: 0.3,
        max_tokens: 500
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }).catch(error => {
        console.error('API request failed:', error.response ? error.response.data : error.message);
        throw error;
      });

      let resultText = response.data.choices[0].message.content;
      console.log('Raw API response:', resultText);

      // تنظيف الاستجابة من علامات Markdown
      resultText = resultText.replace(/```json\n|```/g, '').trim();
      console.log('Cleaned API response:', resultText);

      let result;
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        console.error('Failed to parse API response:', e);
        throw new Error('استجابة API غير صالحة');
      }

      if (!result.similarity || !Number.isInteger(result.similarity) || 
          !Number.isInteger(result.added) || !Number.isInteger(result.removed) || 
          !Number.isInteger(result.changed) || !Number.isInteger(result.unchanged) || 
          !result.improvementText) {
        throw new Error('لم يتم إرجاع نتائج مقارنة صالحة من API');
      }

      await this.saveComparison({ originalText, newText, result, userId });
      return result;
    } catch (error) {
      console.error('❌ خطأ في compareTexts:', error.message || error);
      throw new Error('فشل في مقارنة النصوص: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  /**
   * حفظ نتائج المقارنة في قاعدة البيانات.
   * @param {Object} data - بيانات المقارنة
   */
  static async saveComparison({ originalText, newText, result, userId }) {
    try {
      const sql = `
        INSERT INTO text_comparisons (user_id, original_text, new_text, result, created_at)
        VALUES (?, ?, ?, ?, NOW())
      `;
      await db.query(sql, [userId, originalText, newText, JSON.stringify(result)]);
      console.log('✅ تم حفظ المقارنة بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ المقارنة:', error.message || error);
      throw new Error('فشل في حفظ المقارنة.');
    }
  }
}

module.exports = TextComparisonModel;