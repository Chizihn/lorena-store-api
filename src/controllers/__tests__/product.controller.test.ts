import { Request, Response, NextFunction } from "express";
import ProductModel from "../../models/product.model";
import Category from "../../models/category.model";
import UserModel from "../../models/user.model";
import WishlistModel from "../../models/wishlist.model";
import { HTTPSTATUS } from "../../config/http.config";
import { ErrorCodeEnum } from "../../enums/error-code.enum";
import { AuthenticatedRequest } from "../../types/custom.type";
import { Types } from "mongoose";
import Subcategory from "../../models/subcategory.model";

jest.mock("../../validators/product.validator", () => ({
  ProductSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
}));

jest.mock("../../models/product.model");

// Mock the models

jest.mock("../../models/subcategory.model", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../../models/wishlist.model", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
}));

// jest.mock("../../models/product.model", () => ({
//   __esModule: true,
//   default: {
//     findById: jest.fn(),
//     findOne: jest.fn(),
//     create: jest.fn(),
//     findByIdAndUpdate: jest.fn(),
//     findByIdAndDelete: jest.fn(),
//   },
// }));

jest.mock("../../models/category.model", () => {
  return {
    __esModule: true,
    default: {
      findById: jest.fn(),
      findOne: jest.fn(),
    },
  };
});

jest.mock("../../models/user.model", () => {
  return {
    __esModule: true,
    default: {
      findById: jest.fn(),
      findOne: jest.fn(),
    },
  };
});

import {
  getProducts,
  getSingleProduct,
  getProductBySlug,
  addProduct,
  updateProduct,
  deleteProduct,
  getWishlist,
  addToWishList,
  removeFromWishList,
} from "../product.controller";

