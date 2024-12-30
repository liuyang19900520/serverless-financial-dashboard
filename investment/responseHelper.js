/**
 * 通用返回值方法
 * @param {string} status - 返回状态 (success or error)
 * @param {number} code - HTTP 状态码
 * @param {string} message - 提示信息
 * @param {Object} data - 返回的数据
 * @param {Object} error - 返回的数据
 * @returns {Object} - 统一格式的响应
 */
const createResponse = (status, code, message, data = null, error = null) => {
  return {
    statusCode: code,
    body: JSON.stringify({status: status, message: message, data: data, error: error}),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS,DELETE,PUT,PATCH",
      "Access-Control-Allow-Headers": "Content-Type,X-CSRF-TOKEN",
    }
  };
};

export default {createResponse};
