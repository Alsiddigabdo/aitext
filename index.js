require('dotenv').config(); // تحميل متغيرات البيئة من ملف .env

const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const createError = require('http-errors');
const session = require('express-session'); // إضافة مكتبة الجلسات

const indexRouter = require('./routes/index');
const authRoutes = require('./routes/authRouter');
const textAnalyzerRouter = require('./routes/textAnalyzer');
const textComparisonRouter = require('./routes/textComparison');
const smartTranslationRouter = require('./routes/smartTranslation');
const suggestTitlesRouter = require('./routes/suggestTitles');
const textSummarizationRoutes = require('./routes/textSummarization');
const textConverterRoutes = require('./routes/textConverter');
const feedbackRoutes = require('./routes/feedback');

const app = express();

// إعداد محرك العرض
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// إعداد الجلسات
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key', // استخدام متغير بيئي للسر
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // آمن في الإنتاج فقط
    maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
  }
}));

// استخدام morgan لتسجيل الطلبات
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// التوجيهات
app.use('/', indexRouter);
app.use('/analyzer', textAnalyzerRouter);
app.use('/compare-texts', textComparisonRouter);
app.use('/smart-translation', smartTranslationRouter);
app.use('/suggest-titles', suggestTitlesRouter);
app.use('/text-summarization', textSummarizationRoutes);
app.use('/text-converter', textConverterRoutes);
app.use('/auth', authRoutes);
app.use('/feedback', feedbackRoutes);

// اختبار fetch المدمج
console.log('Testing fetch...');
fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.API_KEY}`
  },
  body: JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Test fetch functionality" }]
  })
})
  .then(res => res.json())
  .then(data => console.log('Fetch test successful:', data.choices[0].message.content))
  .catch(err => console.error('Fetch test failed:', err));

// معالجة الأخطاء (اختياري)
app.use((req, res, next) => {
  next(createError(404));
});

app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({ success: false, message: err.message });
});

// بدء الخادم باستخدام المتغير البيئي PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;