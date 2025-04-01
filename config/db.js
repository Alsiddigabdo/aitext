const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: 'sql.freedb.tech',
  user:'freedb_textai',
  password:'j?SB9P9gytSk3*V',
  database:'freedb_textai',
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 8,
  queueLimit: 50,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: false,
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 8,
  queueLimit: 50,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  multipleStatements: false
};


let pool;
let isReconnecting = false;

async function initializePool() {
  try {
    pool = mysql.createPool(dbConfig);
    
    // اختبار الاتصال
    const testConn = await pool.getConnection();
    await testConn.ping();
    testConn.release();
    
    console.log('✅ تم الاتصال بقاعدة البيانات بنجاح');
    return true;
  } catch (err) {
    console.error('❌ فشل في تهيئة مجمع الاتصالات:', err);
    return false;
  }
}

// استراتيجية إعادة الاتصال مع زيادة التأخير تدريجياً
async function reconnectWithBackoff(attempt = 1) {
  const maxAttempts = 5;
  const baseDelay = 2000; // 2 ثانية
  const maxDelay = 30000; // 30 ثانية كحد أقصى
  const jitter = 500; // تغير عشوائي
  
  if (isReconnecting) return;
  isReconnecting = true;
  
  try {
    const delay = Math.min(
      baseDelay * Math.pow(2, attempt - 1) + Math.random() * jitter,
      maxDelay
    );
    
    console.log(`🔄 محاولة إعادة الاتصال (${attempt}/${maxAttempts}) بعد ${Math.round(delay/1000)} ثوانٍ...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    const success = await initializePool();
    if (success) {
      setupPoolListeners();
      return;
    }
    
    if (attempt < maxAttempts) {
      await reconnectWithBackoff(attempt + 1);
    } else {
      throw new Error('❌ فشل في إعادة الاتصال بعد جميع المحاولات');
    }
  } catch (err) {
    console.error('❌ خطأ في عملية إعادة الاتصال:', err);
    throw err;
  } finally {
    isReconnecting = false;
  }
}

// إعداد مستمعي الأحداث لمجمع الاتصالات
function setupPoolListeners() {
  pool.on('acquire', (connection) => {
    console.log('🔹 تم الحصول على اتصال من المجمع');
  });
  
  pool.on('release', (connection) => {
    console.log('🔸 تم إعادة الاتصال إلى المجمع');
  });
  
  pool.on('enqueue', () => {
    console.log('⏳ طلب اتصال في قائمة الانتظار');
  });
  
  pool.on('error', async (err) => {
    console.error('❌ خطأ في مجمع الاتصالات:', err);
    if (shouldReconnect(err)) {
      await reconnectWithBackoff();
    }
  });
}

// تحديد ما إذا كان يجب إعادة الاتصال بناءً على نوع الخطأ
function shouldReconnect(err) {
  const reconnectErrors = [
    'PROTOCOL_CONNECTION_LOST',
    'ECONNRESET',
    'ETIMEDOUT',
    'ER_USER_LIMIT_REACHED',
    'ER_CON_COUNT_ERROR'
  ];
  
  return reconnectErrors.includes(err.code);
}

// تهيئة الاتصال الأولي
async function initializeDatabase() {
  try {
    const initialized = await initializePool();
    if (!initialized) {
      await reconnectWithBackoff();
    } else {
      setupPoolListeners();
    }
  } catch (err) {
    console.error('❌ فشل في تهيئة قاعدة البيانات:', err);
    process.exit(1); // إنهاء العملية إذا فشل الاتصال تماماً
  }
}

// دالة مساعدة لتنفيذ الاستعلامات مع إدارة الاتصال
async function executeQuery(sql, params) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(sql, params);
    return rows;
  } catch (err) {
    console.error('❌ خطأ في تنفيذ الاستعلام:', {
      sql: sql,
      params: params,
      error: err.message
    });
    
    if (shouldReconnect(err)) {
      await reconnectWithBackoff();
      return executeQuery(sql, params); // إعادة المحاولة بعد إعادة الاتصال
    }
    
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

// بدء تهيئة قاعدة البيانات
initializeDatabase();

module.exports = {
  query: executeQuery,
  getConnection: async () => {
    try {
      return await pool.getConnection();
    } catch (err) {
      if (shouldReconnect(err)) {
        await reconnectWithBackoff();
        return pool.getConnection();
      }
      throw err;
    }
  },
  
  // دالة للتحقق من صحة الاتصال
  checkConnection: async () => {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      return true;
    } catch (err) {
      return false;
    }
  },
  
  // إغلاق جميع الاتصالات (للاستخدام عند إيقاف التطبيق)
  close: async () => {
    if (pool) {
      await pool.end();
      console.log('🛑 تم إغلاق جميع اتصالات قاعدة البيانات');
    }
  }
};
