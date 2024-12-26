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

export const lambdaHandler = async (event, context) => {
  const { httpMethod, path, body } = event;
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
        response = {
          statusCode: 405,
          body: JSON.stringify({ message: "Method Not Allowed" }),
        };
    }
  } catch (error) {
    // 错误捕获
    console.error("Error: ", error);
    response = {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }

  return response;
};

// GET 请求处理
const handleGetRequest = async (event) => {
  const path = event.path || ""; // 当前请求路径
  console.log("GET Request for Path: ", path);

  const queryParams = event.queryStringParameters || {};
  console.log("GET Request Query Parameters: ", queryParams);

  const investments = await dbHelper.query("SELECT * FROM investment");

  // 如果没有查询参数，返回所有数据
  if (Object.keys(queryParams).length === 0) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        data: investments,
        message: "Query parameters not provided. Returning all investments.",
      }),
    };
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      queryParams: queryParams, // 返回请求中可能的查询参数
      data: investments,       // 模拟返回传递的投资数据
    }),
  };

  // 如果路径是 "/investment/{id}"，返回特定投资数据
  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (idMatch) {
    const investment = investments.find((inv) => inv.id === parseInt(idMatch[1]));
    return investment
      ? {statusCode: 200, body: JSON.stringify({data: investment})}
      : {statusCode: 404, body: JSON.stringify({message: "Investment Not Found"})};
  }

  return {statusCode: 400, body: JSON.stringify({message: "Invalid GET Path"})};
};

// POST 请求处理（新增投资数据）
const handlePostRequest = (body) => {
  console.log("POST Request with Body: ", body);

  const newInvestment = JSON.parse(body); // 将 JSON 反序列化为对象
  console.log("New Investment Added: ", newInvestment);

  return {
    statusCode: 201,
    body: JSON.stringify({ message: "Investment Created", data: newInvestment }),
  };
};

// PUT 请求处理（更新投资数据）
const handlePutRequest = (path, body) => {
  console.log("PUT Request for Path: ", path, " and Body: ", body);

  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (!idMatch) {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid PUT Path" }) };
  }

  const updatedInvestment = JSON.parse(body); // 将 JSON 反序列化为对象
  console.log(`Updating Investment with ID ${idMatch[1]}: `, updatedInvestment);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Investment Updated", data: updatedInvestment }),
  };
};

// DELETE 请求处理（删除投资数据）
const handleDeleteRequest = (path) => {
  console.log("DELETE Request for Path: ", path);

  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (!idMatch) {
    return { statusCode: 400, body: JSON.stringify({ message: "Invalid DELETE Path" }) };
  }

  console.log(`Deleting Investment with ID ${idMatch[1]}`);
  return { statusCode: 204 }; // 204 表示成功但无内容
};

