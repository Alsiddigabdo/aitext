const db = require('../config/db');
const axios = require('axios');

class TextComparisonModel {
  static API_KEY = process.env.API_KEY;

  /**
   * مقارنة نصين وإرجاع النتائج بتنسيق JSON.
   * @param {string} originalText - النص الأصلي
   * @param {string} newText - النص الجديد
   */
  static async compareTexts(originalText, newText) {
    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `
              أنت أداة مخصصة لمقارنة النصوص فقط. قارن بين النصين التاليين (الأصلي والجديد) وأعد النتائج باختصار ودقة في صيغة JSON تحتوي على:
              - similarity: نسبة التشابه (عدد من 0 إلى 100)
              - added: عدد الكلمات المضافة
              - removed: عدد الكلمات المحذوفة
              - changed: عدد الكلمات المعدلة
              - unchanged: عدد الكلمات غير المعدلة
              - improvementText: وصف موجز للتحسينات بالعربية
              لا تقدم أي معلومات إضافية أو إسهاب خارج هذا الهيكل.
            `
          },
          {
            role: "user",
            content: `النص الأصلي: "${originalText}"\nالنص الجديد: "${newText}"`
          }
        ],
        temperature: 0.3, // لضمان رد دقيق ومحدد
        max_tokens: 500
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        }
      });

      const result = JSON.parse(response.data.choices[0].message.content);
      await this.saveComparison({ originalText, newText, result });
      return result;
    } catch (error) {
      console.error('❌ خطأ في compareTexts:', error.message || error);
      throw new Error('فشل في مقارنة النصوص.');
    }
  }

  /**
   * حفظ نتائج المقارنة في قاعدة البيانات.
   */
  static async saveComparison({ originalText, newText, result }) {
    try {
      const sql = 'INSERT INTO text_comparisons (original_text, new_text, result, created_at) VALUES (?, ?, ?, NOW())';
      await db.query(sql, [originalText, newText, JSON.stringify(result)]);
      console.log('✅ تم حفظ المقارنة بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ المقارنة:', error.message || error);
      throw new Error('فشل في حفظ المقارنة.');
    }
  }
}

module.exports = TextComparisonModel;