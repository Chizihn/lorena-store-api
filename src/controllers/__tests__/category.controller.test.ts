import { Request, Response, NextFunction } from "express";
import Category from "../../models/category.model";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../category.controller";
import { HTTPSTATUS } from "../../config/http.config";

// Mock the Category model
jest.mock("../../models/category.model");

describe("Category Controller Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCategories", () => {
    it("should return all categories", async () => {
      const mockCategories = [
        { _id: "1", name: "Category 1", slug: "category-1" },
        { _id: "2", name: "Category 2", slug: "category-2" },
      ];

      (Category.find as jest.Mock).mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue(mockCategories),
      }));

      await getCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.find).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockCategories);
    });

    it("should return 404 if no categories found", async () => {
      (Category.find as jest.Mock).mockImplementation(() => ({
        lean: jest.fn().mockResolvedValue([]),
      }));

      await getCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.find).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "No categories found ",
      });
    });

    it("should call next with error if database operation fails", async () => {
      const error = new Error("Database error");
      (Category.find as jest.Mock).mockImplementation(() => ({
        lean: jest.fn().mockRejectedValue(error),
      }));

      await getCategories(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.find).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("createCategory", () => {
    it("should create a new category successfully", async () => {
      mockRequest.body = {
        name: "New Category",
        slug: "new-category",
      };

      const mockSavedCategory = {
        _id: "123",
        name: "New Category",
        slug: "new-category",
      };

      (Category as jest.Mocked<any>).mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(mockSavedCategory),
      }));

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Category created successfully!",
        category: expect.any(Object),
      });
    });

    it("should call next with error if save operation fails", async () => {
      mockRequest.body = {
        name: "New Category",
        slug: "new-category",
      };

      const error = new Error("Save error");
      (Category as jest.Mocked<any>).mockImplementation(() => ({
        save: jest.fn().mockRejectedValue(error),
      }));

      await createCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("updateCategory", () => {
    it("should update a category successfully", async () => {
      mockRequest.params = { id: "123" };
      mockRequest.body = {
        name: "Updated Category",
        slug: "updated-category",
      };

      const mockUpdatedCategory = {
        _id: "123",
        name: "Updated Category",
        slug: "updated-category",
      };

      (Category.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdatedCategory
      );

      await updateCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { name: "Updated Category", slug: "updated-category" },
        { new: true, runValidators: true }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Category updated successfully",
        updatedCategory: mockUpdatedCategory,
      });
    });

    it("should return 404 if category not found", async () => {
      mockRequest.params = { id: "123" };
      mockRequest.body = {
        name: "Updated Category",
        slug: "updated-category",
      };

      (Category.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await updateCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Category not found",
      });
    });

    it("should call next with error if update operation fails", async () => {
      mockRequest.params = { id: "123" };
      mockRequest.body = {
        name: "Updated Category",
        slug: "updated-category",
      };

      const error = new Error("Update error");
      (Category.findByIdAndUpdate as jest.Mock).mockRejectedValue(error);

      await updateCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.findByIdAndUpdate).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("deleteCategory", () => {
    it("should delete a category successfully", async () => {
      mockRequest.params = { id: "123" };

      const mockDeletedCategory = {
        _id: "123",
        name: "Deleted Category",
        slug: "deleted-category",
      };

      (Category.findByIdAndDelete as jest.Mock).mockResolvedValue(
        mockDeletedCategory
      );

      await deleteCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.findByIdAndDelete).toHaveBeenCalledWith("123");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Category deleted successfully",
        deletedCategory: mockDeletedCategory,
      });
    });

    it("should return 404 if category not found", async () => {
      mockRequest.params = { id: "123" };

      (Category.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await deleteCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.findByIdAndDelete).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Category not found",
      });
    });

    it("should call next with error if delete operation fails", async () => {
      mockRequest.params = { id: "123" };

      const error = new Error("Delete error");
      (Category.findByIdAndDelete as jest.Mock).mockRejectedValue(error);

      await deleteCategory(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(Category.findByIdAndDelete).toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
