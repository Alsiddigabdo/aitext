var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  const user = req.session.user || null; // تمرير بيانات المستخدم إذا كان مسجل الدخول
  res.render('index', { title: 'الصفحة الرئيسية', user });
});

/* GET About page */
router.get('/about', function(req, res, next) {
  const user = req.session.user || null;
  res.render('About', { title: 'عن التطبيق', user });
});

/* GET Privacy Policy page */
router.get('/privacy-policy', function(req, res, next) {
  const user = req.session.user || null;
  res.render('PrivacyPolicy', { title: 'سياسة الخصوصية', user });
});

module.exports = router;