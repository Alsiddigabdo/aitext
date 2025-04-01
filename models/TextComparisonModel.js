const db = require('../config/db');
const axios = require('axios');

class TextComparisonModel {
  static API_KEY = process.env.API_KEY;

  // جلب مفتاح API الخاص بالمستخدم من قاعدة البيانات
  static async getUserApiKey(userId) {
    try {
      const [rows] = await db.query('SELECT api_key FROM api_keys WHERE user_id = ?', [userId]);
      console.log('API key query result:', rows);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0].api_key;
      }
      console.log('No user-specific API key found, using default:', this.API_KEY?.substring(0, 10) + '...');
      return this.API_KEY;
    } catch (error) {
      console.error('Error in getUserApiKey:', error.message || error);
      console.log('Falling back to default API key:', this.API_KEY?.substring(0, 10) + '...');
      return this.API_KEY;
    }
  }

  // مقارنة نصين وإرجاع النتائج بتنسيق JSON
  static async compareTexts({ originalText, newText, userId }) {
    try {
      console.log('Comparing texts with:', { originalText, newText, userId });
      const apiKey = await this.getUserApiKey(userId);
      if (!apiKey) throw new Error('مفتاح API غير صالح');

      const messages = [
        {
          role: "system",
          content: `
            أنت أداة مخصصة لمقارنة النصوص فقط. قارن بين النصين التاليين (الأصلي والجديد) وأعد النتائج باختصار ودقة بتنسيق JSON كالتالي:
            {
              "similarity": نسبة التشابه (عدد من 0 إلى 100),
              "added": عدد الكلمات المضافة,
              "removed": عدد الكلمات المحذوفة,
              "changed": عدد الكلمات المعدلة,
              "unchanged": عدد الكلمات غير المعدلة,
              "improvementText": "وصف موجز للتحسينات بالعربية"
            }
            لا تقدم أي معلومات إضافية أو إسهاب خارج هذا الهيكل.
          `
        },
        {
          role: "user",
          content: `النص الأصلي: "${originalText}"\nالنص الجديد: "${newText}"`
        }
      ];

      console.log('Sending request to API with:', { 
        originalText: originalText.substring(0, 50) + '...', 
        newText: newText.substring(0, 50) + '...', 
        userId, 
        apiKey: apiKey.substring(0, 10) + '...' 
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages,
        temperature: 0.3,
        max_tokens: 500,
        response_format: { type: "json_object" }
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 20000
      }).catch(error => {
        console.error('API request failed:', error.response ? error.response.data : error.message);
        throw error;
      });

      const result = this.processApiResponse(response);
      await this.saveComparison({ originalText, newText, result, userId });
      return result;
    } catch (error) {
      console.error('❌ خطأ في compareTexts:', error.message || error);
      throw this.handleError(error);
    }
  }

  // معالجة استجابة API
  static processApiResponse(response) {
    try {
      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('لا توجد استجابة من API');

      const parsed = JSON.parse(content);
      if (!Number.isInteger(parsed.similarity) || parsed.similarity < 0 || parsed.similarity > 100 || 
          !Number.isInteger(parsed.added) || parsed.added < 0 || 
          !Number.isInteger(parsed.removed) || parsed.removed < 0 || 
          !Number.isInteger(parsed.changed) || parsed.changed < 0 || 
          !Number.isInteger(parsed.unchanged) || parsed.unchanged < 0 || 
          !parsed.improvementText || typeof parsed.improvementText !== 'string') {
        throw new Error('تنسيق الاستجابة غير صالح');
      }

      return parsed;
    } catch (e) {
      console.error('Response processing error:', e);
      throw new Error('فشل في معالجة استجابة API');
    }
  }

  // حفظ نتائج المقارنة في قاعدة البيانات
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

  // معالجة الأخطاء بشكل موحد
  static handleError(error) {
    if (error.response?.status === 429) {
      return new Error('لقد تجاوزت الحد المسموح من الطلبات. يرجى الانتظار ثم المحاولة مرة أخرى.');
    }
    if (error.code === 'ECONNABORTED') {
      return new Error('انتهت مهلة الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
    }
    if (error.response?.data?.error?.code === 'insufficient_quota') {
      return new Error('تم تجاوز حصتك في OpenAI. يرجى التحقق من خطتك وتفاصيل الفوترة في https://platform.openai.com/account.');
    }
    if (error.response?.data?.error?.code === 'model_not_found') {
      return new Error('النموذج غير متاح. يرجى التحقق من إعدادات النموذج أو مفتاح API.');
    }
    if (error.response?.data?.error?.type === 'invalid_request_error') {
      return new Error('خطأ في الطلب: ' + error.response.data.error.message);
    }
    return new Error(error.message || 'حدث خطأ أثناء المعالجة');
  }
}

module.exports = TextComparisonModel;
