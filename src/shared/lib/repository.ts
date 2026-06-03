/**
 * Base Repository Pattern
 *
 * Provides foundation for all domain repositories.
 * Ensures consistent error handling, type safety, and Supabase integration.
 */

import { PostgrestFilterBuilder, PostgrestQueryBuilder } from '@supabase/postgrest-js';

export interface Repository<T> {
  findAll(filter?: any): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: any): Promise<T>;
  update(id: string, data: any): Promise<T>;
  delete(id: string): Promise<void>;
}

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id: string) {
    super(404, 'NOT_FOUND', `${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public details?: Record<string, string>
  ) {
    super(400, 'VALIDATION_ERROR', message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized') {
    super(401, 'UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Base repository with common operations
 */
export abstract class BaseRepository<T> implements Repository<T> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  /**
   * Get the base query builder for this table
   */
  protected abstract query(): PostgrestQueryBuilder<any, any, any>;

  /**
   * Find all records
   */
  async findAll(filter?: any): Promise<T[]> {
    try {
      let query = this.query().select('*');

      if (filter) {
        query = this.applyFilters(query, filter);
      }

      const { data, error } = await query;

      if (error) throw new ApiError(500, error.code, error.message);
      return (data || []) as T[];
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Find single by ID
   */
  async findById(id: string): Promise<T | null> {
    try {
      const { data, error } = await this.query()
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new ApiError(500, error.code, error.message);
      return data as T | null;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Create new record
   */
  async create(data: any): Promise<T> {
    try {
      const { data: result, error } = await this.query()
        .insert(data)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new ValidationError('Duplicate entry', { duplicate: error.message });
        }
        throw new ApiError(500, error.code, error.message);
      }

      return result as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Update record
   */
  async update(id: string, data: any): Promise<T> {
    try {
      const { data: result, error } = await this.query()
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new ApiError(500, error.code, error.message);
      if (!result) throw new NotFoundError(this.tableName, id);

      return result as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Delete record
   */
  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.query().delete().eq('id', id);

      if (error) throw new ApiError(500, error.code, error.message);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Apply filters to query - to be overridden by subclasses
   */
  protected applyFilters(
    query: PostgrestQueryBuilder<any, any, any>,
    filter: any
  ): PostgrestQueryBuilder<any, any, any> {
    return query;
  }

  /**
   * Check if resource exists
   */
  async exists(id: string): Promise<boolean> {
    try {
      const { data, error } = await this.query()
        .select('id')
        .eq('id', id)
        .maybeSingle();

      if (error) throw new ApiError(500, error.code, error.message);
      return !!data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }

  /**
   * Count records
   */
  async count(filter?: any): Promise<number> {
    try {
      let query = this.query().select('id', { count: 'exact', head: true });

      if (filter) {
        query = this.applyFilters(query, filter) as any;
      }

      const { count, error } = await query;

      if (error) throw new ApiError(500, error.code, error.message);
      return count || 0;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(500, 'DATABASE_ERROR', String(error));
    }
  }
}