describe("Product Controller Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: { _id: "user1" },
    } as unknown as Request;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProducts", () => {
    it("should return all products", async () => {
      const mockProducts = [
        {
          _id: "1",
          name: "Product 1",
          category: { _id: "cat1", name: "Category 1" },
        },
        {
          _id: "2",
          name: "Product 2",
          category: { _id: "cat2", name: "Category 2" },
        },
      ];

      // const mockPopulate = jest.fn().mockResolvedValue(mockProducts);

      // (ProductModel.find as jest.Mock).mockReturnValue({
      //   populate: mockPopulate,
      // });

      (ProductModel.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProducts),
      }));

      await getProducts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(ProductModel.find).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockProducts);
    });

    it("should return 404 if no products found", async () => {
      (ProductModel.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue([]),
      }));

      await getProducts(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No products found",
        errorCode: ErrorCodeEnum.PRODUCTS_NOT_FOUND,
      });
    });
  });

  describe("getSingleProduct", () => {
    it("should return a single product", async () => {
      mockRequest.params = { id: "123" };
      const mockProduct = {
        _id: "123",
        name: "Test Product",
        category: { _id: "cat1", name: "Category 1" },
      };

      (ProductModel.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProduct),
      }));

      await getSingleProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(ProductModel.findById).toHaveBeenCalledWith("123");
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockProduct);
    });

    it("should return 404 if product not found", async () => {
      mockRequest.params = { id: "123" };

      (ProductModel.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      await getSingleProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Product not found",
        errorCode: ErrorCodeEnum.PRODUCT_NOT_FOUND,
      });
    });
  });

  describe("getProductBySlug", () => {
    it("should return product by slug", async () => {
      mockRequest.params = { slug: "test-product" };
      const mockProduct = {
        _id: "123",
        name: "Test Product",
        slug: "test-product",
        category: { _id: "cat1", name: "Category 1" },
      };

      (ProductModel.findOne as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockProduct),
      }));

      await getProductBySlug(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(ProductModel.findOne).toHaveBeenCalledWith({
        slug: "test-product",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockProduct);
    });

    it("should return 400 for invalid slug", async () => {
      mockRequest.params = { slug: "" };

      await getProductBySlug(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid slug provided",
        errorCode: ErrorCodeEnum.INVALID_SLUG,
      });
    });
  });

  describe("addProduct", () => {
    it("should add a new product successfully", async () => {
      // Set up request body
      mockRequest.body = {
        name: "New Product",
        image: "test",
        stock: "10",
        originalPrice: "100",
        discountedPrice: "100",
        description: "Test description",
        slug: "test-1",
        category: "cat1",
      };

      // Mock category find
      const mockCategory = { _id: "cat1", name: "Category 1" };
      (Category.findById as jest.Mock).mockResolvedValue(mockCategory);

      // Mock subcategory find (if needed)
      (Subcategory.findById as jest.Mock).mockResolvedValue(null);

      // Mock product find (for duplicate check)
      (ProductModel.findOne as jest.Mock).mockResolvedValue(null);

      // Mock product creation and save
      const mockSavedProduct = {
        _id: "123",
        ...mockRequest.body,
        category: mockCategory._id,
        subcategory: null,
      };

      const mockProductInstance = {
        ...mockSavedProduct,
        save: jest.fn().mockResolvedValue(mockSavedProduct),
      };

      (ProductModel as jest.Mocked<any>).mockImplementation(
        () => mockProductInstance
      );

      // Call the controller function
      await addProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // Check expectations with the correct field name (data instead of product)
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Product added successfully",
        data: expect.any(Object),
      });
    });

    it("should return 404 if category not found", async () => {
      mockRequest.body = {
        name: "New Product",
        category: "nonexistent",
      };

      (Category.findById as jest.Mock).mockResolvedValue(null);

      await addProduct(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("updateProduct", () => {
    it("should update product successfully", async () => {
      mockRequest.params = { productId: "123" };
      mockRequest.body = {
        name: "Updated Product",
        originalPrice: "150",
      };

      const mockProduct = {
        _id: "123",
        name: "Original Product",
        originalPrice: "100",
        save: jest.fn().mockResolvedValue({
          _id: "123",
          name: "Updated Product",
          originalPrice: "150",
        }),
      };

      (ProductModel.findById as jest.Mock).mockResolvedValue(mockProduct);

      await updateProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(ProductModel.findById).toHaveBeenCalledWith("123");
      expect(mockProduct.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Product updated successfully",
      });
    });
  });

  describe("deleteProduct", () => {
    it("should delete product successfully", async () => {
      mockRequest.params = { productId: "123" };

      const mockProduct = {
        _id: "123",
        name: "Product to Delete",
      };

      (ProductModel.findByIdAndDelete as jest.Mock).mockResolvedValue(
        mockProduct
      );

      await deleteProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Product deleted successfully",
      });
    });

    it("should return 404 if product not found", async () => {
      mockRequest.params = { productId: "123" };

      (ProductModel.findByIdAndDelete as jest.Mock).mockResolvedValue(null);

      await deleteProduct(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getWishlist", () => {
    it("should return user's wishlist", async () => {
      mockRequest.user = { _id: "user123" };

      const mockUser = {
        _id: "user123",
        wishlist: "wishlist123",
      };

      const mockWishlist = {
        _id: "wishlist123",
        products: [
          { _id: "prod1", name: "Product 1" },
          { _id: "prod2", name: "Product 2" },
        ],
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (WishlistModel.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockWishlist),
      }));

      await getWishlist(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        wishlist: {
          id: mockWishlist._id,
          products: mockWishlist.products,
        },
      });
    });

    it("should create new wishlist if none exists", async () => {
      mockRequest.user = { _id: "user123" };

      const mockUser = {
        _id: "user123",
        save: jest.fn().mockResolvedValue(true),
      };

      const mockWishlist = {
        _id: "newWishlist123",
        products: [],
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (WishlistModel.findById as jest.Mock).mockResolvedValue(null);
      (WishlistModel.create as jest.Mock).mockResolvedValue(mockWishlist);

      await getWishlist(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(WishlistModel.create).toHaveBeenCalledWith({
        userId: "user123",
        products: [],
      });
    });
  });

  describe("addToWishList", () => {
    it("should add product to wishlist successfully", async () => {
      // Create ObjectId instances for more realistic testing
      const userId = new Types.ObjectId("507f1f77bcf86cd799439011");
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");
      const wishlistId = new Types.ObjectId("507f1f77bcf86cd799439033");

      mockRequest.user = { _id: userId };
      mockRequest.body = { id: productId.toString() }; // Often passed as a string in requests

      const mockUser = {
        _id: userId,
        wishlist: wishlistId,
        save: jest.fn().mockResolvedValue(true),
      };

      const mockProduct = {
        _id: productId,
        name: "Test Product",
      };

      const mockWishlist = {
        _id: wishlistId,
        products: [], // Empty products array
        save: jest.fn().mockResolvedValue(true),
      };

      // Set up the mocks
      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (ProductModel.findById as jest.Mock).mockResolvedValue(mockProduct);

      // Mock the chained populate method
      const mockPopulate = jest.fn().mockResolvedValue(mockWishlist);
      (WishlistModel.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      await addToWishList(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Assuming the controller adds the productId to the wishlist products array
      // Check if it was called with the right parameters and the wishlist was saved
      expect(mockWishlist.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Product added to wishlist",
      });
    });

    it("should return 400 if product already in wishlist", async () => {
      // Create ObjectId instances
      const userId = new Types.ObjectId("507f1f77bcf86cd799439011");
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");
      const wishlistId = new Types.ObjectId("507f1f77bcf86cd799439033");

      mockRequest.user = { _id: userId };
      mockRequest.body = { id: productId.toString() }; // Often passed as a string in requests

      const mockUser = {
        _id: userId,
        wishlist: wishlistId,
      };

      const mockProduct = {
        _id: productId,
        name: "Test Product",
      };

      // The wishlist already contains the product we're trying to add
      const mockWishlist = {
        _id: wishlistId,
        products: [productId], // Already has the product ID
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
      (ProductModel.findById as jest.Mock).mockResolvedValue(mockProduct);

      const mockPopulate = jest.fn().mockResolvedValue(mockWishlist);
      (WishlistModel.findById as jest.Mock).mockReturnValue({
        populate: mockPopulate,
      });

      await addToWishList(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Product is already in the wishlist",
      });
    });
  });

  describe("removeFromWishList", () => {
    it("should remove product from wishlist successfully", async () => {
      const userId = new Types.ObjectId("507f1f77bcf86cd799439011");
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      // Setup request with params and user
      mockRequest.user = { _id: userId };
      mockRequest.params = { id: productId.toString() };

      // Create a mock wishlist with the product ID in its products array
      const mockWishlist = {
        userId: userId,
        products: [productId],
        save: jest.fn().mockResolvedValue(true),
      };

      // Mock WishlistModel.findOne to return the mock wishlist
      // Note: findOne is called with { userId: userId }, not just the wishlist ID
      (WishlistModel.findOne as jest.Mock).mockResolvedValue(mockWishlist);

      await removeFromWishList(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Verify the product was removed
      expect(mockWishlist.products.length).toBe(0);
      expect(mockWishlist.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Product removed from wishlist",
      });
    });

    it("should return 404 if wishlist not found", async () => {
      const userId = new Types.ObjectId("507f1f77bcf86cd799439011");
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: productId.toString() };

      // Mock WishlistModel.findOne to return null (wishlist not found)
      (WishlistModel.findOne as jest.Mock).mockResolvedValue(null);

      await removeFromWishList(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Wishlist not found",
      });
    });

    it("should return 400 if product not in wishlist", async () => {
      const userId = new Types.ObjectId("507f1f77bcf86cd799439011");
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      mockRequest.user = { _id: userId };
      mockRequest.params = { id: productId.toString() };

      // Create a wishlist without the product
      const mockWishlist = {
        userId: userId,
        products: [new Types.ObjectId("507f1f77bcf86cd799439099")], // Different product ID
        save: jest.fn().mockResolvedValue(true),
      };

      (WishlistModel.findOne as jest.Mock).mockResolvedValue(mockWishlist);

      await removeFromWishList(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Product not found in the wishlist",
      });
    });
  });
});
