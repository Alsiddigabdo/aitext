const db = require('../config/db');
const axios = require('axios');

class SuggestTitlesModel {
  static API_KEY = process.env.API_KEY;

  // أنواع العناوين المتاحة
  static TITLE_TYPES = {
    LISTS: 'lists',
    QUESTIONS: 'questions',
    HOW_TO: 'how-to',
    REASONS: 'reasons'
  };

  // النبرات المتاحة
  static TONES = {
    PROFESSIONAL: 'professional',
    FRIENDLY: 'friendly',
    PROVOCATIVE: 'provocative',
    HUMOROUS: 'humorous',
    EMOTIONAL: 'emotional'
  };

  /**
   * توليد عناوين جذابة بناءً على الوصف، النبرة، وأنواع العناوين المحددة.
   */
  static async generateTitles(content, tone, types) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: this.getSystemPrompt(tone, types) },
            { role: "user", content: content }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`
          }
        }
      );

      const titles = this.processResponse(response.data);
      await this.saveSuggestion({ content, tone, types, titles });
      return titles;
    } catch (error) {
      console.error('❌ خطأ في generateTitles:', error.message || error);
      throw new Error('فشل في اقتراح العناوين.');
    }
  }

  /**
   * إرجاع تعليمات النظام بناءً على النبرة وأنواع العناوين.
   */
  static getSystemPrompt(tone, types) {
    const baseInstruction = `
      أنت أداة لاقتراح عناوين تسويقية جذابة باللغة العربية. بناءً على وصف المحتوى، النبرة، وأنواع العناوين المطلوبة، أنشئ 5 عناوين دقيقة ومبتكرة.
      أرجع النتائج كمصفوفة JSON نقية (مثال: ["عنوان 1", "عنوان 2", "عنوان 3", "عنوان 4", "عنوان 5"]) بدون أي نصوص إضافية أو تنسيق إضافي أو تعليقات.
    `;

    const tonePrompts = {
      [this.TONES.PROFESSIONAL]: 'استخدم نبرة احترافية وموضوعية تناسب السياقات الرسمية.',
      [this.TONES.FRIENDLY]: 'استخدم نبرة ودودة ومرحة تجذب القارئ بلطف.',
      [this.TONES.PROVOCATIVE]: 'استخدم نبرة استفزازية تثير الفضول أو التحدي.',
      [this.TONES.HUMOROUS]: 'استخدم نبرة فكاهية تضيف لمسة من المرح.',
      [this.TONES.EMOTIONAL]: 'استخدم نبرة عاطفية تلامس مشاعر القارئ.'
    };

    const typesPrompt = types.map(type => {
      switch (type) {
        case this.TITLE_TYPES.LISTS:
          return 'أنشئ عناوين على شكل قوائم (مثال: "5 طرق ل...").';
        case this.TITLE_TYPES.QUESTIONS:
          return 'أنشئ عناوين على شكل أسئلة (مثال: "هل تعرف...؟").';
        case this.TITLE_TYPES.HOW_TO:
          return 'أنشئ عناوين تعليمية (مثال: "كيف تفعل...").';
        case this.TITLE_TYPES.REASONS:
          return 'أنشئ عناوين تعتمد على الأسباب (مثال: "لماذا تحتاج...").';
        default:
          return '';
      }
    }).join(' ');

    return `${baseInstruction}\nالنبرة: ${tonePrompts[tone] || tonePrompts[this.TONES.PROFESSIONAL]}\nأنواع العناوين: ${typesPrompt}`;
  }

  /**
   * معالجة الاستجابة وإرجاع العناوين.
   */
  static processResponse(data) {
    let rawContent = data?.choices?.[0]?.message?.content?.trim() || '[]';
    console.log('Raw API Response:', rawContent);

    // إزالة أي تنسيق غير مرغوب فيه
    rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
      const titles = JSON.parse(rawContent);
      if (!Array.isArray(titles)) {
        throw new Error('الاستجابة ليست مصفوفة JSON صالحة');
      }
      return titles;
    } catch (error) {
      console.error('❌ خطأ في تحليل JSON:', error.message || error);
      return ["لم يتم تلقي عناوين صالحة من الاستجابة."];
    }
  }

  /**
   * حفظ الاقتراح في قاعدة البيانات.
   */
  static async saveSuggestion({ content, tone, types, titles }) {
    try {
      const sql = 'INSERT INTO title_suggestions (content, tone, types, titles, created_at) VALUES (?, ?, ?, ?, NOW())';
      await db.query(sql, [content, tone, JSON.stringify(types), JSON.stringify(titles)]);
      console.log('✅ تم حفظ الاقتراح بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ الاقتراح:', error.message || error);
      throw new Error('فشل في حفظ الاقتراح.');
    }
  }
}

module.exports = SuggestTitlesModel;
