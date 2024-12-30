/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
/**
 * RESTful API 实现 investment 的增删改查功能
 *
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 * @param {Object} context - Lambda Context
 *
 * @returns {Object} response - API Gateway Lambda Proxy Output Format
 */

import dbHelper from "./dbHelper.js";
import responseHelper from "./responseHelper.js";


export const lambdaHandler = async (event, context) => {
  const {httpMethod, path, body} = event;
  let response;

  try {
    switch (httpMethod) {
      case "GET":
        response = handleGetRequest(event);
        break;
      case "POST":
        response = handlePostRequest(body);
        break;
      case "PUT":
        response = handlePutRequest(path, body);
        break;
      case "DELETE":
        response = handleDeleteRequest(path);
        break;
      default:
        response = responseHelper.createResponse('0', 405, "Method Not Allowed", null, null);
    }
  } catch (error) {
    // 错误捕获
    console.error("Error: ", error);
    response = responseHelper.createResponse('1', 500, "Internal Server Error", null, error);
  }

  return response;
};

// GET 请求处理
const handleGetRequest = async (event) => {
  const path = event.path || ""; // 当前请求路径

  // 如果路径是 "/investment/{id}"，返回特定投资数据
  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (idMatch) {
    const investmentId = parseInt(idMatch[1]);
    const investment = await dbHelper.queryOne("SELECT * FROM investment WHERE id = $1", [investmentId]);
    return responseHelper.createResponse('0', 200, "OK", investment, null);
  } else {
    const queryParams = event.queryStringParameters || {};
    console.log("GET Request Query Parameters: ", queryParams);

    let sortBy = queryParams.sort_by || ""; // 获取 sort_by 参数
    let orderBy = [];

// 如果 sort_by 参数不为空
    if (sortBy) {
      const sortFields = sortBy.split(","); // 按逗号分割多个排序字段

      for (const field of sortFields) {
        if (field.startsWith("-")) {
          // 如果字段以 '-' 开头，降序
          orderBy.push(`${field.substring(1)} DESC`);
        } else if (field.startsWith("+")) {
          // 如果字段以 '+' 开头，升序
          orderBy.push(`${field.substring(1)} ASC`);
        } else {
          // 默认没有符号，也作为升序处理
          orderBy.push(`${field} ASC`);
        }
      }
    }

    let query = "SELECT * FROM investment";
    let conditions = [];
    let parameters = [];
    let index = 1;
    for (const [key, value] of Object.entries(queryParams)) {
      if (value && key !== 'sort_by') { // 检查参数是否有值
        conditions.push(`${key} = $${index}`); // 添加条件
        parameters.push(value); // 添加参数值
        index++; // 增加占位符索引
      }
    }

    // 如果有条件，添加 WHERE 子句
    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    // 构建 ORDER BY 子句
    let orderByClause = "";
    if (orderBy.length > 0) {
      query += " ORDER BY " + orderBy.join(", ");
    }

    const investments = await dbHelper.query(query, parameters);
    return responseHelper.createResponse('0', 200, "OK", investments, null);
  }
  return responseHelper.createResponse('1', 400, "Invalid request path", null, null);
}

// POST 请求处理（新增投资数据）
const handlePostRequest = async (body) => {
  console.log("POST Request with Body: ", body);

  const newInvestment = JSON.parse(body); // 将 JSON 反序列化为对象
  console.log("New Investment Added: ", newInvestment);

  const sql = `
    INSERT INTO investment (year, type1, type2, target, price, currency, owner, account)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;`;

  const {year, type1, type2, target, price, currency, account, owner} = newInvestment;
  const params = [year, type1, type2, target, price, currency, owner, account];
  const result = await dbHelper.insert(sql, params);

  console.log("New Investment Inserted: ", result);
  return responseHelper.createResponse('0', 201, "OK", result, null);

};

// PUT 请求处理（更新投资数据）
const handlePutRequest = async (path, body) => {
  console.log("PUT Request for Path: ", path, " and Body: ", body);
  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (!idMatch) {
    return responseHelper.createResponse('1', 400, "Invalid PUT Path", null, null);
  }

  const investmentId = parseInt(idMatch[1]); // 提取 ID
  const updatedInvestment = JSON.parse(body); // 将 JSON 反序列化为对象
  const {year, type1, type2, target, price, currency, account, owner} = updatedInvestment;
  const sql = `
    UPDATE investment
    SET year     = $1,
        type1    = $2,
        type2    = $3,
        target   = $4,
        price    = $5,
        currency = $6,
        account  = $7,
        owner    = $8
    WHERE id = $9 RETURNING *;
  `;
  const params = [year, type1, type2, target, price, currency, account, owner, investmentId];
  const result = await dbHelper.updateOrDelete(sql, params);
  return responseHelper.createResponse('0', 200, "OK", result, null);

};

// DELETE 请求处理（删除投资数据）
const handleDeleteRequest = async (path) => {
  console.log("DELETE Request for Path: ", path);
  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (!idMatch) {
    return responseHelper.createResponse('1', 400, "Invalid DELETE Path", null, null);
  }
  const investmentId = parseInt(idMatch[1]); // 提取 ID
  console.log(`Deleting Investment with ID ${investmentId}`);


  const result = await dbHelper.updateOrDelete("DELETE FROM investment WHERE id = $1", [investmentId]);
  return responseHelper.createResponse('0', 204, "OK", null, null);
};







