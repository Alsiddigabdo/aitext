const db = require('../config/db');
const axios = require('axios');

class PersonalityAnalysisModel {
  static API_KEY = process.env.API_KEY;

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

  static async analyzePersonality({ type, responses, userId }) {
    try {
      const apiKey = await this.getUserApiKey(userId);
      let prompt = `
        أنت محلل شخصية ذكي محترف. قم بتحليل الإجابات التالية لاختبار ${type === 'personality' ? 'الشخصية' : type === 'decision' ? 'اتخاذ القرار' : 'أنماط التفكير'} 
        بناءً على نموذج علمي مناسب (مثل Big Five للشخصية أو نماذج اتخاذ القرار أو أنماط التفكير). الإجابات تتكون من 20 سؤالًا، كل إجابة هي رقم من 0 إلى 3 يمثل الخيار المختار.
        أعد النتيجة في صيغة JSON تحتوي على:
        - traits: كائن يحتوي على السمات (مثل extroversion, speed, analytical) كنسب مئوية (0-100)
        - summary: ملخص بالعربية عن النتائج
        لا تضف أي معلومات إضافية خارج هذا الهيكل.
      `;

      // تحديد الأسئلة بناءً على نوع الاختبار
      const questions = type === 'personality' ? personalityQuestions : type === 'decision' ? decisionQuestions : thinkingQuestions;

      // إضافة الأسئلة والإجابات إلى المطالبة
      prompt += '\nالأسئلة والإجابات:\n';
      responses.forEach((response, i) => {
        prompt += `${i + 1}. ${questions[i].question}\n   الخيارات: ${questions[i].options.join(', ')}\n   الإجابة: ${response}\n`;
      });

      console.log('Sending analysis request to API:', { type, responses, apiKey: apiKey.substring(0, 5) + '...' });
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: 'قم بتحليل الإجابات وأعد النتائج' }
        ],
        temperature: 0.5,
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

      if (!result.traits || !result.summary) {
        throw new Error('استجابة API غير كاملة');
      }

      await this.saveAnalysis({ type, responses, result, userId });
      return result;
    } catch (error) {
      console.error('❌ خطأ في analyzePersonality:', error.message || error);
      throw new Error('فشل في تحليل الشخصية: ' + (error.message || 'خطأ غير معروف'));
    }
  }

  static async saveAnalysis({ type, responses, result, userId }) {
    try {
      const sql = 'INSERT INTO personality_analysis (user_id, type, responses, traits, summary, created_at) VALUES (?, ?, ?, ?, ?, NOW())';
      await db.query(sql, [
        userId,
        type,
        JSON.stringify(responses),
        JSON.stringify(result.traits),
        result.summary
      ]);
      console.log('✅ تم حفظ تحليل الشخصية بنجاح');
    } catch (error) {
      console.error('❌ خطأ في حفظ التحليل:', error.message || error);
      throw new Error('فشل في حفظ التحليل.');
    }
  }
}

