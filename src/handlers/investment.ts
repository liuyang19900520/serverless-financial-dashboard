/**
 * Investment Lambda Handler
 * Thin handler pattern - delegates to service layer
 */
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from "aws-lambda";
import { investmentService } from "../services/investmentService.js";
import { createResponse } from "../utils/responseHelper.js";

interface ServiceError extends Error {
  statusCode?: number;
}

/**
 * Lambda handler entry point
 */
export const lambdaHandler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  const { httpMethod, path, body, queryStringParameters } = event;

  try {
    switch (httpMethod) {
      case "GET":
        return await handleGet(event);
      case "POST":
        return await handlePost(body);
      case "PUT":
        return await handlePut(path, body);
      case "DELETE":
        return await handleDelete(path);
      default:
        return createResponse("1", 405, "Method Not Allowed", null, null);
    }
  } catch (error) {
    console.error("Handler Error:", error);
    
    // Handle service layer errors with status codes
    const serviceError = error as ServiceError;
    const statusCode = serviceError.statusCode || 500;
    const message = serviceError.message || "Internal Server Error";
    
    return createResponse("1", statusCode, message, null, {
      message: serviceError.message,
    });
  }
};

/**
 * Handle GET requests
 */
const handleGet = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const { path, queryStringParameters } = event;
  const investmentId = extractIdFromPath(path || "");

  if (investmentId !== null) {
    const investment = await investmentService.getById(investmentId);
    if (!investment) {
      return createResponse("1", 404, "Investment Not Found", null, null);
    }
    return createResponse("0", 200, "OK", investment, null);
  }

  const investments = await investmentService.list({
    queryParams: queryStringParameters || {},
  });
  return createResponse("0", 200, "OK", investments, null);
};

/**
 * Handle POST requests
 */
const handlePost = async (body: string | null): Promise<APIGatewayProxyResult> => {
  const created = await investmentService.create(body);
  return createResponse("0", 201, "OK", created, null);
};

/**
 * Handle PUT requests
 */
const handlePut = async (path: string, body: string | null): Promise<APIGatewayProxyResult> => {
  const updated = await investmentService.update(path, body);
  return createResponse("0", 200, "OK", updated, null);
};

/**
 * Handle DELETE requests
 */
const handleDelete = async (path: string): Promise<APIGatewayProxyResult> => {
  await investmentService.delete(path);
  return createResponse("0", 204, "OK", null, null);
};

/**
 * Extract ID from path (helper function)
 */
const extractIdFromPath = (path: string): number | null => {
  const idMatch = path.match(/^\/investment\/(\d+)$/);
  return idMatch ? Number(idMatch[1]) : null;
};

