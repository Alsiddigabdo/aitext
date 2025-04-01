const AuthModel = require('../models/AuthModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

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
        res.render('Register');
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
        res.render('Login');
    }

    // ... الكود السابق ...

static async login(req, res) {
  const { email, password } = req.body;
  console.log('Login attempt:', { email });

  if (!email || !password) {
      return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبان' });
  }

  try {
      const user = await AuthModel.findUserByEmail(email);
      console.log('User retrieved:', user);

      if (!user) {
          return res.status(401).json({ success: false, message: 'البريد الإلكتروني غير مسجل' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      console.log('Password match:', isMatch);

      if (!isMatch) {
          return res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
      }

      const token = jwt.sign(
          { id: user.id, email: user.email, name: user.name },
          process.env.JWT_SECRET,
          { expiresIn: '1h' }
      );
      console.log('Generated token:', token);
      res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
      res.json({ success: true, token, message: 'تم تسجيل الدخول بنجاح' });
  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'حدث خطأ أثناء تسجيل الدخول: ' + error.message });
  }
}

// ... باقي الكود ...
    static async renderForgotPassword(req, res) {
        res.render('ForgotPassword');
    }

    static async forgotPassword(req, res) {
        const { email } = req.body;
        console.log('Forgot password attempt:', { email });

        if (!email) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني مطلوب' });
        }

        try {
            const user = await AuthModel.findUserByEmail(email);
            if (!user) {
                return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
            }

            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await AuthModel.saveOTP(email, otp);
            console.log(`OTP generated for ${email}: ${otp}`);
            res.json({ success: true, email, message: 'تم إرسال رمز OTP إلى بريدك الإلكتروني' });
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async renderOTP(req, res) {
        res.render('OTP');
    }

    static async verifyOTP(req, res) {
        const { otp } = req.body;
        console.log('OTP verification attempt:', { otp });

        if (!otp || otp.length !== 6) {
            return res.status(400).json({ success: false, message: 'رمز OTP غير صالح' });
        }

        try {
            const user = await AuthModel.verifyOTP(otp);
            console.log('OTP verification result:', user);
            if (!user) {
                return res.status(400).json({ success: false, message: 'رمز OTP غير صحيح' });
            }
            res.json({ success: true, message: 'تم التحقق بنجاح' });
        } catch (error) {
            console.error('OTP verification error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    static async resendOTP(req, res) {
        const { email } = req.body;
        console.log('Resend OTP attempt for:', email);

        if (!email) {
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني غير متوفر' });
        }

        try {
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            await AuthModel.saveOTP(email, otp);
            console.log(`New OTP for ${email}: ${otp}`);
            res.json({ success: true, message: 'تم إعادة إرسال رمز OTP' });
        } catch (error) {
            console.error('Resend OTP error:', error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // دالة جديدة لتحديث openai_key
    static async updateOpenAIKey(req, res) {
        const { openaiKey } = req.query; // الحصول على openaiKey من معلمات URL
        console.log('Received openaiKey:', openaiKey);

        if (!openaiKey) {
            return res.status(400).json({ success: false, message: 'مفتاح OpenAI مطلوب' });
        }

        try {
            const user = req.user; // المستخدم الحالي من التوكن
            if (!user) {
                return res.status(401).json({ success: false, message: 'المستخدم غير مصدق عليه' });
            }

            await AuthModel.updateOpenAIKey(user.id, openaiKey);
            console.log(`OpenAI Key updated for user ${user.id}: ${openaiKey}`);
            res.redirect('/'); // إعادة توجيه إلى الصفحة الرئيسية بعد التحديث
        } catch (error) {
            console.error('Error updating OpenAI Key:', error);
            res.status(500).json({ success: false, message: 'حدث خطأ أثناء تحديث مفتاح OpenAI: ' + error.message });
        }
    }
}

module.exports = { AuthController, authenticateToken };