// الأسئلة مع الخيارات (للاستخدام في المطالبة)
const personalityQuestions = [
  { question: "كيف تصف نفسك في ثلاث كلمات؟", options: ["واثق، اجتماعي، طموح", "هادئ، متأمل، دقيق", "مبدع، متفائل، عاطفي", "منظم، منطقي، حذر"] },
  { question: "ما هي القيم الأساسية التي تؤمن بها؟", options: ["الحرية", "العدالة", "الأمان", "الإبداع"] },
  { question: "كيف تتعامل مع النقد؟", options: ["محفز", "محبط", "حسب الموقف", "أتجاهله"] },
  { question: "ما الذي يجعلك تشعر بالسعادة؟", options: ["النجاح", "العلاقات", "الهدوء", "الإبداع"] },
  { question: "كيف تتعامل مع التحديات؟", options: ["أواجهها", "أتجنبها", "أحللها", "أطلب المساعدة"] },
  { question: "هل تعتبر نفسك اجتماعيًا؟", options: ["نعم دائمًا", "أحيانًا", "لا أحب الاختلاط", "حسب المزاج"] },
  { question: "ما الصفات التي تبحث عنها في الأصدقاء؟", options: ["الصدق", "المرح", "الذكاء", "الدعم"] },
  { question: "كيف تتعامل مع الفشل؟", options: ["فرصة للتعلم", "مصدر إحباط", "أتجاهله", "أحلله"] },
  { question: "هل تجد صعوبة في التعبير عن مشاعرك؟", options: ["لا", "أحيانًا", "نعم", "حسب الموقف"] },
  { question: "كيف تؤثر تجاربك السابقة على سلوكك؟", options: ["بشكل كبير", "قليلاً", "لا تؤثر", "حسب"] },
  { question: "هل تميل إلى التخطيط أم العفوية؟", options: ["تخطيط", "عفوية", "مزيج", "حسب"] },
  { question: "ما أكبر إنجاز تفخر به؟", options: ["عملي", "شخصي", "تعليمي", "عاطفي"] },
  { question: "كيف تتعامل مع التغيير؟", options: ["أرحب به", "أتأقلم", "أقاومه", "حسب"] },
  { question: "هل تفضل العمل ضمن فريق أم بمفردك؟", options: ["فريق", "بمفردي", "مزيج", "حسب"] },
  { question: "كيف تعبر عن محبتك؟", options: ["كلمات", "أفعال", "هدايا", "وقت"] },
  { question: "ما نقاط قوتك؟", options: ["التنظيم", "الإبداع", "التحليل", "التواصل"] },
  { question: "ما أكبر خوف لديك؟", options: ["الفشل", "الوحدة", "المجهول", "النقد"] },
  { question: "هل أنت متفائل أم متشائم؟", options: ["متفائل", "متشائم", "واقعي", "حسب"] },
  { question: "ما أكبر تحدٍ واجهته؟", options: ["عملي", "شخصي", "عاطفي", "مالي"] },
  { question: "كيف تحفز نفسك؟", options: ["أهداف", "مكافآت", "دعم الآخرين", "التحدي"] }
];

const decisionQuestions = [
  { question: "كيف تتعامل مع القرارات تحت الضغط؟", options: ["أتصرف بسرعة", "أحلل بسرعة", "أطلب المساعدة", "أتردد"] },
  { question: "هل تعتمد على الحدس أم التحليل؟", options: ["الحدس", "التحليل", "مزيج", "حسب الموقف"] },
  { question: "كيف تؤثر مشاعرك على قراراتك؟", options: ["بشكل كبير", "قليلاً", "لا تؤثر", "حسب الحالة"] },
  { question: "هل تفضل القرارات السريعة أم التأني؟", options: ["سريعة", "تأني", "مزيج", "حسب"] },
  { question: "كيف تتعامل مع المخاطرة؟", options: ["أجازف", "أتجنبها", "أحللها", "أستشير"] },
  { question: "ما استراتيجيتك لجمع المعلومات؟", options: ["بحث سريع", "تحليل عميق", "آراء الآخرين", "حدسي"] },
  { question: "كيف تتعامل مع خيارات صعبة؟", options: ["أختار بسرعة", "أحللها", "أستشير", "أؤجل"] },
  { question: "هل ندمت على قرار بناءً على رأي الآخرين؟", options: ["نعم", "لا", "أحيانًا", "لم يحدث"] },
  { question: "كيف تؤثر خبراتك على قراراتك؟", options: ["كثيرًا", "قليلاً", "لا تؤثر", "حسب"] },
  { question: "هل تفضل القرارات المستقلة؟", options: ["نعم", "لا", "مزيج", "حسب"] },
  { question: "كيف تتعامل مع قرار خاطئ؟", options: ["أعترف وأصلح", "أتجاهل", "أحلل السبب", "ألوم الظروف"] },
  { question: "هل تجد صعوبة في الاعتراف بالخطأ؟", options: ["لا", "نعم", "أحيانًا", "حسب"] },
  { question: "ما أكبر قرار اتخذته؟", options: ["عملي", "شخصي", "مالي", "عاطفي"] },
  { question: "كيف تقيم نجاح قراراتك؟", options: ["نتائج", "شعوري", "آراء الآخرين", "تحليل"] },
  { question: "هل تعتقد العاطفة ضرورية؟", options: ["لا", "نعم", "أحيانًا", "حسب"] },
  { question: "كيف تفرق بين القرارات القصيرة والطويلة؟", options: ["مدة التأثير", "الأهمية", "التحليل", "حدسي"] },
  { question: "كيف تتعامل مع التوقعات الاجتماعية؟", options: ["أتأثر", "أتجاهل", "أوازن", "حسب"] },
  { question: "هل تفضل الالتزام أم المرونة؟", options: ["التزام", "مرونة", "مزيج", "حسب"] },
  { question: "كيف تؤثر الضغوط على قراراتك؟", options: ["كثيرًا", "قليلاً", "لا تؤثر", "حسب"] },
  { question: "هل لديك آلية للقرارات؟", options: ["نعم", "لا", "أحيانًا", "حسب"] }
];

