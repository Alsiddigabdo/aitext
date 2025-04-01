const db = require('../config/db');

class AuthModel {
    static async findUserByEmail(email) {
        try {
            const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
            console.log('Raw query result:', rows);
            // التحقق مما إذا كانت النتيجة مصفوفة أو كائن
            if (Array.isArray(rows)) {
                return rows[0]; // إذا كانت مصفوفة، نرجع أول عنصر
            }
            return rows; // إذا كانت كائنًا مباشرًا، نرجعه كما هو
        } catch (error) {
            console.error('Error in findUserByEmail:', error);
            throw error;
        }
    }

    static async createUser(user) {
        const { name, email, password } = user;
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, password]
        );
        return result.insertId;
    }

    static async saveOTP(email, otp) {
        await db.query('UPDATE users SET otp = ? WHERE email = ?', [otp, email]);
    }

    static async verifyOTP(otp) {
        const [rows] = await db.query('SELECT * FROM users WHERE otp = ?', [otp]);
        if (rows.length > 0) {
            await db.query('UPDATE users SET otp = NULL WHERE otp = ?', [otp]);
            return rows[0];
        }
        return null;
    }

    static async updateOpenAIKey(userId, openaiKey) {
        const [result] = await db.query(
            'UPDATE users SET openai_key = ? WHERE id = ?',
            [openaiKey, userId]
        );
        return result.affectedRows > 0;
    }
}

module.exports = AuthModel;
