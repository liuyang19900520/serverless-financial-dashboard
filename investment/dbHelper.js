// dbHelper.js
import pgPromise from 'pg-promise';
import dotenv from 'dotenv';


// 初始化pg-promise
const pgp = pgPromise({
  schema: 'dev',
  connect(client, dc, isFresh) {
    // 设置全局 search_path
    client.query('SET search_path TO dev')
      .then(() => {
        console.log('Schema set to "dev"');
      })
      .catch(err => {
        console.error('Error setting schema:', err);
      });
  },
  disconnect(client, dc) {
    const dbName = dc?.database || client.connectionParameters?.database || 'toolkit';
    console.log('Disconnected from the database:', dbName);
  },
  query(e) {
    console.log('QUERY:', e.query); // 打印查询语句（调试用）
  },
  error(err, e) {
    console.error('Database Error:', err);
    if (e.query) {
      console.error('Query That Caused Error:', e.query); // 打印导致错误的查询
    }
    if (e.ctx) {
      console.error('Error Context:', e.ctx); // 打印上下文信息
    }
  },
});

dotenv.config({path: '.env.development'});

const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10), // 将字符串转换为整数
  ssl: {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true', // 转换为布尔值
  },
};

// 创建数据库实例
const db = pgp(dbConfig);

export default {
  /**
   * 通用查询方法
   * @param {string} sql - SQL 查询语句
   * @param {Array} params - 查询参数
   * @returns {Promise<Array>} 查询结果
   */
  async query(sql, params) {
    console.error('Database Query beginning:');

    try {
      return await db.any(sql, params); // 使用 any() 方法查询多行结果
    } catch (error) {
      console.error('Database Query Error:', error);
      throw error;
    }
  },

  /**
   * 查询单行结果
   * @param {string} sql - SQL 查询语句
   * @param {Array} params - 查询参数
   * @returns {Promise<Object>} 查询结果
   */
  async queryOne(sql, params) {
    try {
      return await db.oneOrNone(sql, params); // 使用 oneOrNone() 返回一行，如果没有数据返回 null
    } catch (error) {
      console.error('Database Query Error:', error);
      throw error;
    }
  },

  /**
   * 插入操作
   * @param {string} sql - SQL 插入语句
   * @param {Array} params - 插入参数
   * @returns {Promise<*>} 插入结果
   */
  async insert(sql, params) {
    try {
      return await db.one(sql, params); // 如果 INSERT RETURNING 用于返回插入信息，使用 one()
    } catch (error) {
      console.error('Database Insert Error:', error);
      throw error;
    }
  },

  /**
   * 更新或删除操作
   * @param {string} sql - SQL 更新或删除语句
   * @param {Array} params - 查询参数
   * @returns {Promise<number>} 受影响的行数
   */
  async updateOrDelete(sql, params) {
    try {
      return await db.result(sql, params, (r) => r.rowCount); // 返回受影响的行数
    } catch (error) {
      console.error('Database Update/Delete Error:', error);
      throw error;
    }
  },

  /**
   * 关闭数据库连接
   */
  async close() {
    try {
      console.log('Closing Database Connection');
      await pgp.end(); // 关闭 pg-promise
    } catch (error) {
      console.error('Error Closing Database:', error);
      throw error;
    }
  },
};
