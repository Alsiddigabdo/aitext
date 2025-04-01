const db = require('../config/db');
const axios = require('axios');

class TextConverterModel {
  static API_KEY = process.env.API_KEY;

  static CONVERSION_TYPES = {
    PLAIN_TO_ACADEMIC: 'plain_to_academic',
    MARKETING_TO_FORMAL: 'marketing_to_formal',
    COLLOQUIAL_TO_STANDARD: 'colloquial_to_standard',
    SUMMARY: 'summary'
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

  // تحويل النص بناءً على نوع التحويل والتنسيقات المحددة
  static async convertText({ text, conversionType, addBreaks, fixSpelling, improveSentences, userId }) {
    try {
      console.log('Converting text with:', { text, conversionType, addBreaks, fixSpelling, improveSentences, userId });
      const apiKey = await this.getUserApiKey(userId);
      if (!apiKey) throw new Error('مفتاح API غير صالح');

      const messages = [
        {
          role: "system",
          content: `
            أنت أداة ذكية لتحويل النصوص باللغة العربية. قم بتحويل النص التالي بناءً على الخيارات التالية:
            - نوع التحويل: "${
              conversionType === this.CONVERSION_TYPES.PLAIN_TO_ACADEMIC ? 'من نص عادي إلى نص أكاديمي' :
              conversionType === this.CONVERSION_TYPES.MARKETING_TO_FORMAL ? 'من نص تسويقي إلى صيغة رسمية' :
              conversionType === this.CONVERSION_TYPES.COLLOQUIAL_TO_STANDARD ? 'من لغة عامية إلى لغة فصحى' :
              'تلخيص النص'
            }"
            - إضافة فواصل تلقائية: "${addBreaks ? 'نعم' : 'لا'}"
            - تصحيح الأخطاء الإملائية: "${fixSpelling ? 'نعم' : 'لا'}"
            - تحسين تراكيب الجمل: "${improveSentences ? 'نعم' : 'لا'}"
            أعد النتيجة في صيغة JSON كالتالي:
            {
              "convertedText": "النص المحوّل (كسلسلة نصية)"
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
        conversionType, 
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
      await this.saveConversion({ text, conversionType, addBreaks, fixSpelling, improveSentences, result, userId });
      return { convertedText: result.convertedText };
    } catch (error) {
      console.error('❌ خطأ في convertText:', error.message || error);
      throw this.handleError(error);
    }
  }

  // معالجة استجابة API
  static processApiResponse(response) {
    try {
      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('لا توجد استجابة من API');

      const parsed = JSON.parse(content);
      if (!parsed.convertedText || typeof parsed.convertedText !== 'string') {
        throw new Error('تنسيق الاستجابة غير صالح');
      }

      return parsed;
    } catch (e) {
      console.error('Response processing error:', e);
      throw new Error('فشل في معالجة استجابة API');
    }
  }

  // حفظ التحويل في قاعدة البيانات
  static async saveConversion({ text, conversionType, addBreaks, fixSpelling, improveSentences, result, userId }) {
    try {
      const sql = `
        INSERT INTO text_conversions (user_id, original_text, conversion_type, add_breaks, fix_spelling, improve_sentences, converted_text, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      await db.query(sql, [
        userId,
        text || 'لا يوجد نص',
        conversionType || this.CONVERSION_TYPES.PLAIN_TO_ACADEMIC,
        addBreaks ? 1 : 0,
        fixSpelling ? 1 : 0,
        improveSentences ? 1 : 0,
        result.convertedText
      ]);
      console.log('✅ تم حفظ التحويل بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ التحويل:', error.message || error);
      throw new Error('فشل في حفظ التحويل.');
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

module.exports = TextConverterModel;
