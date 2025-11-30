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

const NUMERIC_FIELDS = new Set(["id", "price"]);
// year 字段在数据库中存储为字符串，需要特殊处理

const parseBody = (body) => {
  if (!body) {
    return null;
  }

  if (typeof body === "object") {
    return body;
  }

  try {
    return JSON.parse(body);
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return null;
  }
};

const sanitizeInvestmentPayload = (payload = {}) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }

    // 数字字段转换为数字
    if (NUMERIC_FIELDS.has(key)) {
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue)) {
        sanitized[key] = numericValue;
      }
      continue;
    }

    // year 字段：确保存储为字符串（与数据库中的格式一致）
    if (key === "year") {
      sanitized[key] = value.toString();
      continue;
    }

    // 其他字段保持原样
    sanitized[key] = value;
  }

  return sanitized;
};

const extractIdFromPath = (path = "") => {
  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (!idMatch) {
    return null;
  }

  return Number(idMatch[1]);
};

const generateInvestmentId = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return Number(`${timestamp}${random}`);
};

export const lambdaHandler = async (event) => {
  const { httpMethod, path, body } = event;
  let response;

  try {
    switch (httpMethod) {
      case "GET":
        response = await handleGetRequest(event);
        break;
      case "POST":
        response = await handlePostRequest(body);
        break;
      case "PUT":
        response = await handlePutRequest(path, body);
        break;
      case "DELETE":
        response = await handleDeleteRequest(path);
        break;
      default:
        response = responseHelper.createResponse(
          "1",
          405,
          "Method Not Allowed",
          null,
          null
        );
    }
  } catch (error) {
    console.error("Error: ", error);
    response = responseHelper.createResponse(
      "1",
      500,
      "Internal Server Error",
      null,
      { message: error.message }
    );
  }

  return response;
};

// GET 请求处理
const handleGetRequest = async (event) => {
  const path = event.path || "";
  const investmentId = extractIdFromPath(path);

  if (investmentId !== null) {
    const investment = await dbHelper.getInvestmentById(investmentId);
    if (!investment) {
      return responseHelper.createResponse(
        "1",
        404,
        "Investment Not Found",
        null,
        null
      );
    }
    return responseHelper.createResponse("0", 200, "OK", investment, null);
  }

  const queryParams = event.queryStringParameters || {};
  const { sort_by: sortBy, ...filters } = queryParams;
  console.log("GET Request Query Parameters: ", queryParams);

  const investments = await dbHelper.listInvestments({
    filters,
    sortBy,
  });
  return responseHelper.createResponse("0", 200, "OK", investments, null);
};

// POST 请求处理（新增投资数据）
const handlePostRequest = async (body) => {
  console.log("POST Request with Body: ", body);

  const newInvestment = parseBody(body);
  if (!newInvestment) {
    return responseHelper.createResponse(
      "1",
      400,
      "Invalid request body",
      null,
      null
    );
  }

  const investmentPayload = sanitizeInvestmentPayload(newInvestment);
  if (investmentPayload.id === undefined) {
    investmentPayload.id = generateInvestmentId();
  }

  if (!investmentPayload.createdAt) {
    investmentPayload.createdAt = new Date().toISOString();
  }

  try {
    const created = await dbHelper.createInvestment(investmentPayload);
    console.log("New Investment Inserted: ", created);
    return responseHelper.createResponse("0", 201, "OK", created, null);
  } catch (error) {
    if (error.name === "ConditionalCheckFailedException") {
      return responseHelper.createResponse(
        "1",
        409,
        "Investment ID already exists",
        null,
        null
      );
    }
    throw error;
  }
};

// PUT 请求处理（更新投资数据）
const handlePutRequest = async (path, body) => {
  console.log("PUT Request for Path: ", path, " and Body: ", body);
  const investmentId = extractIdFromPath(path);
  if (investmentId === null) {
    return responseHelper.createResponse(
      "1",
      400,
      "Invalid PUT Path",
      null,
      null
    );
  }

  const updatedInvestment = parseBody(body);
  if (!updatedInvestment) {
    return responseHelper.createResponse(
      "1",
      400,
      "Invalid request body",
      null,
      null
    );
  }

  const sanitizedUpdates = sanitizeInvestmentPayload(updatedInvestment);
  if (!Object.keys(sanitizedUpdates).length) {
    return responseHelper.createResponse(
      "1",
      400,
      "No valid fields provided for update",
      null,
      null
    );
  }

  const updatedRecord = await dbHelper.updateInvestment(
    investmentId,
    sanitizedUpdates
  );
  if (!updatedRecord) {
    return responseHelper.createResponse(
      "1",
      404,
      "Investment Not Found",
      null,
      null
    );
  }
  return responseHelper.createResponse("0", 200, "OK", updatedRecord, null);
};

// DELETE 请求处理（删除投资数据）
const handleDeleteRequest = async (path) => {
  console.log("DELETE Request for Path: ", path);
  const investmentId = extractIdFromPath(path);
  if (investmentId === null) {
    return responseHelper.createResponse(
      "1",
      400,
      "Invalid DELETE Path",
      null,
      null
    );
  }
  console.log(`Deleting Investment with ID ${investmentId}`);

  const deleted = await dbHelper.deleteInvestment(investmentId);
  if (!deleted) {
    return responseHelper.createResponse(
      "1",
      404,
      "Investment Not Found",
      null,
      null
    );
  }

  return responseHelper.createResponse("0", 204, "OK", null, null);
};
