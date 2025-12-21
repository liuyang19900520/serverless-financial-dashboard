/**
 * Investment Service
 * Business logic layer for investment operations
 */
import { investmentRepository } from "../utils/investmentRepository.js";
import type { InvestmentPayload } from "../utils/validators.js";
import {
  extractIdFromPath,
  generateInvestmentId,
  parseBody,
  sanitizeInvestmentPayload,
} from "../utils/validators.js";

interface ServiceError extends Error {
  statusCode?: number;
}

export const investmentService = {
  /**
   * Get investment by ID
   */
  async getById(investmentId: number): Promise<InvestmentPayload | null> {
    return await investmentRepository.getById(investmentId);
  },

  /**
   * List investments with optional filters and sorting
   */
  async list({ queryParams = {} }: { queryParams?: Record<string, string | undefined> } = {}): Promise<InvestmentPayload[]> {
    const { sort_by: sortBy, ...filters } = queryParams;
    return await investmentRepository.list({ filters, sortBy });
  },

  /**
   * Create new investment
   */
  async create(body: string | null): Promise<InvestmentPayload> {
    const newInvestment = parseBody(body);
    if (!newInvestment) {
      throw new Error("Invalid request body");
    }

    const investmentPayload = sanitizeInvestmentPayload(newInvestment);
    
    // Auto-generate ID if not provided
    if (investmentPayload.id === undefined) {
      investmentPayload.id = generateInvestmentId();
    }

    // Add timestamp
    if (!investmentPayload.createdAt) {
      investmentPayload.createdAt = new Date().toISOString();
    }

    try {
      return await investmentRepository.create(investmentPayload);
    } catch (error) {
      if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
        const conflictError = new Error("Investment ID already exists") as ServiceError;
        conflictError.statusCode = 409;
        throw conflictError;
      }
      throw error;
    }
  },

  /**
   * Update existing investment
   */
  async update(path: string, body: string | null): Promise<InvestmentPayload> {
    const investmentId = extractIdFromPath(path);
    if (investmentId === null) {
      throw new Error("Invalid PUT Path");
    }

    const updatedInvestment = parseBody(body);
    if (!updatedInvestment) {
      throw new Error("Invalid request body");
    }

    const sanitizedUpdates = sanitizeInvestmentPayload(updatedInvestment);
    if (!Object.keys(sanitizedUpdates).length) {
      throw new Error("No valid fields provided for update");
    }

    const updatedRecord = await investmentRepository.update(investmentId, sanitizedUpdates);
    if (!updatedRecord) {
      const notFoundError = new Error("Investment Not Found") as ServiceError;
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    return updatedRecord;
  },

  /**
   * Delete investment
   */
  async delete(path: string): Promise<InvestmentPayload> {
    const investmentId = extractIdFromPath(path);
    if (investmentId === null) {
      throw new Error("Invalid DELETE Path");
    }

    const deleted = await investmentRepository.delete(investmentId);
    if (!deleted) {
      const notFoundError = new Error("Investment Not Found") as ServiceError;
      notFoundError.statusCode = 404;
      throw notFoundError;
    }

    return deleted;
  },
};

