/**
 * Response Helper Utility
 * Standardizes API Gateway Lambda Proxy responses
 */
import type { APIGatewayProxyResult } from "aws-lambda";

export const createResponse = (
  status: string,
  code: number,
  message: string,
  data: unknown = null,
  error: unknown = null
): APIGatewayProxyResult => {
  return {
    statusCode: code,
    body: JSON.stringify({ status, message, data, error }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST,GET,OPTIONS,DELETE,PUT,PATCH",
      "Access-Control-Allow-Headers": "Content-Type,X-CSRF-TOKEN",
    },
  };
};

