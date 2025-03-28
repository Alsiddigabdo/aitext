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

  /**
   * تلخيص النص بناءً على الطول والتنسيق المحددين.
   */
  static async summarizeText({ text, summaryLength, summaryFormat }) {
    try {
      const prompt = `
        أنت أداة تلخيص نصوص ذكية باللغة العربية. قم بتلخيص النص التالي بناءً على الطول والتنسيق المحددين:
        - طول الملخص: "${summaryLength === this.SUMMARY_LENGTHS.SHORT ? 'قصير (نقاط رئيسية فقط)' : summaryLength === this.SUMMARY_LENGTHS.MEDIUM ? 'متوسط (25% من النص)' : 'مفصل (50% من النص)'}"
        - تنسيق الملخص: "${summaryFormat === this.SUMMARY_FORMATS.PARAGRAPH ? 'فقرة نصية' : summaryFormat === this.SUMMARY_FORMATS.POINTS ? 'نقاط مختصرة' : 'فقرة ونقاط معًا'}"
        أعد النتيجة في صيغة JSON تحتوي على:
        - summary: النص المُلخص (كسلسلة نصية)
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
      await this.saveSummary({ text, summaryLength, summaryFormat, result });
      return { summary: result.summary };
    } catch (error) {
      console.error('❌ خطأ في summarizeText:', error.message || error);
      throw new Error('فشل في تلخيص النص.');
    }
  }

  /**
   * حفظ الملخص في قاعدة البيانات.
   */
  static async saveSummary({ text, summaryLength, summaryFormat, result }) {
    try {
      const sql = 'INSERT INTO text_summaries (original_text, summary_length, summary_format, summary_text, created_at) VALUES (?, ?, ?, ?, NOW())';
      await db.query(sql, [
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
}

module.exports = TextSummarizationModel;