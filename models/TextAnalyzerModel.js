const db = require('../config/db');
const axios = require('axios');
const pdfParse = require('pdf-parse');

class TextAnalyzerModel {
  static API_KEY = process.env.API_KEY;

  static ANALYSIS_TYPES = {
    DEFAULT: 'default',
    GRAMMAR: 'grammar',
    LANGUAGE: 'language',
    SENTIMENT: 'sentiment',
    SEO: 'seo',
    STYLE: 'style',
    CLASSIFICATION: 'classification',
    PLAGIARISM: 'plagiarism'
  };

  static async getUserApiKey(userId) {
    try {
      const [rows] = await db.query('SELECT api_key FROM api_keys WHERE user_id = ?', [userId]);
      console.log('API key query result:', rows);
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0].api_key;
      }
      console.log('No user-specific API key found, using default:', this.API_KEY?.substring(0, 10) + '...');
      return this.API_KEY;
    } catch (error) {
      console.error('Error in getUserApiKey:', error.message || error);
      console.log('Falling back to default API key:', this.API_KEY?.substring(0, 10) + '...');
      return this.API_KEY;
    }
  }

  static async analyzeText(input, analysisType = null, userId) {
    try {
      let text = input;

      // استخراج النص من PDF إذا كان Buffer
      if (Buffer.isBuffer(input)) {
        const pdfData = await pdfParse(input);
        text = pdfData.text;
      }

      // تحديد نوع التحليل تلقائيًا إذا لم يُحدد
      const detectedAnalysisType = analysisType || await this.detectAnalysisType(text, userId);
      const apiKey = await this.getUserApiKey(userId);

      if (!apiKey) throw new Error('مفتاح API غير صالح');

      console.log('Sending analysis request to API:', { 
        text: text.substring(0, 50) + '...', 
        analysisType: detectedAnalysisType, 
        apiKey: apiKey.substring(0, 10) + '...' 
      });

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        store: true,
        messages: [
          { role: "system", content: this.getSystemPrompt(detectedAnalysisType) },
          { role: "user", content: text }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" } // إضافة تنسيق JSON
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 20000
      }).catch(error => {
        console.error('API request failed:', error.response ? error.response.data : error.message);
        throw error;
      });

      const resultText = response.data.choices[0].message.content;
      console.log('Raw API response:', resultText);

      const result = this.processResponse({ resultText, analysisType: detectedAnalysisType });
      await this.saveAnalysis({ text, analysisType: detectedAnalysisType, result, userId });
      return result;
    } catch (error) {
      console.error('❌ خطأ في analyzeText:', error.message || error);
      throw this.handleError(error);
    }
  }

  static async detectAnalysisType(text, userId) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      if (!apiKey) throw new Error('مفتاح API غير صالح');

      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: "gpt-4o-mini",
        store: true,
        messages: [
          { 
            role: "system", 
            content: `قم بتحليل النص التالي وتحديد نوعه الأنسب من بين: (grammar, language, sentiment, seo, style, classification, plagiarism). 
            أرجع النتيجة بتنسيق JSON كالتالي: 
            {
              "analysisType": "اسم النوع"
            }` 
          },
          { role: "user", content: text }
        ],
        temperature: 0.3,
        max_tokens: 50,
        response_format: { type: "json_object" } // إضافة تنسيق JSON
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 20000
      }).catch(error => {
        console.error('API request failed in detectAnalysisType:', error.response ? error.response.data : error.message);
        throw error;
      });

      const resultText = response.data.choices[0].message.content;
      const parsed = JSON.parse(resultText);
      const detectedType = parsed.analysisType?.trim().toLowerCase();
      return Object.values(this.ANALYSIS_TYPES).includes(detectedType) ? detectedType : this.ANALYSIS_TYPES.DEFAULT;
    } catch (error) {
      console.error('❌ خطأ في detectAnalysisType:', error.message || error);
      return this.ANALYSIS_TYPES.DEFAULT;
    }
  }

  static getSystemPrompt(analysisType) {
    const baseInstruction = "يجب أن تلتزم فقط بتحليل النص بناءً على النوع المطلوب دون إضافة أي معلومات غير مطلوبة. أرجع النتيجة بتنسيق JSON كالتالي: { \"result\": \"النتيجة هنا\" }";
    
    const prompts = {
      [this.ANALYSIS_TYPES.DEFAULT]: `${baseInstruction} قم بتحليل النص بشكل عام وفقًا لمحتواه.`,
      [this.ANALYSIS_TYPES.GRAMMAR]: `${baseInstruction} قم بتحليل الأخطاء النحوية والإملائية وعلامات الترقيم فقط.`,
      [this.ANALYSIS_TYPES.LANGUAGE]: `${baseInstruction} حدد نوع اللغة واللهجة ومستوى التعقيد.`,
      [this.ANALYSIS_TYPES.SENTIMENT]: `${baseInstruction} حدد نبرة المشاعر (إيجابية، سلبية، محايدة) مع درجة القوة.`,
      [this.ANALYSIS_TYPES.SEO]: `${baseInstruction} حدد الكلمات المفتاحية وكثافتها واقتراح تحسينات.`,
      [this.ANALYSIS_TYPES.STYLE]: `${baseInstruction} حدد نقاط القوة والضعف في الأسلوب مع اقتراحات.`,
      [this.ANALYSIS_TYPES.CLASSIFICATION]: `${baseInstruction} صنف النص إلى نوع معين مع نسبة الاحتمالية.`,
      [this.ANALYSIS_TYPES.PLAGIARISM]: `${baseInstruction} قم بتقييم نسبة الانتحال مع تحديد الأجزاء المتطابقة.`
    };

    return prompts[analysisType] || prompts[this.ANALYSIS_TYPES.DEFAULT];
  }

  static processResponse({ resultText, analysisType }) {
    try {
      const parsed = JSON.parse(resultText);
      if (!parsed.result) throw new Error('تنسيق الاستجابة غير صالح');
      return {
        analysisType,
        result: parsed.result
      };
    } catch (e) {
      console.error('Error processing response:', e);
      return {
        analysisType,
        result: resultText || "لم يتم تلقي استجابة صحيحة."
      };
    }
  }

  static async saveAnalysis({ text, analysisType, result, userId }) {
    try {
      const sql = 'INSERT INTO analyses (user_id, text, analysis_type, result, created_at) VALUES (?, ?, ?, ?, NOW())';
      await db.query(sql, [userId, text, analysisType, JSON.stringify(result)]);
      console.log('✅ تم حفظ التحليل بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ التحليل:', error.message || error);
      throw new Error('فشل في حفظ التحليل.');
    }
  }

  static handleError(error) {
    if (error.response?.status === 429) {
      return new Error('لقد تجاوزت الحد المسموح من الطلبات. يرجى الانتظار ثم المحاولة مرة أخرى.');
    }
    if (error.code === 'ECONNABORTED') {
      return new Error('انتهت مهلة الاتصال. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.');
    }
    if (error.response?.data?.error?.code === 'insufficient_quota') {
      return new Error('تم تجاوز حصتك في OpenAI. يرجى التحقق من خطتك وتفاصيل الفوترة في https://platform.openai.com/account.');
    }
    if (error.response?.data?.error?.code === 'model_not_found') {
      return new Error('النموذج غير متاح. يرجى التحقق من إعدادات النموذج أو مفتاح API.');
    }
    if (error.response?.data?.error?.type === 'invalid_request_error') {
      return new Error('خطأ في الطلب: ' + error.response.data.error.message);
    }
    return new Error(error.message || 'حدث خطأ أثناء المعالجة');
  }
}

module.exports = TextAnalyzerModel;
