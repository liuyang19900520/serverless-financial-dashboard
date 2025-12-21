/**
 * DynamoDB Client Configuration
 * Initialized outside handler for execution context reuse
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.INVESTMENT_TABLE_NAME;

if (!TABLE_NAME) {
  throw new Error("INVESTMENT_TABLE_NAME environment variable is not defined.");
}

// Initialize DynamoDB client outside handler for connection reuse
const dynamoClient = new DynamoDBClient({
  region: (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1") as string,
  ...(process.env.DYNAMODB_ENDPOINT ? { endpoint: process.env.DYNAMODB_ENDPOINT } : {}),
});

export const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

export const tableName: string = TABLE_NAME;

