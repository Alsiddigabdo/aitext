const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const createError = require('http-errors');

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

// الوسيطات (Middleware)
app.use(morgan('dev')); // يمكنك تغييره إلى 'combined' للإنتاج
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

// معالجة الخطأ 404 مع تقديم صفحة EJS
app.use((req, res, next) => {
    res.status(404).render('error', { 
        message: 'الصفحة غير موجودة', 
        status: 404 
    });
});

// معالجة الأخطاء العامة مع تقديم صفحة EJS
app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || 'حدث خطأ في الخادم';
    console.error(`Error ${status}: ${message}`, err.stack); // تسجيل الخطأ للتصحيح
    res.status(status).render('error', { 
        message: message, 
        status: status 
    });
});

// بدء الخادم
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
