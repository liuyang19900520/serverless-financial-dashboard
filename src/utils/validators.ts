/**
 * Input Validation and Sanitization Utilities
 */

export interface InvestmentPayload {
  id?: number;
  year?: string | number;
  price?: number;
  target?: string;
  type1?: string;
  type2?: string;
  currency?: string;
  account?: string;
  owner?: string;
  createdAt?: string;
  [key: string]: unknown;
}

const NUMERIC_FIELDS = new Set<string>(["id", "price"]);

/**
 * Parse request body (handles both string and object)
 */
export const parseBody = (body: string | null | undefined): Record<string, unknown> | null => {
  if (!body) {
    return null;
  }

  if (typeof body === "object") {
    return body as Record<string, unknown>;
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to parse request body:", error);
    return null;
  }
};

/**
 * Sanitize investment payload for create/update operations
 */
export const sanitizeInvestmentPayload = (payload: Record<string, unknown> = {}): InvestmentPayload => {
  const sanitized: InvestmentPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }

    // Numeric fields
    if (NUMERIC_FIELDS.has(key)) {
      const numericValue = Number(value);
      if (!Number.isNaN(numericValue)) {
        sanitized[key as keyof InvestmentPayload] = numericValue;
      }
      continue;
    }

    // Year field: ensure stored as string (matches database format)
    if (key === "year") {
      sanitized.year = value.toString();
      continue;
    }

    // Other fields remain as-is
    sanitized[key] = value;
  }

  return sanitized;
};

/**
 * Extract investment ID from API Gateway path
 */
export const extractIdFromPath = (path: string): number | null => {
  const idMatch = path.match(/^\/investment\/(\d+)$/);
  if (!idMatch) {
    return null;
  }
  return Number(idMatch[1]);
};

/**
 * Generate unique investment ID
 */
export const generateInvestmentId = (): number => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return Number(`${timestamp}${random}`);
};

