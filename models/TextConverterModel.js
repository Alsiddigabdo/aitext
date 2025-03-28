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

  /**
   * تحويل النص بناءً على نوع التحويل والتنسيقات المحددة.
   */
  static async convertText({ text, conversionType, addBreaks, fixSpelling, improveSentences }) {
    try {
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
          'Authorization': `Bearer ${this.API_KEY}`
        }
      });

      const result = JSON.parse(response.data.choices[0].message.content);
      await this.saveConversion({ text, conversionType, addBreaks, fixSpelling, improveSentences, result });
      return { convertedText: result.convertedText };
    } catch (error) {
      console.error('❌ خطأ في convertText:', error.message || error);
      throw new Error('فشل في تحويل النص.');
    }
  }

  /**
   * حفظ التحويل في قاعدة البيانات.
   */
  static async saveConversion({ text, conversionType, addBreaks, fixSpelling, improveSentences, result }) {
    try {
      const sql = 'INSERT INTO text_conversions (original_text, conversion_type, add_breaks, fix_spelling, improve_sentences, converted_text, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';
      await db.query(sql, [
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