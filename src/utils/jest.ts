import { Model, Document } from "mongoose";

/**
 * Types for common Mongoose query builders and methods
 */
type QueryCallback = (...args: any[]) => any;
type QueryChain = Record<string, QueryCallback> & { exec?: () => Promise<any> };

/**
 * More specific MockModel type that matches your usage pattern
 */
export type MockMongooseModel<T = any> = {
  new (data?: any): T & { save: jest.Mock };
  find: jest.Mock;
  findOne: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
  create: jest.Mock;
  updateOne: jest.Mock;
  deleteOne: jest.Mock;
  countDocuments: jest.Mock;
} & jest.Mock;

/**
 * Creates a reusable mock for Mongoose models
 * Specifically tailored for controller testing pattern
 */
export const createModelMock = <T = any>(): MockMongooseModel<T> => {
  // Create the constructor mock
  const ModelMock = jest.fn().mockImplementation((data) => {
    return {
      ...data,
      save: jest
        .fn()
        .mockResolvedValue({ ...data, _id: data._id || "mock-id" }),
    };
  }) as unknown as MockMongooseModel<T>;

  // Add mock methods that return chainable query builders
  const mockQueryBuilder = (resolvedValue?: any) => {
    const chainMethods: QueryChain = {
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(resolvedValue),
    };

    // For methods that might return a value directly
    if (resolvedValue !== undefined) {
      return jest.fn().mockImplementation(() => chainMethods);
    }

    // For methods that might be configured later
    return jest.fn().mockImplementation((query?: any) => {
      // If direct resolution is provided in implementation
      if (query && typeof query === "function") {
        const mockFn = jest.fn().mockImplementation(query);
        return mockFn;
      }
      return chainMethods;
    });
  };

  // Static methods
  ModelMock.find = mockQueryBuilder();
  ModelMock.findOne = mockQueryBuilder();
  ModelMock.findById = mockQueryBuilder();
  ModelMock.findByIdAndUpdate = jest.fn();
  ModelMock.findByIdAndDelete = jest.fn();
  ModelMock.create = jest.fn();
  ModelMock.updateOne = jest.fn();
  ModelMock.deleteOne = jest.fn();
  ModelMock.countDocuments = jest.fn();

  return ModelMock;
};
