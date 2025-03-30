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
   * تلخيص النص بناءً على الطول والتنسيق المحددين.
   * @param {Object} data - بيانات التلخيص
   */
  static async summarizeText({ text, summaryLength, summaryFormat, userId }) {
    try {
      console.log('Summarizing text with:', { text, summaryLength, summaryFormat, userId });
      const apiKey = await this.getUserApiKey(userId);

      const prompt = `
        أنت أداة تلخيص نصوص ذكية باللغة العربية. قم بتلخيص النص التالي بناءً على الطول والتنسيق المحددين:
        - طول الملخص: "${summaryLength === this.SUMMARY_LENGTHS.SHORT ? 'قصير (نقاط رئيسية فقط)' : summaryLength === this.SUMMARY_LENGTHS.MEDIUM ? 'متوسط (25% من النص)' : 'مفصل (50% من النص)'}"
        - تنسيق الملخص: "${summaryFormat === this.SUMMARY_FORMATS.PARAGRAPH ? 'فقرة نصية' : summaryFormat === this.SUMMARY_FORMATS.POINTS ? 'نقاط مختصرة' : 'فقرة ونقاط معًا'}"
        أعد النتيجة في صيغة JSON تحتوي على:
        - summary: النص المُلخص (كسلسلة نصية)
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      console.log('Sending request to API with:', { text, summaryLength, summaryFormat, userId, apiKey: apiKey.substring(0, 5) + '...' });
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

      if (!result.summary || typeof result.summary !== 'string') {
        throw new Error('لم يتم إرجاع ملخص صالح من API');
      }

      await this.saveSummary({ text, summaryLength, summaryFormat, result, userId });
      return { summary: result.summary };
    } catch (error) {
      console.error('❌ خطأ في summarizeText:', error.message || error);
      throw new Error('فشل في تلخيص النص: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  /**
   * حفظ الملخص في قاعدة البيانات.
   * @param {Object} data - بيانات الملخص
   */
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
}

module.exports = TextSummarizationModel;