const db = require('../config/db');
const axios = require('axios');

class SmartTranslationModel {
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

  // ترجمة النص
  static async translateText({ text, sourceLang, targetLang, options = {}, userId }) {
    try {
      console.log('Translating text with:', { text, sourceLang, targetLang, options, userId });
      const apiKey = await this.getUserApiKey(userId);
      if (!apiKey) throw new Error('مفتاح API غير صالح');

      const messages = [
        {
          role: 'system',
          content: `
            أنت مترجم ذكي محترف. قم بترجمة النص التالي من "${sourceLang}" إلى "${targetLang}" مع مراعاة الخيارات التالية:
            - الحفاظ على الأسلوب: ${options.preserveStyle || false}
            - النبرة الرسمية: ${options.formalTone || false}
            - الوضع الأكاديمي: ${options.academicMode || false}
            - الوضع التسويقي: ${options.marketingMode || false}
            - التكيف الثقافي: ${options.culturalAdapt || false}
            - اكتشاف التعابير: ${options.idiomsDetection || false}
            أعد النتيجة في صيغة JSON كالتالي:
            {
              "translatedText": "النص المترجم",
              "quality": {"accuracy": نسبة, "style": نسبة, "cultural": نسبة, "fluency": نسبة},
              "feedback": "ملاحظات موجزة بالعربية"
            }
            لا تضف أي معلومات إضافية خارج هذا الهيكل.
          `
        },
        {
          role: 'user',
          content: text
        }
      ];

      console.log('Sending translation request to API:', { 
        text: text.substring(0, 50) + '...', 
        sourceLang, 
        targetLang, 
        userId, 
        apiKey: apiKey.substring(0, 10) + '...' 
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
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
      await this.saveTranslation({ text, sourceLang, targetLang, options, result, userId });
      return result;
    } catch (error) {
      console.error('❌ خطأ في translateText:', error.message || error);
      throw this.handleError(error);
    }
  }

  // تحسين الترجمة
  static async improveTranslation({ text, translatedText, targetLang, options = {}, userId }) {
    try {
      console.log('Improving translation with:', { text, translatedText, targetLang, options, userId });
      const apiKey = await this.getUserApiKey(userId);
      if (!apiKey) throw new Error('مفتاح API غير صالح');

      const messages = [
        {
          role: 'system',
          content: `
            أنت مترجم ذكي محترف. قم بتحسين الترجمة التالية للنص الأصلي إلى "${targetLang}" مع مراعاة الخيارات التالية:
            - الحفاظ على الأسلوب: ${options.preserveStyle || false}
            - النبرة الرسمية: ${options.formalTone || false}
            - الوضع الأكاديمي: ${options.academicMode || false}
            - الوضع التسويقي: ${options.marketingMode || false}
            - التكيف الثقافي: ${options.culturalAdapt || false}
            - اكتشاف التعابير: ${options.idiomsDetection || false}
            النص الأصلي: "${text}"
            الترجمة الحالية: "${translatedText}"
            أعد النتيجة في صيغة JSON كالتالي:
            {
              "translatedText": "النص المترجم المحسن",
              "quality": {"accuracy": نسبة, "style": نسبة, "cultural": نسبة, "fluency": نسبة},
              "feedback": "ملاحظات موجزة بالعربية"
            }
            لا تضف أي معلومات إضافية خارج هذا الهيكل.
          `
        },
        {
          role: 'user',
          content: 'حسّن الترجمة'
        }
      ];

      console.log('Sending improve request to API:', { 
        text: text.substring(0, 50) + '...', 
        translatedText: translatedText.substring(0, 50) + '...', 
        targetLang, 
        userId, 
        apiKey: apiKey.substring(0, 10) + '...' 
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
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
      await this.saveTranslation({ text, sourceLang: targetLang, targetLang, options, result, userId, improved: true });
      return result;
    } catch (error) {
      console.error('❌ خطأ في improveTranslation:', error.message || error);
      throw this.handleError(error);
    }
  }

  // معالجة استجابة API
  static processApiResponse(response) {
    try {
      const content = response.data.choices[0]?.message?.content;
      if (!content) throw new Error('لا توجد استجابة من API');

      const parsed = JSON.parse(content);
      if (!parsed.translatedText || typeof parsed.translatedText !== 'string' || 
          !parsed.quality || typeof parsed.quality !== 'object' || 
          !parsed.feedback || typeof parsed.feedback !== 'string') {
        throw new Error('تنسيق الاستجابة غير صالح');
      }

      // التحقق من أن جميع قيم "quality" هي نسب مئوية صالحة
      const qualityFields = ['accuracy', 'style', 'cultural', 'fluency'];
      for (const field of qualityFields) {
        if (!Number.isInteger(parsed.quality[field]) || parsed.quality[field] < 0 || parsed.quality[field] > 100) {
          throw new Error(`قيمة "${field}" في "quality" غير صالحة`);
        }
      }

      return parsed;
    } catch (e) {
      console.error('Response processing error:', e);
      throw new Error('فشل في معالجة استجابة API');
    }
  }

  // حفظ الترجمة في قاعدة البيانات
  static async saveTranslation({ text, sourceLang, targetLang, options, result, userId, improved = false }) {
    try {
      const sql = 'INSERT INTO translations (user_id, source_text, source_lang, target_lang, options, translated_text, quality, feedback, improved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())';
      await db.query(sql, [
        userId,
        text,
        sourceLang,
        targetLang,
        JSON.stringify(options),
        result.translatedText,
        JSON.stringify(result.quality),
        result.feedback,
        improved ? 1 : 0
      ]);
      console.log('✅ تم حفظ الترجمة بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ الترجمة:', error.message || error);
      throw new Error('فشل في حفظ الترجمة.');
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

module.exports = SmartTranslationModel;
