import { Request, Response, NextFunction } from "express";
import Category from "../../models/category.model";

import {
  createSubcategory,
  getSubcategories,
  updateSubcategory,
  deleteSubcategory,
} from "../subcategory.controller";
import Subcategory from "../../models/subcategory.model";

type MockSubcategoryModel = {
  (data: any): any;
  find: jest.Mock;
  findById: jest.Mock;
  findByIdAndUpdate: jest.Mock;
  findByIdAndDelete: jest.Mock;
};

// Mock the models

// jest.mock("../../models/subcategory.model", () => {
//   const mockModel = function (data: any) {
//     return {
//       ...data,
//       save: jest.fn().mockResolvedValue({ ...data, _id: "subcategoryId123" }),
//     };
//   };

//   // Add static methods to the mock function
//   mockModel.find = jest.fn();
//   mockModel.findByIdAndUpdate = jest.fn();
//   mockModel.findByIdAndDelete = jest.fn();

//   return {
//     __esModule: true,
//     default: mockModel,
//   };
// });

jest.mock("../../models/category.model", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

// Create a constructor mock with proper typing
jest.mock("../../models/subcategory.model", () => {
  // Create a constructor mock with proper typing
  const mockConstructor = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({ ...data, _id: "subcategoryId123" }),
  })) as unknown as MockSubcategoryModel;

  // Add static methods with proper typing
  mockConstructor.find = jest.fn();
  mockConstructor.findById = jest.fn();
  mockConstructor.findByIdAndUpdate = jest.fn();
  mockConstructor.findByIdAndDelete = jest.fn();

  return {
    __esModule: true,
    default: mockConstructor,
  };
});

