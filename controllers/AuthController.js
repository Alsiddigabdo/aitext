const AuthModel = require('../models/AuthModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Middleware للتحقق من التوكن
function authenticateToken(req, res, next) {
    const token = req.cookies.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
    console.log('Received token:', token);

    if (!token) {
        return res.status(401).json({ success: false, message: 'التوكن غير متوفر، يرجى تسجيل الدخول' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('Token verification error:', err);
            return res.status(403).json({ success: false, message: 'التوكن غير صالح أو منتهي الصلاحية' });
        }
        console.log('Verified user:', user);
        req.user = user;
        next();
    });
}

class AuthController {
    static async renderRegister(req, res) {
        res.render('Register', { user: req.user });
    }

    static async register(req, res) {
        const { name, email, password } = req.body;
        console.log('Register attempt:', { name, email });

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'جميع الحقول مطلوبة' });
        }

        try {
            const existingUser = await AuthModel.findUserByEmail(email);
            console.log('Existing user check:', existingUser);
            if (existingUser) {
                return res.status(409).json({ success: false, message: 'البريد الإلكتروني مسجل مسبقًا' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            console.log('Hashed password:', hashedPassword);
            const userId = await AuthModel.createUser({ name, email, password: hashedPassword });
            console.log('User created with ID:', userId);
            res.json({ success: true, message: 'تم إنشاء الحساب بنجاح' });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ success: false, message: 'حدث خطأ أثناء التسجيل: ' + error.message });
        }
    }

    static async renderLogin(req, res) {
        res.render('Login', { user: req.user });
    }

    static async renderForgotPassword(req, res) {
        res.render('ForgotPassword', { user: req.user });
    }

    static async renderOTP(req, res) {
        res.render('OTP', { user: req.user });
    }

    static async updateOpenAIKey(req, res) {
        const { openaiKey } = req.query;
        console.log('Received openaiKey:', openaiKey);

        if (!openaiKey) {
            return res.status(400).json({ success: false, message: 'مفتاح OpenAI مطلوب' });
        }

        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ success: false, message: 'المستخدم غير مصدق عليه' });
            }

            await AuthModel.updateOpenAIKey(user.id, openaiKey);
            console.log(`OpenAI Key updated for user ${user.id}: ${openaiKey}`);
            res.redirect('/');
        } catch (error) {
            console.error('Error updating OpenAI Key:', error);
            res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث مفتاح OpenAI: ' + error.message });
        }
    }
}

module.exports = { AuthController, authenticateToken };
