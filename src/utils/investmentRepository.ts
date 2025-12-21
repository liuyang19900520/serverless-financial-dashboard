/**
 * Investment Repository
 * Data access layer for DynamoDB operations
 */
import type { ScanCommandInput } from "@aws-sdk/lib-dynamodb";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { documentClient, tableName } from "./dynamoClient.js";
import type { InvestmentPayload } from "./validators.js";

interface FilterExpressions {
  FilterExpression?: string;
  ExpressionAttributeNames?: Record<string, string>;
  ExpressionAttributeValues?: Record<string, unknown>;
}

interface SortField {
  field: string;
  direction: number;
}

const NUMERIC_FIELDS = new Set<string>(["id", "price"]);

const parseFilterValue = (field: string, value: unknown): unknown => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (NUMERIC_FIELDS.has(field)) {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      return numericValue;
    }
    return undefined;
  }

  if (field === "year") {
    return String(value);
  }

  return value;
};

const sanitizeFilters = (filters: Record<string, unknown> = {}): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filters)) {
    const parsedValue = parseFilterValue(key, value);
    if (parsedValue !== undefined) {
      sanitized[key] = parsedValue;
    }
  }
  return sanitized;
};

const buildFilterExpressions = (filters: Record<string, unknown> = {}): FilterExpressions => {
  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
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

const scanAll = async (input: ScanCommandInput): Promise<InvestmentPayload[]> => {
  const items: InvestmentPayload[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const command = new ScanCommand({
      ...input,
      ExclusiveStartKey: lastEvaluatedKey,
    });
    const { Items = [], LastEvaluatedKey } = await documentClient.send(command);
    items.push(...(Items as InvestmentPayload[]));
    lastEvaluatedKey = LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return items;
};

const parseSortBy = (sortBy: string = ""): SortField[] => {
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

const compareValues = (a: unknown, b: unknown): number => {
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

const sortItems = (items: InvestmentPayload[], sortBy: string = ""): InvestmentPayload[] => {
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

export const investmentRepository = {
  async getById(id: number): Promise<InvestmentPayload | null> {
    const { Item } = await documentClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id },
      })
    );
    return (Item as InvestmentPayload) ?? null;
  },

  async list({ filters = {}, sortBy }: { filters?: Record<string, unknown>; sortBy?: string } = {}): Promise<InvestmentPayload[]> {
    const sanitizedFilters = sanitizeFilters(filters);
    const scanInput: ScanCommandInput = {
      TableName: tableName,
      ...buildFilterExpressions(sanitizedFilters),
    };
    const items = await scanAll(scanInput);
    return sortItems(items, sortBy || "");
  },

  async create(investment: InvestmentPayload): Promise<InvestmentPayload> {
    await documentClient.send(
      new PutCommand({
        TableName: tableName,
        Item: investment,
        ConditionExpression: "attribute_not_exists(#id)",
        ExpressionAttributeNames: { "#id": "id" },
      })
    );
    return investment;
  },

  async update(id: number, updates: Partial<InvestmentPayload>): Promise<InvestmentPayload | null> {
    const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      return null;
    }

    const setExpressions: string[] = [];
    const names: Record<string, string> = { "#id": "id" };
    const values: Record<string, unknown> = {};

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
          TableName: tableName,
          Key: { id },
          UpdateExpression: `SET ${setExpressions.join(", ")}`,
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ConditionExpression: "attribute_exists(#id)",
          ReturnValues: "ALL_NEW",
        })
      );
      return (Attributes as InvestmentPayload) ?? null;
    } catch (error) {
      if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
        return null;
      }
      throw error;
    }
  },

  async delete(id: number): Promise<InvestmentPayload | null> {
    const { Attributes } = await documentClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: { id },
        ReturnValues: "ALL_OLD",
      })
    );
    return (Attributes as InvestmentPayload) ?? null;
  },
};

