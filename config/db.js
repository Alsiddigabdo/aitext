const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: 'sql.freedb.tech',
  user: 'freedb_textt',
  password: 'vuF73aX8nKw5Q!&',
  database: 'freedb_text1234',
  port: 3306,
  connectTimeout: 10000,
  multipleStatements: true,
  waitForConnections: true, // الانتظار إذا لم تكن هناك اتصالات متاحة
  connectionLimit: 10, // حد أقصى لعدد الاتصالات
  queueLimit: 0 // لا حد للطابور
};

let pool;

async function connectDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    connection.release(); // إعادة الاتصال إلى المجمع
  } catch (err) {
    console.error('❌ لم يتم الاتصال بقاعدة البيانات:', err);
    await reconnectWithBackoff();
  }
}

async function reconnectWithBackoff(attempt = 1) {
  const maxAttempts = 5;
  const delay = Math.min(1000 * 2 ** attempt, 30000); // تأخير تصاعدي بحد أقصى 30 ثانية

  console.log(`🔄 محاولة إعادة الاتصال (${attempt}/${maxAttempts}) بعد ${delay / 1000} ثوانٍ...`);
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    await connectDatabase();
  } catch (err) {
    if (attempt < maxAttempts) {
      await reconnectWithBackoff(attempt + 1);
    } else {
      console.error('❌ فشل في إعادة الاتصال بعد جميع المحاولات:', err);
      throw err;
    }
  }
}

// معالجة الأخطاء العامة للمجمع
function setupPoolListeners() {
  pool.on('error', async (err) => {
    console.error('❌ خطأ في مجمع الاتصالات:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      console.log('🔄 إعادة الاتصال بقاعدة البيانات...');
      await reconnectWithBackoff();
    } else {
      throw err;
    }
  });

  pool.on('connection', (connection) => {
    console.log('🔗 اتصال جديد بقاعدة البيانات');
  });
}

connectDatabase().then(setupPoolListeners);

module.exports = {
  query: async (sql, params) => {
    try {
      const [rows] = await pool.query(sql, params);
      return rows;
    } catch (err) {
      console.error('❌ خطأ في تنفيذ الاستعلام:', err);
      throw err;
    }
  },
  getConnection: () => pool.getConnection()
};