const thinkingQuestions = [
  { question: "هل تميل إلى التفكير التحليلي أم الإبداعي؟", options: ["تحليلي", "إبداعي", "مزيج", "حسب"] },
  { question: "كيف تتعامل مع المعلومات المتناقضة؟", options: ["أحللها", "أتجاهلها", "حل وسط", "حدس"] },
  { question: "هل تفضل الصورة الكبيرة أم التفاصيل؟", options: ["الكبيرة", "التفاصيل", "مزيج", "حسب"] },
  { question: "كيف تؤثر مشاعرك على تفكيرك؟", options: ["كثيرًا", "قليلاً", "لا تؤثر", "حسب"] },
  { question: "هل تركز على الأسباب أم الحلول؟", options: ["الأسباب", "الحلول", "مزيج", "حسب"] },
  { question: "هل تفكر في الماضي أم المستقبل؟", options: ["الماضي", "المستقبل", "مزيج", "حسب"] },
  { question: "هل تتبع المنطق أم الحدس؟", options: ["منطق", "حدس", "مزيج", "حسب"] },
  { question: "كيف تتعامل مع التفكير خارج الصندوق؟", options: ["أحبه", "أجده صعبًا", "أحيانًا", "حسب"] },
  { question: "هل لكل مشكلة حل واحد؟", options: ["نعم", "لا", "أحيانًا", "حسب"] },
  { question: "كيف تتفاعل مع أفكار جديدة؟", options: ["أرحب", "أرفض", "أحللها", "حسب"] },
  { question: "هل تجد صعوبة في تغيير رأيك؟", options: ["لا", "نعم", "أحيانًا", "حسب"] },
  { question: "هل تستشير الآخرين في القرارات؟", options: ["نعم", "لا", "أحيانًا", "حسب"] },
  { question: "كيف تتعامل مع الأفكار السلبية؟", options: ["أحللها", "أتجاهلها", "أحولها", "أتأثر"] },
  { question: "هل أنت سريع الاستجابة أم بطيء؟", options: ["سريع", "بطيء", "مزيج", "حسب"] },
  { question: "كيف توازن بين العقل والعاطفة؟", options: ["عقل", "عاطفة", "مزيج", "حسب"] },
  { question: "هل تفرط في التفكير؟", options: ["نعم", "لا", "أحيانًا", "حسب"] },
  { question: "هل تفكيرك خطي أم عشوائي؟", options: ["خطي", "عشوائي", "مزيج", "حسب"] },
  { question: "كيف تتعامل مع مشكلات غامضة؟", options: ["أحللها", "أتجاهلها", "أبدع حلًا", "أستشير"] },
  { question: "هل التفكير عملية ثابتة أم متطورة؟", options: ["ثابتة", "متطورة", "مزيج", "حسب"] },
  { question: "كيف تقيم قدرتك على التفكير؟", options: ["نقدي", "إبداعي", "مزيج", "حسب"] }
];

module.exports = PersonalityAnalysisModel;