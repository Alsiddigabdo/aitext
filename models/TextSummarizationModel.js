const db = require('../config/db');
const axios = require('axios');

class TextSummarizationModel {
  static API_KEY = process.env.API_KEY;

  static SUMMARY_LENGTHS = {
    SHORT: 'short',
    MEDIUM: 'medium',
    LONG: 'long'
  };

  static SUMMARY_FORMATS = {
    PARAGRAPH: 'paragraph',
    POINTS: 'points',
    BOTH: 'both'
  };

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

  // تلخيص النص بناءً على الطول والتنسيق المحددين
  static async summarizeText({ text, summaryLength, summaryFormat, userId }) {
    try {
      console.log('Summarizing text with:', { text, summaryLength, summaryFormat, userId });
      const apiKey = await this.getUserApiKey(userId);
      if (!apiKey) throw new Error('مفتاح API غير صالح');

      const messages = [
        {
          role: "system",
          content: `
            أنت أداة تلخيص نصوص ذكية باللغة العربية. قم بتلخيص النص التالي بناءً على الطول والتنسيق المحددين:
            - طول الملخص: "${summaryLength === this.SUMMARY_LENGTHS.SHORT ? 'قصير (نقاط رئيسية فقط)' : summaryLength === this.SUMMARY_LENGTHS.MEDIUM ? 'متوسط (25% من النص)' : 'مفصل (50% من النص)'}"
            - تنسيق الملخص: "${summaryFormat === this.SUMMARY_FORMATS.PARAGRAPH ? 'فقرة نصية' : summaryFormat === this.SUMMARY_FORMATS.POINTS ? 'نقاط مختصرة' : 'فقرة ونقاط معًا'}"
            أعد النتيجة في صيغة JSON كالتالي:
            {
              "summary": "النص المُلخص (كسلسلة نصية)"
            }
            لا تضف أي معلومات إضافية خارج هذا الهيكل.
          `
        },
        {
          role: "user",
          content: text || "لا يوجد نص"
        }
      ];

      console.log('Sending request to API with:', { 
        text: text.substring(0, 50) + '...', 
        summaryLength, 
        summaryFormat, 
        userId, 
        apiKey: apiKey.substring(0, 10) + '...' 
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" } // إضافة تنسيق JSON
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
      await this.saveSummary({ text, summaryLength, summaryFormat, result, userId });
      return { summary: result.summary };
    } catch (error) {
      console.error('❌ خطأ في summarizeText:', error.message || error);
      throw this.handleError(error);
    }
  }

  // معالجة استجابة API
  static processApiResponse(response) {
    try {
      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('لا توجد استجابة من API');

      const parsed = JSON.parse(content);
      if (!parsed.summary || typeof parsed.summary !== 'string') {
        throw new Error('تنسيق الاستجابة غير صالح');
      }

      return parsed;
    } catch (e) {
      console.error('Response processing error:', e);
      throw new Error('فشل في معالجة استجابة API');
    }
  }

  // حفظ الملخص في قاعدة البيانات
  static async saveSummary({ text, summaryLength, summaryFormat, result, userId }) {
    try {
      const sql = `
        INSERT INTO text_summaries (user_id, original_text, summary_length, summary_format, summary_text, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      await db.query(sql, [
        userId,
        text || 'لا يوجد نص',
        summaryLength || this.SUMMARY_LENGTHS.SHORT,
        summaryFormat || this.SUMMARY_FORMATS.PARAGRAPH,
        result.summary
      ]);
      console.log('✅ تم حفظ الملخص بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ الملخص:', error.message || error);
      throw new Error('فشل في حفظ الملخص.');
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

module.exports = TextSummarizationModel;
