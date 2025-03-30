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

  static async generateTitles({ content, tone, types, userId }) {
    try {
      console.log('Generating titles with:', { content, tone, types, userId });
      const safeTypes = Array.isArray(types) ? types : [];
      const apiKey = await this.getUserApiKey(userId);

      const prompt = `
        أنت أداة لاقتراح عناوين تسويقية جذابة باللغة العربية. بناءً على وصف المحتوى التالي، النبرة، وأنواع العناوين المطلوبة، أنشئ 5 عناوين دقيقة ومبتكرة:
        - النبرة: "${tone || this.TONES.PROFESSIONAL}"
        - أنواع العناوين: "${safeTypes.join(', ') || 'غير محدد'}"
        أعد النتيجة في صيغة JSON تحتوي على:
        - titles: مصفوفة تحتوي على العناوين الخمسة
        - feedback: ملاحظات موجزة بالعربية عن جودة العناوين المقترحة
      `;

      console.log('Sending request to API with:', { content, tone, safeTypes, userId, apiKey: apiKey.substring(0, 5) + '...' });
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

      if (!result.titles || !Array.isArray(result.titles) || result.titles.length === 0) {
        throw new Error('لم يتم إرجاع عناوين صالحة من API');
      }
      if (!result.feedback) {
        result.feedback = 'لا توجد ملاحظات';
      }

      await this.saveSuggestion({ content, tone, types: safeTypes, result, userId });
      return result;
    } catch (error) {
      console.error('❌ خطأ في generateTitles:', error.message || error);
      throw new Error('فشل في اقتراح العناوين: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  static async saveSuggestion({ content, tone, types, result, userId, improved = false }) {
    try {
      const sql = 'INSERT INTO title_suggestions (user_id, content, tone, types, titles, feedback, improved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())';
      await db.query(sql, [
        userId,
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