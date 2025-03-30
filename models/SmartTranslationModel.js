const db = require('../config/db');
const axios = require('axios');

class SmartTranslationModel {
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

  static async translateText({ text, sourceLang, targetLang, options, userId }) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      const prompt = `
        أنت مترجم ذكي محترف. قم بترجمة النص التالي من "${sourceLang}" إلى "${targetLang}" مع مراعاة الخيارات التالية:
        - الحفاظ على الأسلوب: ${options.preserveStyle}
        - النبرة الرسمية: ${options.formalTone}
        - الوضع الأكاديمي: ${options.academicMode}
        - الوضع التسويقي: ${options.marketingMode}
        - التكيف الثقافي: ${options.culturalAdapt}
        - اكتشاف التعابير: ${options.idiomsDetection}
        أعد النتيجة في صيغة JSON تحتوي على:
        - translatedText: النص المترجم
        - quality: كائن يحتوي على (accuracy, style, cultural, fluency) كنسب مئوية (0-100)
        - feedback: ملاحظات موجزة بالعربية عن جودة الترجمة
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      console.log('Sending translation request to API:', { text, sourceLang, targetLang, options, apiKey: apiKey.substring(0, 5) + '...' });
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text }
        ],
        temperature: 0.5,
        max_tokens: 1000
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

      if (!result.translatedText || !result.quality || !result.feedback) {
        throw new Error('استجابة API غير كاملة');
      }

      await this.saveTranslation({ text, sourceLang, targetLang, options, result, userId });
      return result;
    } catch (error) {
      console.error('❌ خطأ في translateText:', error.message || error);
      throw new Error('فشل في ترجمة النص: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  static async improveTranslation({ text, translatedText, targetLang, options, userId }) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      const prompt = `
        أنت مترجم ذكي محترف. قم بتحسين الترجمة التالية للنص الأصلي إلى "${targetLang}" مع مراعاة الخيارات التالية:
        - الحفاظ على الأسلوب: ${options.preserveStyle}
        - النبرة الرسمية: ${options.formalTone}
        - الوضع الأكاديمي: ${options.academicMode}
        - الوضع التسويقي: ${options.marketingMode}
        - التكيف الثقافي: ${options.culturalAdapt}
        - اكتشاف التعابير: ${options.idiomsDetection}
        النص الأصلي: "${text}"
        الترجمة الحالية: "${translatedText}"
        أعد النتيجة في صيغة JSON تحتوي على:
        - translatedText: النص المترجم المحسن
        - quality: كائن يحتوي على (accuracy, style, cultural, fluency) كنسب مئوية (0-100)
        - feedback: ملاحظات موجزة بالعربية عن جودة الترجمة المحسنة
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      console.log('Sending improve request to API:', { text, translatedText, targetLang, options, apiKey: apiKey.substring(0, 5) + '...' });
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "حسّن الترجمة" }
        ],
        temperature: 0.5,
        max_tokens: 1000
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

      if (!result.translatedText || !result.quality || !result.feedback) {
        throw new Error('استجابة API غير كاملة');
      }

      await this.saveTranslation({ text, sourceLang: targetLang, targetLang, options, result, userId, improved: true });
      return result;
    } catch (error) {
      console.error('❌ خطأ في improveTranslation:', error.message || error);
      throw new Error('فشل في تحسين الترجمة: ' + (error.message || 'خطأ غير معروف'));
    }
  }

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
}

module.exports = SmartTranslationModel;