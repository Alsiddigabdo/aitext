const db = require('../config/db');
const axios = require('axios');

class SuggestTitlesModel {
  static API_KEY = process.env.API_KEY;

  static TITLE_TYPES = {
    LISTS: 'lists',
    QUESTIONS: 'questions',
    HOW_TO: 'how-to',
    REASONS: 'reasons'
  };

  static TONES = {
    PROFESSIONAL: 'professional',
    FRIENDLY: 'friendly',
    PROVOCATIVE: 'provocative',
    HUMOROUS: 'humorous',
    EMOTIONAL: 'emotional'
  };

  static async generateTitles({ content, tone, types }) {
    try {
      // التحقق من أن types مصفوفة، إذا لم تكن كذلك، استخدم مصفوفة فارغة
      const safeTypes = Array.isArray(types) ? types : [];

      const prompt = `
        أنت أداة لاقتراح عناوين تسويقية جذابة باللغة العربية. بناءً على وصف المحتوى التالي، النبرة، وأنواع العناوين المطلوبة، أنشئ 5 عناوين دقيقة ومبتكرة:
        - النبرة: "${tone || this.TONES.PROFESSIONAL}"
        - أنواع العناوين: "${safeTypes.join(', ') || 'غير محدد'}"
        أعد النتيجة في صيغة JSON تحتوي على:
        - titles: مصفوفة تحتوي على العناوين الخمسة
        - feedback: ملاحظات موجزة بالعربية عن جودة العناوين المقترحة
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: content || "لا يوجد وصف" }
        ],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        }
      });

      const result = JSON.parse(response.data.choices[0].message.content);
      await this.saveSuggestion({ content, tone, types: safeTypes, result });
      return result;
    } catch (error) {
      console.error('❌ خطأ في generateTitles:', error.message || error);
      throw new Error('فشل في اقتراح العناوين.');
    }
  }

  static async improveTitles({ content, currentTitles, tone, types }) {
    try {
      const safeTypes = Array.isArray(types) ? types : [];

      const prompt = `
        أنت أداة لاقتراح عناوين تسويقية جذابة باللغة العربية. قم بتحسين العناوين التالية بناءً على وصف المحتوى، النبرة، وأنواع العناوين المطلوبة:
        - النبرة: "${tone || this.TONES.PROFESSIONAL}"
        - أنواع العناوين: "${safeTypes.join(', ') || 'غير محدد'}"
        وصف المحتوى: "${content || 'لا يوجد وصف'}"
        العناوين الحالية: "${Array.isArray(currentTitles) ? currentTitles.join(', ') : 'لا توجد عناوين'}"
        أعد النتيجة في صيغة JSON تحتوي على:
        - titles: مصفوفة تحتوي على العناوين الخمسة المحسنة
        - feedback: ملاحظات موجزة بالعربية عن جودة العناوين المحسنة
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: "حسّن العناوين" }
        ],
        temperature: 0.7,
        max_tokens: 500
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.API_KEY}`
        }
      });

      const result = JSON.parse(response.data.choices[0].message.content);
      await this.saveSuggestion({ content, tone, types: safeTypes, result, improved: true });
      return result;
    } catch (error) {
      console.error('❌ خطأ في improveTitles:', error.message || error);
      throw new Error('فشل في تحسين العناوين.');
    }
  }

  static async saveSuggestion({ content, tone, types, result, improved = false }) {
    try {
      const sql = 'INSERT INTO title_suggestions (content, tone, types, titles, feedback, improved, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())';
      await db.query(sql, [
        content || 'لا يوجد وصف',
        tone || this.TONES.PROFESSIONAL,
        JSON.stringify(types),
        JSON.stringify(result.titles),
        result.feedback || 'لا توجد ملاحظات',
        improved ? 1 : 0
      ]);
      console.log('✅ تم حفظ الاقتراح بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ الاقتراح:', error.message || error);
      throw new Error('فشل في حفظ الاقتراح.');
    }
  }
}

module.exports = SuggestTitlesModel;