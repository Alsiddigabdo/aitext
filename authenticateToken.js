const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
    const token = req.cookies.token || req.headers['authorization']?.split(' ')[1];
    
    if (!token) {
        if (req.accepts('html')) {
            return res.redirect('/auth/login');
        }
        return res.status(401).json({ success: false, message: 'التوكن غير متوفر' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            if (req.accepts('html')) {
                res.clearCookie('token');
                return res.redirect('/auth/login');
            }
            return res.status(403).json({ success: false, message: 'توكن غير صالح' });
        }
        
        req.user = user;
        next();
    });
};
