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
   * تحويل النص بناءً على نوع التحويل والتنسيقات المحددة.
   * @param {Object} data - بيانات التحويل
   */
  static async convertText({ text, conversionType, addBreaks, fixSpelling, improveSentences, userId }) {
    try {
      console.log('Converting text with:', { text, conversionType, addBreaks, fixSpelling, improveSentences, userId });
      const apiKey = await this.getUserApiKey(userId);

      const prompt = `
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
        أعد النتيجة في صيغة JSON تحتوي على:
        - convertedText: النص المحوّل (كسلسلة نصية)
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      console.log('Sending request to API with:', { text, conversionType, userId, apiKey: apiKey.substring(0, 5) + '...' });
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text || "لا يوجد نص" }
        ],
        temperature: 0.7,
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

      if (!result.convertedText || typeof result.convertedText !== 'string') {
        throw new Error('لم يتم إرجاع نص محوّل صالح من API');
      }

      await this.saveConversion({ text, conversionType, addBreaks, fixSpelling, improveSentences, result, userId });
      return { convertedText: result.convertedText };
    } catch (error) {
      console.error('❌ خطأ في convertText:', error.message || error);
      throw new Error('فشل في تحويل النص: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  /**
   * حفظ التحويل في قاعدة البيانات.
   * @param {Object} data - بيانات التحويل
   */
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
}

module.exports = TextConverterModel;