describe("Subcategory Controller", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getSubcategories", () => {
    it("should return all subcategories", async () => {
      // Arrange
      const mockSubcategories = [
        { _id: "1", name: "Subcategory 1", category: "1" },
        { _id: "1", name: "Subcategory 2", category: "2" },
      ];

      const mockPopulate = jest.fn().mockResolvedValue(mockSubcategories);
      (Subcategory.find as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      // Act
      await getSubcategories(req as Request, res as Response, next);

      // Assert
      expect(Subcategory.find).toHaveBeenCalled();
      // expect(mockPopulate).toHaveBeenCalledWith("category");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockSubcategories);
    });

    it("should call next with error when an exception occurs", async () => {
      // Arrange
      const mockError = new Error("Database error");
      const mockPopulate = jest.fn().mockRejectedValue(mockError);
      (Subcategory.find as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      // Act
      await getSubcategories(req as Request, res as Response, next);

      // Assert
      expect(Subcategory.find).toHaveBeenCalled();
      expect(mockPopulate).toHaveBeenCalledWith("category");
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe("createSubcategory", () => {
    it("should create a subcategory when valid data is provided", async () => {
      // Arrange
      const mockCategory = { _id: "categoryId123" };

      req.body = {
        name: "Test Subcategory",
        slug: "test-subcategory",
        categoryId: "categoryId123",
      };

      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);

      // Act
      await createSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Category.findById).toHaveBeenCalledWith("categoryId123");
      expect(Subcategory).toHaveBeenCalledWith({
        name: "Test Subcategory",
        slug: "test-subcategory",
        category: "categoryId123",
      });

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subcategory created successfully!",
        subcategory: expect.any(Object),
      });
    });

    it("should return 404 when category is not found", async () => {
      // Arrange
      req.body = {
        name: "Test Subcategory",
        slug: "test-subcategory",
        categoryId: "nonExistentCategoryId",
      };

      (Category.findById as jest.Mock).mockResolvedValue(null);

      // Act
      await createSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Category.findById).toHaveBeenCalledWith("nonExistentCategoryId");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Category not found" });
    });

    it("should call next with error when an exception occurs", async () => {
      // Arrange
      const mockError = new Error("Database error");
      req.body = {
        name: "Test Subcategory",
        slug: "test-subcategory",
        categoryId: "categoryId123",
      };

      (Category.findById as jest.Mock).mockRejectedValue(mockError);

      // Act
      await createSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Category.findById).toHaveBeenCalledWith("categoryId123");
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe("updateSubcategory", () => {
    it("should update a subcategory when valid data is provided", async () => {
      // Arrange
      const mockCategory = { _id: "categoryId123" };
      const mockUpdatedSubcategory = {
        _id: "subcategoryId123",
        name: "Updated Subcategory",
        slug: "updated-subcategory",
        category: "categoryId123",
      };

      req.params = { id: "subcategoryId123" };
      req.body = {
        name: "Updated Subcategory",
        slug: "updated-subcategory",
        categoryId: "categoryId123",
      };

      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      (Subcategory.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdatedSubcategory
      );

      // Act
      await updateSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Category.findById).toHaveBeenCalledWith("categoryId123");
      expect(Subcategory.findByIdAndUpdate).toHaveBeenCalledWith(
        "subcategoryId123",
        {
          name: "Updated Subcategory",
          slug: "updated-subcategory",
          category: "categoryId123",
        },
        { new: true, runValidators: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subcategory updated successfully",
        updatedSubcategory: mockUpdatedSubcategory,
      });
    });

    it("should return 404 when category is not found", async () => {
      // Arrange
      req.params = { id: "subcategoryId123" };
      req.body = {
        name: "Updated Subcategory",
        slug: "updated-subcategory",
        categoryId: "nonExistentCategoryId",
      };

      (Category.findById as jest.Mock).mockResolvedValue(null);

      // Act
      await updateSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Category.findById).toHaveBeenCalledWith("nonExistentCategoryId");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: "Category not found" });
    });

    it("should return 404 when subcategory is not found", async () => {
      // Arrange
      const mockCategory = { _id: "categoryId123" };

      req.params = { id: "nonExistentSubcategoryId" };
      req.body = {
        name: "Updated Subcategory",
        slug: "updated-subcategory",
        categoryId: "categoryId123",
      };

      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);
      (Subcategory.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      // Act
      await updateSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Category.findById).toHaveBeenCalledWith("categoryId123");
      expect(Subcategory.findByIdAndUpdate).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subcategory not found",
      });
    });

    it("should call next with error when an exception occurs", async () => {
      // Arrange
      const mockError = new Error("Database error");

      req.params = { id: "subcategoryId123" };
      req.body = {
        name: "Updated Subcategory",
        slug: "updated-subcategory",
        categoryId: "categoryId123",
      };

      (Category.findById as jest.Mock).mockRejectedValue(mockError);

      // Act
      await updateSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Category.findById).toHaveBeenCalledWith("categoryId123");
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });

  describe("deleteSubcategory", () => {
    it("should delete a subcategory when it exists", async () => {
      // Arrange
      const mockDeletedSubcategory = {
        _id: "subcategoryId123",
        name: "Test Subcategory",
        slug: "test-subcategory",
      };

      req.params = { id: "subcategoryId123" };

      (Subcategory.findByIdAndDelete as jest.Mock).mockResolvedValue(
        mockDeletedSubcategory
      );

      // Act
      await deleteSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Subcategory.findByIdAndDelete).toHaveBeenCalledWith(
        "subcategoryId123"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subcategory deleted successfully",
        deletedSubcategory: mockDeletedSubcategory,
      });
    });

    it("should return 404 when subcategory is not found", async () => {
      // Arrange
      req.params = { id: "nonExistentSubcategoryId" };

      (Subcategory.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      // Act
      await deleteSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Subcategory.findByIdAndDelete).toHaveBeenCalledWith(
        "nonExistentSubcategoryId"
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: "Subcategory not found",
      });
    });

    it("should call next with error when an exception occurs", async () => {
      // Arrange
      const mockError = new Error("Database error");

      req.params = { id: "subcategoryId123" };

      (Subcategory.findByIdAndDelete as jest.Mock).mockRejectedValue(mockError);

      // Act
      await deleteSubcategory(req as Request, res as Response, next);

      // Assert
      expect(Subcategory.findByIdAndDelete).toHaveBeenCalledWith(
        "subcategoryId123"
      );
      expect(next).toHaveBeenCalledWith(mockError);
    });
  });
});
