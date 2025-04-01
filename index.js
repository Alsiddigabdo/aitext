const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const createError = require('http-errors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// استيراد المسارات
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
const promptGeneratorRouter = require('./routes/promptGenerator');
const personalityAnalysisRouter = require('./routes/personalityAnalysis');
const openaiRoutes = require('./routes/openai');

const app = express();

// إعدادات المحرك والعرض
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Middleware لتحميل المستخدم
app.use((req, res, next) => {
    const token = req.cookies.token;
    if (token) {
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (!err) {
                req.user = decoded;
            }
        });
    }
    next();
});

// تعريف المسارات
app.use('/', indexRouter);
app.use('/auth', authRoutes);
app.use('/analyzer', textAnalyzerRouter);
app.use('/compare-texts', textComparisonRouter);
app.use('/smart-translation', smartTranslationRouter);
app.use('/suggest-titles', suggestTitlesRouter);
app.use('/text-summarization', textSummarizationRoutes);
app.use('/text-converter', textConverterRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/analysis-history', analysisHistoryRouter);
app.use('/prompt-generator', promptGeneratorRouter);
app.use('/personality-analysis', personalityAnalysisRouter);
app.use('/api', openaiRoutes); // حذف apiKeyRoutes إذا لم يكن موجودًا أو دمجه

// معالجة الأخطاء
app.use((req, res, next) => {
    next(createError(404, 'الصفحة غير موجودة'));
});

app.use((err, req, res, next) => {
    res.status(err.status || 500);
    if (req.accepts('html')) {
        return res.render('error', {
            status: err.status || 500,
            message: err.message,
            user: req.user || null
        });
    }
    res.json({
        success: false,
        status: err.status || 500,
        message: err.message
    });
});

// التحقق من متغيرات البيئة
if (!process.env.JWT_SECRET) {
    console.error('خطأ: JWT_SECRET غير معرّف في ملف .env');
    process.exit(1);
}

console.log('تم تحميل JWT_SECRET بنجاح');

// بدء الخادم
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`الخادم يعمل على http://localhost:${PORT}`);
    console.log(`بيئة التشغيل: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
