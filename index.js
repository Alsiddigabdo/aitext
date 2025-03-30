const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const createError = require('http-errors');
const session = require('express-session');

const indexRouter = require('./routes/index');
const authRoutes = require('./routes/authRouter');
const textAnalyzerRouter = require('./routes/textAnalyzer');
const textComparisonRouter = require('./routes/textComparison');
const smartTranslationRouter = require('./routes/smartTranslation');
const suggestTitlesRouter = require('./routes/suggestTitles');
const textSummarizationRoutes = require('./routes/textSummarization');
const textConverterRoutes = require('./routes/textConverter');
const feedbackRoutes = require('./routes/feedback');
const analysisHistoryRouter = require('./routes/analysisHistory');
const apiKeyRoutes = require('./routes/apiKeyRoutes');
const promptGeneratorRouter = require('./routes/promptGenerator');
const personalityAnalysisRouter = require('./routes/personalityAnalysis');

const app = express();

// إعداد محرك العرض
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// إعداد الجلسات (مع تعليق للانتقال إلى Redis لاحقًا)
app.use(session({
    secret: 'your-secret-key', // يُفضل استخدام متغير بيئي مثل process.env.SESSION_SECRET
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // آمن في الإنتاج فقط (HTTPS)
        maxAge: 24 * 60 * 60 * 1000 // 24 ساعة
    }
    // للانتقال إلى Redis في المستقبل، أضف:
    // store: new RedisStore({ client: redisClient }),
}));

app.use(morgan('dev')); // تسجيل الطلبات (يمكن تغييره إلى 'combined' في الإنتاج)
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
app.use('/analysis-history', analysisHistoryRouter);
app.use('/api', apiKeyRoutes);
app.use('/prompt-generator', promptGeneratorRouter);
app.use('/personality-analysis', personalityAnalysisRouter);

// معالجة الأخطاء
app.use((req, res, next) => {
    next(createError(404));
});

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.json({ success: false, message: err.message });
});

// بدء الخادم
const PORT = process.env.PORT || 8080; // استخدام PORT من Scalingo أو 8080 محليًا
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
