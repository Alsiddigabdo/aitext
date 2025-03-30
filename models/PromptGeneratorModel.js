const db = require('../config/db');
const axios = require('axios');
const NodeCache = require('node-cache');

const promptCache = new NodeCache({
  stdTTL: 3600,
  checkperiod: 120,
});

class PromptGeneratorModel {
  static API_KEY = process.env.API_KEY || 'default-api-key';
  static MAX_INPUT_LENGTH = 1000;

  static async getUserApiKey(userId) {
    try {
      if (!userId || typeof userId !== 'number') throw new Error('معرف المستخدم غير صالح');
      const rows = await db.query('SELECT api_key FROM api_keys WHERE user_id = ?', [userId]);
      return Array.isArray(rows) && rows.length > 0 && rows[0].api_key ? rows[0].api_key : this.API_KEY;
    } catch (error) {
      console.error('❌ خطأ في getUserApiKey:', error.message);
      return this.API_KEY;
    }
  }

  static validateInput({ type, input, settings, userId }) {
    const validTypes = ['text', 'image', 'code', 'audio', 'video', 'data'];
    if (!type || !validTypes.includes(type)) throw new Error('نوع البرومبت غير صالح');
    if (!input || typeof input !== 'string' || input.trim().length === 0) throw new Error('الإدخال مطلوب');
    if (input.length > this.MAX_INPUT_LENGTH) throw new Error(`الإدخال يتجاوز ${this.MAX_INPUT_LENGTH} حرف`);
    if (!settings || typeof settings !== 'object') throw new Error('الإعدادات مطلوبة');
    if (!userId || typeof userId !== 'number') throw new Error('معرف المستخدم غير صالح');
  }

