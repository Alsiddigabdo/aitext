const mysql = require('mysql2/promise');
require('dotenv').config();

// إعدادات الاتصال بقاعدة البيانات
const dbConfig = {
  host: 'sql.freedb.tech',
  user: 'freedb_textai',
  password: 'j?SB9P9gytSk3*V',
  database: 'freedb_textai',
  port: process.env.DB_PORT || 3306,
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 20, 
  enableKeepAlive: true,
  keepAliveInitialDelay: 15000, 
  multipleStatements: false,
};

let pool;
let isReconnecting = false;

async function initializePool() {
  try {
    pool = mysql.createPool(dbConfig);
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

// إعادة الاتصال مع تأخير متزايد
async function reconnectWithBackoff(attempt = 1) {
  const maxAttempts = 5;
  const baseDelay = 3000; // 3 ثواني
  const maxDelay = 60000; // دقيقة كحد أقصى
  
  if (isReconnecting) return;
  isReconnecting = true;
  
  try {
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    console.log(`🔄 إعادة الاتصال بعد ${Math.round(delay / 1000)} ثانية...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    if (await initializePool()) {
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
  } finally {
    isReconnecting = false;
  }
}

function setupPoolListeners() {
  pool.on('error', async (err) => {
    console.error('❌ خطأ في مجمع الاتصالات:', err);
    if (shouldReconnect(err)) {
      await reconnectWithBackoff();
    }
  });
}

function shouldReconnect(err) {
  return ['PROTOCOL_CONNECTION_LOST', 'ECONNRESET', 'ETIMEDOUT', 'ER_USER_LIMIT_REACHED', 'ER_CON_COUNT_ERROR'].includes(err.code);
}

async function executeQuery(sql, params) {
  let connection;
  try {
    connection = await pool.getConnection();
    const [rows] = await connection.query(sql, params);
    return rows;
  } catch (err) {
    console.error('❌ خطأ في تنفيذ الاستعلام:', err.message);
    if (shouldReconnect(err)) {
      await reconnectWithBackoff();
      return executeQuery(sql, params);
    }
    throw err;
  } finally {
    if (connection) connection.release();
  }
}

async function initializeDatabase() {
  try {
    if (!(await initializePool())) {
      await reconnectWithBackoff();
    } else {
      setupPoolListeners();
    }
  } catch (err) {
    console.error('❌ فشل في تهيئة قاعدة البيانات:', err);
    process.exit(1);
  }
}

initializeDatabase();

module.exports = {
  query: executeQuery,
  close: async () => {
    if (pool) {
      await pool.end();
      console.log('🛑 تم إغلاق جميع الاتصالات');
    }
  }
};
