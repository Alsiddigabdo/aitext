const db = require('../config/db');
const axios = require('axios');

class SmartTranslationModel {
  static async getUserApiKey(userId) {
    try {
      const [rows] = await db.query('SELECT api_key FROM api_keys WHERE user_id = ?', [userId]);
      console.log('API key query result:', rows);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0].api_key;
      }
      throw new Error('يرجى إدخال مفتاح API في صفحة تفعيل OpenAI.');
    } catch (error) {
      console.error('❌ خطأ في getUserApiKey:', error.message || error);
      throw error;
    }
  }

  static async translateText({ text, sourceLang, targetLang, options, userId }) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      const prompt = `
        أنت مترجم ذكي محترف. قم بترجمة النص التالي من "${sourceLang}" إلى "${targetLang}" مع مراعاة الخيارات التالية:
        - الحفاظ على الأسلوب: ${options.preserveStyle ? 'نعم' : 'لا'}
        - النبرة الرسمية: ${options.formalTone ? 'نعم' : 'لا'}
        - الوضع الأكاديمي: ${options.academicMode ? 'نعم' : 'لا'}
        - الوضع التسويقي: ${options.marketingMode ? 'نعم' : 'لا'}
        - التكيف الثقافي: ${options.culturalAdapt ? 'نعم' : 'لا'}
        - اكتشاف التعابير: ${options.idiomsDetection ? 'نعم' : 'لا'}
        أعد النتيجة في صيغة JSON تحتوي على:
        - translatedText: النص المترجم
        - quality: كائن يحتوي على (accuracy, style, cultural, fluency) كنسب مئوية (0-100)
        - feedback: ملاحظات موجزة بالعربية عن جودة الترجمة
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      console.log('Sending translation request to API:', { 
        text, 
        sourceLang, 
        targetLang, 
        options, 
        apiKey: apiKey.substring(0, 5) + '...' 
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text }
        ],
        temperature: 0.5,
        max_tokens: 1000,
        timeout: 30000 // إضافة مهلة زمنية للطلب (30 ثانية)
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }).catch(error => {
        console.error('❌ فشل طلب API:', error.response ? error.response.data : error.message);
        throw new Error('فشل في الاتصال بخدمة OpenAI: ' + (error.response?.data?.error?.message || error.message));
      });

      let resultText = response.data.choices[0].message.content;
      console.log('Raw API response:', resultText);

      // تنظيف الاستجابة من أي نصوص غير مرغوب فيها
      resultText = resultText.replace(/```json\n|```/g, '').trim();
      console.log('Cleaned API response:', resultText);

      let result;
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        console.error('❌ فشل في تحليل استجابة API:', e);
        throw new Error('استجابة API غير صالحة');
      }

      // التحقق من اكتمال البيانات
      if (!result.translatedText || !result.quality || !result.feedback) {
        throw new Error('استجابة API غير كاملة');
      }

      // التحقق من صحة قيم الجودة
      const qualityKeys = ['accuracy', 'style', 'cultural', 'fluency'];
      qualityKeys.forEach(key => {
        if (!Number.isInteger(result.quality[key]) || result.quality[key] < 0 || result.quality[key] > 100) {
          console.warn(`⚠️ قيمة ${key} غير صالحة: ${result.quality[key]}`);
          result.quality[key] = 80; // قيمة افتراضية في حالة القيم غير الصحيحة
        }
      });

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
        - الحفاظ على الأسلوب: ${options.preserveStyle ? 'نعم' : 'لا'}
        - النبرة الرسمية: ${options.formalTone ? 'نعم' : 'لا'}
        - الوضع الأكاديمي: ${options.academicMode ? 'نعم' : 'لا'}
        - الوضع التسويقي: ${options.marketingMode ? 'نعم' : 'لا'}
        - التكيف الثقافي: ${options.culturalAdapt ? 'نعم' : 'لا'}
        - اكتشاف التعابير: ${options.idiomsDetection ? 'نعم' : 'لا'}
        النص الأصلي: "${text}"
        الترجمة الحالية: "${translatedText}"
        أعد النتيجة في صيغة JSON تحتوي على:
        - translatedText: النص المترجم المحسن
        - quality: كائن يحتوي على (accuracy, style, cultural, fluency) كنسب مئوية (0-100)
        - feedback: ملاحظات موجزة بالعربية عن جودة الترجمة المحسنة
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      console.log('Sending improve request to API:', { 
        text, 
        translatedText, 
        targetLang, 
        options, 
        apiKey: apiKey.substring(0, 5) + '...' 
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "حسّن الترجمة" }
        ],
        temperature: 0.5,
        max_tokens: 1000,
        timeout: 30000 // إضافة مهلة زمنية للطلب (30 ثانية)
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }).catch(error => {
        console.error('❌ فشل طلب API:', error.response ? error.response.data : error.message);
        throw new Error('فشل في الاتصال بخدمة OpenAI: ' + (error.response?.data?.error?.message || error.message));
      });

      let resultText = response.data.choices[0].message.content;
      console.log('Raw API response:', resultText);

      // تنظيف الاستجابة من أي نصوص غير مرغوب فيها
      resultText = resultText.replace(/```json\n|```/g, '').trim();
      console.log('Cleaned API response:', resultText);

      let result;
      try {
        result = JSON.parse(resultText);
      } catch (e) {
        console.error('❌ فشل في تحليل استجابة API:', e);
        throw new Error('استجابة API غير صالحة');
      }

      // التحقق من اكتمال البيانات
      if (!result.translatedText || !result.quality || !result.feedback) {
        throw new Error('استجابة API غير كاملة');
      }

      // التحقق من صحة قيم الجودة
      const qualityKeys = ['accuracy', 'style', 'cultural', 'fluency'];
      qualityKeys.forEach(key => {
        if (!Number.isInteger(result.quality[key]) || result.quality[key] < 0 || result.quality[key] > 100) {
          console.warn(`⚠️ قيمة ${key} غير صالحة: ${result.quality[key]}`);
          result.quality[key] = 80; // قيمة افتراضية في حالة القيم غير الصحيحة
        }
      });

      await this.saveTranslation({ text, sourceLang: targetLang, targetLang, options, result, userId, improved: true });
      return result;
    } catch (error) {
      console.error('❌ خطأ في improveTranslation:', error.message || error);
      throw new Error('فشل في تحسين الترجمة: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  static async saveTranslation({ text, sourceLang, targetLang, options, result, userId, improved = false }) {
    try {
      const sql = `
        INSERT INTO translations (
          user_id, source_text, source_lang, target_lang, options, 
          translated_text, quality, feedback, improved, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      const [resultRows] = await db.query(sql, [
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
      console.log('✅ تم حفظ الترجمة بنجاح، ID:', resultRows.insertId);
    } catch (error) {
      console.error('❌ خطأ في حفظ الترجمة:', error.message || error);
      throw new Error('فشل في حفظ الترجمة: ' + (error.message || 'خطأ غير معروف'));
    }
  }
}

module.exports = SmartTranslationModel;