  static async generatePrompt({ type, input, settings, userId }) {
    this.validateInput({ type, input, settings, userId });

    const cacheKey = `${type}:${input}:${JSON.stringify(settings)}:${userId}`;
    const cachedResult = promptCache.get(cacheKey);
    if (cachedResult) return cachedResult;

    const apiKey = await this.getUserApiKey(userId);
    if (!apiKey) throw new Error('مفتاح API غير متاح');

    let promptTemplate = '';
    switch (type) {
      case 'text':
        promptTemplate = this.buildEnhancedTextPrompt(input, settings);
        break;
      case 'image':
        promptTemplate = this.buildEnhancedImagePrompt(input, settings);
        break;
      case 'code':
        promptTemplate = this.buildEnhancedCodePrompt(input, settings);
        break;
      case 'audio':
        promptTemplate = this.buildEnhancedAudioPrompt(input, settings);
        break;
      case 'video':
        promptTemplate = this.buildEnhancedVideoPrompt(input, settings);
        break;
      case 'data':
        promptTemplate = this.buildEnhancedDataPrompt(input, settings);
        break;
      default:
        throw new Error('نوع البرومبت غير مدعوم');
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: promptTemplate },
            { role: 'user', content: input },
          ],
          temperature: 0.5,
          max_tokens: 1000,
        },
        {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          timeout: 30000,
        }
      );

      const resultText = response.data.choices[0].message.content.trim().replace(/```json\n|```/g, '');
      const result = JSON.parse(resultText);
      if (!result.prompt || typeof result.qualityScore !== 'number' || !result.feedback) {
        throw new Error('استجابة API غير كاملة');
      }

      result.qualityScore = Math.min(Math.max(result.qualityScore, 0), 100);
      promptCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('❌ خطأ في generatePrompt:', error.message);
      if (error.response?.status === 429) throw new Error('تم تجاوز حد الطلبات');
      if (error.code === 'ECONNABORTED') throw new Error('انتهت مهلة الطلب');
      throw new Error(`فشل في إنشاء البرومبت: ${error.message}`);
    }
  }

  static buildEnhancedTextPrompt(input, settings) {
    const { textType, tone, length, language } = settings;
    return `
      أنت كاتب محترف وخبير في صياغة برومبتات متقدمة. أنشئ برومبتًا لكتابة نص:
      - نوع النص: "${textType || 'غير محدد'}"
      - نبرة الصوت: "${tone || 'محايد'}"
      - الطول: "${length || 'متوسط'}" (1=50-100 كلمة، 2=100-200، 3=200-400، 4=400-600، 5=600+)
      - اللغة: "${language || 'العربية'}"
      - الهدف: نص متماسك، منظم، ومناسب للغرض مع تجنب التكرار والغموض
      بناءً على: "${input}"
      أعد النتيجة في JSON: { prompt, qualityScore (0-100), feedback (بالعربية) }
    `;
  }

  static buildEnhancedImagePrompt(input, settings) {
    const { imageStyle, imageSize, quality } = settings;
    return `
      أنت فنان رقمي وخبير في صياغة برومبتات للصور (MidJourney/DALL-E). أنشئ برومبتًا:
      - النمط: "${imageStyle || 'واقعي'}"
      - الحجم: "${imageSize || 'مربع'}" (مثل 1:1، 4:5، 16:9)
      - الجودة: "${quality || 'متوسطة'}" (1=منخفضة، 2=متوسطة، 3=عالية)
      - الهدف: صورة واضحة وجذابة بتفاصيل غنية (ألوان، إضاءة، زوايا)
      بناءً على: "${input}"
      أعد النتيجة في JSON: { prompt, qualityScore (0-100), feedback (بالعربية) }
    `;
  }

  static buildEnhancedCodePrompt(input, settings) {
    const { language, complexity, comments, tests, docs } = settings;
    return `
      أنت مبرمج محترف وخبير في صياغة برومبتات للأكواد. أنشئ برومبتًا:
      - اللغة: "${language || 'غير محددة'}"
      - التعقيد: "${complexity || '3'}" (1=بسيط، 5=معقد)
      - تعليقات: ${comments ? 'نعم' : 'لا'}
      - اختبارات: ${tests ? 'نعم' : 'لا'}
      - توثيق: ${docs ? 'نعم' : 'لا'}
      - الهدف: كود نظيف، فعال، ومنظم وفق أفضل الممارسات
      بناءً على: "${input}"
      أعد النتيجة في JSON: { prompt, qualityScore (0-100), feedback (بالعربية) }
    `;
  }

  static buildEnhancedAudioPrompt(input, settings) {
    const { voiceType, tone, speed, language } = settings;
    return `
      أنت خبير في صياغة برومبتات لتحويل النص إلى صوت (مثل ElevenLabs). أنشئ برومبتًا:
      - نوع الصوت: "${voiceType || 'محايد'}"
      - النبرة: "${tone || 'عادية'}"
      - السرعة: "${speed || 'متوسطة'}" (1=بطيئة، 3=متوسطة، 5=سريعة)
      - اللغة: "${language || 'العربية'}"
      - الهدف: صوت طبيعي، واضح، ومناسب للسياق
      بناءً على: "${input}"
      أعد النتيجة في JSON: { prompt, qualityScore (0-100), feedback (بالعربية) }
    `;
  }

  static buildEnhancedVideoPrompt(input, settings) {
    const { style, duration, quality } = settings;
    return `
      أنت خبير في صياغة برومبتات لإنشاء فيديو (مثل Runway/Sora). أنشئ برومبتًا:
      - النمط: "${style || 'واقعي'}"
      - المدة: "${duration || '30 ثانية'}" (بالثواني)
      - الجودة: "${quality || 'متوسطة'}" (1=منخفضة، 3=عالية)
      - الهدف: فيديو متسق، جذاب، ومفصل بصريًا
      بناءً على: "${input}"
      أعد النتيجة في JSON: { prompt, qualityScore (0-100), feedback (بالعربية) }
    `;
  }

  static buildEnhancedDataPrompt(input, settings) {
    const { analysisType, format, depth } = settings;
    return `
      أنت محلل بيانات وخبير في صياغة برومبتات لتحليل البيانات. أنشئ برومبتًا:
      - نوع التحليل: "${analysisType || 'إحصائي'}"
      - التنسيق: "${format || 'جدول'}"
      - العمق: "${depth || 'متوسط'}" (1=سطحي، 3=متوسط، 5=عميق)
      - الهدف: تحليل دقيق، منظم، ومفيد
      بناءً على: "${input}"
      أعد النتيجة في JSON: { prompt, qualityScore (0-100), feedback (بالعربية) }
    `;
  }

  static async savePrompt({ type, input, settings, result, userId }) {
    this.validateInput({ type, input, settings, userId });
    if (!result || !result.prompt || typeof result.qualityScore !== 'number' || !result.feedback) {
      throw new Error('بيانات النتيجة غير صالحة');
    }

    const sql = `
      INSERT INTO prompts (user_id, prompt_type, input_text, settings, generated_prompt, quality_score, feedback, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    const params = [userId, type, input, JSON.stringify(settings), result.prompt, result.qualityScore, result.feedback];
    const { insertId } = await db.query(sql, params);
    return { success: true, promptId: insertId };
  }

  static async getUserPrompts(userId, options = {}) {
    const { limit = 10, offset = 0, type } = options;
    if (!userId || typeof userId !== 'number') throw new Error('معرف المستخدم غير صالح');

    let sql = 'SELECT * FROM prompts WHERE user_id = ?';
    const params = [userId];
    if (type) {
      sql += ' AND prompt_type = ?';
      params.push(type);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = await db.query(sql, params);
    return rows.map(row => ({
      id: row.id,
      type: row.prompt_type,
      input: row.input_text,
      settings: JSON.parse(row.settings),
      prompt: row.generated_prompt,
      qualityScore: row.quality_score,
      feedback: row.feedback,
      createdAt: row.created_at,
    }));
  }

  static async deletePrompt(promptId, userId) {
    if (!promptId || !userId) throw new Error('معرف البرومبت أو المستخدم غير صالح');
    const sql = 'DELETE FROM prompts WHERE id = ? AND user_id = ?';
    const result = await db.query(sql, [promptId, userId]);
    if (result.affectedRows === 0) throw new Error('البرومبت غير موجود أو لا يملكه المستخدم');
  }
}

module.exports = PromptGeneratorModel;