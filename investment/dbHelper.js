import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

const TABLE_NAME = process.env.INVESTMENT_TABLE_NAME;

if (!TABLE_NAME) {
  throw new Error("INVESTMENT_TABLE_NAME environment variable is not defined.");
}

const dynamoClient = new DynamoDBClient({
  region:
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
  ...(process.env.DYNAMODB_ENDPOINT
    ? { endpoint: process.env.DYNAMODB_ENDPOINT }
    : {}),
});

const documentClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const NUMERIC_FIELDS = new Set(["id", "price"]);
// year 字段在数据库中存储为字符串（如 "2024"），所以查询时也使用字符串

const parseFilterValue = (field, value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  // 数字字段直接转换为数字
  if (NUMERIC_FIELDS.has(field)) {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }
    return undefined;
  }

  // year 字段：数据库中存储为字符串，查询时也使用字符串
  // 这样可以确保正确匹配
  if (field === "year") {
    return value.toString();
  }

  // 其他字段保持原样（字符串类型）
  return value;
};

const sanitizeFilters = (filters = {}) => {
  const sanitized = {};
  for (const [key, value] of Object.entries(filters)) {
    const parsedValue = parseFilterValue(key, value);
    if (parsedValue !== undefined) {
      sanitized[key] = parsedValue;
    }
  }
  return sanitized;
};

const buildFilterExpressions = (filters = {}) => {
  const expressions = [];
  const names = {};
  const values = {};

  for (const [key, value] of Object.entries(filters)) {
    // 跳过空值
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const nameKey = `#${key}`;
    const valueKey = `:${key}`;
    names[nameKey] = key;
    values[valueKey] = value;
    expressions.push(`${nameKey} = ${valueKey}`);
  }

  if (!expressions.length) {
    return {};
  }

  return {
    FilterExpression: expressions.join(" AND "),
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  };
};

const scanAll = async (input) => {
  let items = [];
  let lastEvaluatedKey;

  do {
    const command = new ScanCommand({
      ...input,
      ExclusiveStartKey: lastEvaluatedKey,
    });
    const { Items = [], LastEvaluatedKey } = await documentClient.send(command);
    items = items.concat(Items);
    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

const parseSortBy = (sortBy = "") => {
  return sortBy
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean)
    .map((field) => ({
      field: field.replace(/^[-+]/, ""),
      direction: field.startsWith("-") ? -1 : 1,
    }))
    .filter(({ field }) => !!field);
};

const compareValues = (a, b) => {
  if (a === b) {
    return 0;
  }
  if (a === undefined || a === null) {
    return 1;
  }
  if (b === undefined || b === null) {
    return -1;
  }
  if (typeof a === "string" && typeof b === "string") {
    return a.localeCompare(b);
  }
  return a > b ? 1 : -1;
};

const sortItems = (items, sortBy = "") => {
  const sortFields = parseSortBy(sortBy);
  if (!sortFields.length) {
    return items;
  }

  const clonedItems = [...items];
  clonedItems.sort((itemA, itemB) => {
    for (const { field, direction } of sortFields) {
      const comparison = compareValues(itemA?.[field], itemB?.[field]);
      if (comparison !== 0) {
        return comparison * direction;
      }
    }
    return 0;
  });
  return clonedItems;
};

export default {
  async getInvestmentById(id) {
    const { Item } = await documentClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { id },
      })
    );
    return Item ?? null;
  },

  async listInvestments({ filters = {}, sortBy } = {}) {
    const sanitizedFilters = sanitizeFilters(filters);
    const scanInput = {
      TableName: TABLE_NAME,
      ...buildFilterExpressions(sanitizedFilters),
    };
    const items = await scanAll(scanInput);
    return sortItems(items, sortBy);
  },

  async createInvestment(investment) {
    await documentClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: investment,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: { "#id": "id" },
      })
    );
    return investment;
  },

  async updateInvestment(id, updates) {
    const entries = Object.entries(updates).filter(
      ([, value]) => value !== undefined
    );
    if (!entries.length) {
      return null;
    }

    const setExpressions = [];
    const names = { "#id": "id" };
    const values = {};

    entries.forEach(([key, value], index) => {
      const nameKey = `#field_${index}`;
      const valueKey = `:value_${index}`;
      names[nameKey] = key;
      values[valueKey] = value;
      setExpressions.push(`${nameKey} = ${valueKey}`);
    });

    try {
      const { Attributes } = await documentClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id },
          UpdateExpression: `SET ${setExpressions.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: "attribute_exists(#id)",
          ReturnValues: "ALL_NEW",
        })
      );
      return Attributes ?? null;
    } catch (error) {
      if (error.name === "ConditionalCheckFailedException") {
        return null;
      }
      throw error;
    }
  },

  async deleteInvestment(id) {
    const { Attributes } = await documentClient.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id },
        ReturnValues: "ALL_OLD",
      })
    );
    return Attributes ?? null;
  },
};
