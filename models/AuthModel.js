const db = require('../config/db');

class AuthModel {
  static async createUser({ name, email, password }) {
    try {
      const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
      const [result] = await db.query(sql, [name, email, password]);
      console.log('Insert result:', result);
      return result.insertId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async findUserByEmail(email) {
    try {
      const sql = 'SELECT * FROM users WHERE email = ?';
      const result = await db.query(sql, [email]);
      console.log('Raw query result:', result); // تسجيل النتيجة الخام
      const rows = Array.isArray(result[0]) ? result[0] : result; // التعامل مع تنسيق النتيجة
      console.log('Processed rows:', rows);
      
      if (!rows) return null;
      return Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  static async saveOTP(email, otp) {
    try {
      const sql = 'UPDATE users SET otp = ? WHERE email = ?';
      const [result] = await db.query(sql, [otp, email]);
      console.log('Save OTP result:', result);
      if (result.affectedRows === 0) {
        throw new Error('لم يتم العثور على المستخدم لتحديث OTP');
      }
    } catch (error) {
      console.error('Error saving OTP:', error);
      throw error;
    }
  }

  static async verifyOTP(otp) {
    try {
      const sql = 'SELECT * FROM users WHERE otp = ?';
      const result = await db.query(sql, [otp]);
      console.log('Raw OTP query result:', result);
      const rows = Array.isArray(result[0]) ? result[0] : result;
      console.log('Processed OTP rows:', rows);

      if (!rows || (Array.isArray(rows) && rows.length === 0)) return null;
      const user = Array.isArray(rows) ? rows[0] : rows;
      await db.query('UPDATE users SET otp = NULL WHERE email = ?', [user.email]);
      return user;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }
}

module.exports = AuthModel;