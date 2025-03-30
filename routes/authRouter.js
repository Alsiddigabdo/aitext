const express = require('express');
const router = express.Router();
const { AuthController, authenticateToken } = require('../controllers/AuthController');

router.get('/register', AuthController.renderRegister);
router.post('/register', AuthController.register);
router.get('/login', AuthController.renderLogin);
router.post('/login', AuthController.login);
router.get('/forgot-password', AuthController.renderForgotPassword);
router.post('/forgot-password', AuthController.forgotPassword);
router.get('/otp', AuthController.renderOTP);
router.post('/verify-otp', AuthController.verifyOTP);
router.post('/resend-otp', AuthController.resendOTP);

module.exports = router;
