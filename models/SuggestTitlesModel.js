const db = require('../config/db');
const axios = require('axios');
const { RateLimiter } = require('limiter');

class SuggestTitlesModel {
    static API_KEY = process.env.OPENAI_API_KEY || 'your-default-api-key';
    static limiter = new RateLimiter({ tokensPerInterval: 3, interval: 'minute' });

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
            const result = await db.query('SELECT openai_key FROM users WHERE id = ?', [userId]);
            console.log('Raw API key query result:', result);
            const row = Array.isArray(result) ? result[0] : result;
            const openaiKey = row?.openai_key || this.API_KEY;
            console.log('Retrieved API Key for user', userId, ':', openaiKey.substring(0, 10) + '...');
            return openaiKey;
        } catch (error) {
            console.error('Error fetching user API key:', error);
            return this.API_KEY;
        }
    }

    static async checkRateLimit(userId) {
        try {
            await this.limiter.removeTokens(1);
        } catch (err) {
            console.error(`Rate limit exceeded for user ${userId}`);
            throw new Error('لقد تجاوزت الحد المسموح من الطلبات. يرجى الانتظار دقيقة ثم المحاولة مرة أخرى.');
        }
    }

    static async generateTitles({ content, tone, types, userId }) {
        try {
            await this.checkRateLimit(userId);

            const apiKey = await this.getUserApiKey(userId);
            console.log('Using API Key:', apiKey.substring(0, 10) + '...');
            if (!apiKey) throw new Error('مفتاح API غير صالح');

            const messages = [
                {
                    role: "system",
                    content: `أنت خبير في إنشاء عناوين تسويقية بالعربية. 
                    النبرة المطلوبة: ${tone || 'احترافية'}.
                    أنواع العناوين: ${types?.join(', ') || 'جميع الأنواع'}.
                    أعد 5 عناوين مبتكرة وجذابة، وأرجع النتيجة بتنسيق JSON كالتالي: 
                    {
                        "titles": ["عنوان 1", "عنوان 2", "عنوان 3", "عنوان 4", "عنوان 5"],
                        "feedback": "تعليق على العناوين"
                    }`
                },
                {
                    role: "user",
                    content: content || "لا يوجد وصف محتوى"
                }
            ];

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4o-mini",
                    messages,
                    temperature: 0.7,
                    max_tokens: 500,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    timeout: 20000
                }
            );

            const result = this.processApiResponse(response);
            await this.saveSuggestion({ content, tone, types, result, userId });
            
            return {
                success: true,
                titles: result.titles,
                feedback: result.feedback
            };
        } catch (error) {
            console.error('Generation error:', error.response?.data || error.message);
            throw this.handleError(error);
        }
    }

    static async improveTitles({ content, currentTitles, tone, types, userId }) {
        try {
            await this.checkRateLimit(userId);

            const apiKey = await this.getUserApiKey(userId);
            console.log('Using API Key:', apiKey.substring(0, 10) + '...');
            if (!apiKey) throw new Error('مفتاح API غير صالح');

            const messages = [
                {
                    role: "system",
                    content: `أنت خبير في تحسين العناوين التسويقية بالعربية.
                    النبرة: ${tone || 'احترافية'}.
                    أنواع العناوين: ${types?.join(', ') || 'جميع الأنواع'}.
                    قم بتحسين العناوين الحالية وإضافة عناوين جديدة، وأرجع النتيجة بتنسيق JSON كالتالي: 
                    {
                        "titles": ["عنوان 1", "عنوان 2", "عنوان 3", "عنوان 4", "عنوان 5"],
                        "feedback": "تعليق على العناوين"
                    }`
                },
                {
                    role: "user",
                    content: `العناوين الحالية: ${JSON.stringify(currentTitles)}\n\nوصف المحتوى: ${content || "لا يوجد وصف"}`
                }
            ];

            const response = await axios.post(
                'https://api.openai.com/v1/chat/completions',
                {
                    model: "gpt-4o-mini",
                    messages,
                    temperature: 0.7,
                    max_tokens: 600,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    timeout: 20000
                }
            );

            const result = this.processApiResponse(response);
            await this.saveSuggestion({ 
                content, 
                tone, 
                types, 
                result, 
                userId, 
                improved: true 
            });

            return {
                success: true,
                titles: result.titles,
                feedback: result.feedback
            };
        } catch (error) {
            console.error('Improvement error:', error.response?.data || error.message);
            throw this.handleError(error);
        }
    }

    static processApiResponse(response) {
        try {
            const content = response.data.choices[0]?.message?.content;
            if (!content) throw new Error('لا توجد استجابة من API');

            const parsed = JSON.parse(content);
            if (!parsed.titles || !Array.isArray(parsed.titles)) {
                throw new Error('تنسيق الاستجابة غير صالح');
            }

            return {
                titles: parsed.titles.slice(0, 5),
                feedback: parsed.feedback || 'تم إنشاء العناوين بنجاح'
            };
        } catch (e) {
            console.error('Response processing error:', e);
            throw new Error('فشل في معالجة استجابة API');
        }
    }

    static async saveSuggestion({ userId, content, tone, types, result, improved = false }) {
        const sql = `
            INSERT INTO title_suggestions 
            (user_id, content, tone, types, titles, feedback, improved, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        await db.query(sql, [
            userId,
            content.substring(0, 1000),
            tone || this.TONES.PROFESSIONAL,
            JSON.stringify(types || []),
            JSON.stringify(result.titles),
            result.feedback?.substring(0, 500) || 'لا توجد ملاحظات',
            improved ? 1 : 0
        ]);
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

module.exports = SuggestTitlesModel;
