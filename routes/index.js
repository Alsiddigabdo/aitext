const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../controllers/AuthController');

/* GET home page */
router.get('/', (req, res, next) => {
  const user = req.user || null; // استخدام req.user من JWT بدلاً من req.session.user
  res.render('index', { title: 'الصفحة الرئيسية', user });
});

/* GET About page */
router.get('/about', (req, res, next) => {
  const user = req.user || null;
  res.render('About', { title: 'عن التطبيق', user });
});

/* GET Privacy Policy page */
router.get('/privacy-policy', (req, res, next) => {
  const user = req.user || null;
  res.render('PrivacyPolicy', { title: 'سياسة الخصوصية', user });
});

module.exports = router;
