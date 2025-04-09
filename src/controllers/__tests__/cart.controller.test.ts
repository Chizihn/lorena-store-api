import { NextFunction, Response, Request } from "express";
import { Types } from "mongoose";

jest.mock("../../models/cart.model");

import {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
} from "../cart.controller";
import CartModel from "../../models/cart.model";
import { AuthenticatedRequest } from "../../types/custom.type";
import { HTTPSTATUS } from "../../config/http.config";

describe("Cart Controller Tests", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: { _id: new Types.ObjectId("507f1f77bcf86cd799439011") },
      body: {},
      params: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getCart", () => {
    it("should return cart with items and total amount", async () => {
      const userId = mockRequest.user?._id;

      const mockItems = [
        {
          product: {
            _id: new Types.ObjectId("507f1f77bcf86cd799439022"),
            id: "prod1",
            discountedPrice: 90,
            originalPrice: 100,
          },
          quantity: 2,
        },
        {
          product: {
            _id: new Types.ObjectId("507f1f77bcf86cd799439023"),
            id: "prod2",
            discountedPrice: null,
            originalPrice: 50,
          },
          quantity: 1,
        },
      ];

      const mockCart = {
        userId,
        items: mockItems,
      };

      // Mock the populated cart
      (CartModel.findOne as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockCart),
      }));

      await getCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Total should be (90 * 2) + (50 * 1) = 230
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        items: mockItems,
        totalAmount: 230,
      });
    });

    it("should return message when cart is not found", async () => {
      (CartModel.findOne as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      await getCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No cart found for this user",
      });
    });

    it("should return message when cart is empty", async () => {
      const mockCart = {
        userId: mockRequest.user?._id,
        items: [],
      };

      (CartModel.findOne as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockCart),
      }));

      await getCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Cart is empty",
      });
    });

    it("should call next with error on exception", async () => {
      const error = new Error("Database error");

      (CartModel.findOne as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockRejectedValue(error),
      }));

      await getCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("addToCart", () => {
    it("should create a new cart if one doesn't exist", async () => {
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      mockRequest.body = {
        product: productId.toString(),
        quantity: 2,
      };

      // Mock the saved cart that will be returned by the controller
      const mockSavedCart = {
        userId: mockRequest.user?._id,
        items: [
          {
            product: productId.toString(),
            quantity: 2,
          },
        ],
        // Don't include save function in expected result
      };

      // Mock that no cart exists
      (CartModel.findOne as jest.Mock).mockResolvedValue(null);

      // Mock the cart instance with save method
      const mockCartInstance = {
        userId: mockRequest.user?._id,
        items: [
          {
            product: productId.toString(),
            quantity: 2,
          },
        ],
        save: jest.fn().mockResolvedValue(mockSavedCart),
      };

      // Mock CartModel constructor to return our instance
      (CartModel as jest.Mocked<any>).mockImplementation(
        () => mockCartInstance
      );

      await addToCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(CartModel).toHaveBeenCalledWith({
        userId: mockRequest.user?._id,
        items: [
          {
            product: productId.toString(),
            quantity: 2,
          },
        ],
      });
      expect(mockCartInstance.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);

      // Update assertion to match what the controller actually returns
      // Since mockResponse.json is called with mockCartInstance, not mockSavedCart
      expect(mockResponse.json).toHaveBeenCalledWith(mockCartInstance);
    });

    it("should add item to existing cart if product not in cart", async () => {
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      mockRequest.body = {
        product: productId.toString(),
        quantity: 2,
      };

      const existingCartItems = [
        {
          product: new Types.ObjectId("507f1f77bcf86cd799439033"),
          quantity: 1,
        },
      ];

      const mockExistingCart = {
        userId: mockRequest.user?._id,
        items: [...existingCartItems],
        save: jest.fn().mockResolvedValue(true),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockExistingCart);

      await addToCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Check that the new item was pushed to the cart
      expect(mockExistingCart.items.length).toBe(2);
      expect(mockExistingCart.items[1].product).toBe(productId.toString());
      expect(mockExistingCart.items[1].quantity).toBe(2);
      expect(mockExistingCart.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
    });

    it("should update quantity if product already in cart", async () => {
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      mockRequest.body = {
        product: productId.toString(),
        quantity: 2,
      };

      const mockExistingCart = {
        userId: mockRequest.user?._id,
        items: [
          {
            product: productId.toString(),
            quantity: 3,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockExistingCart);

      await addToCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Check that the quantity was updated (3 + 2 = 5)
      expect(mockExistingCart.items.length).toBe(1);
      expect(mockExistingCart.items[0].quantity).toBe(5);
      expect(mockExistingCart.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
    });

    it("should call next with error on exception", async () => {
      const error = new Error("Database error");

      (CartModel.findOne as jest.Mock).mockRejectedValue(error);

      await addToCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("removeFromCart", () => {
    it("should remove item from cart", async () => {
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      mockRequest.params = { id: productId.toString() };

      const mockCart = {
        userId: mockRequest.user?._id,
        items: [
          {
            product: productId.toString(),
            quantity: 2,
          },
          {
            product: new Types.ObjectId("507f1f77bcf86cd799439033").toString(),
            quantity: 1,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      await removeFromCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Check that the item was removed from the cart
      expect(mockCart.items.length).toBe(1);
      expect(mockCart.items[0].product).toBe(
        new Types.ObjectId("507f1f77bcf86cd799439033").toString()
      );
      expect(mockCart.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockCart);
    });

    it("should return 404 if cart not found", async () => {
      (CartModel.findOne as jest.Mock).mockResolvedValue(null);

      await removeFromCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Cart not found",
      });
    });

    it("should return 404 if item not found in cart", async () => {
      const productId = new Types.ObjectId("507f1f77bcf86cd799439022");

      mockRequest.params = { id: productId.toString() };

      const mockCart = {
        userId: mockRequest.user?._id,
        items: [
          {
            product: new Types.ObjectId("507f1f77bcf86cd799439033").toString(),
            quantity: 1,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      await removeFromCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Item not found in cart",
      });
    });

    it("should call next with error on exception", async () => {
      const error = new Error("Database error");

      (CartModel.findOne as jest.Mock).mockRejectedValue(error);

      await removeFromCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe("clearCart", () => {
    it("should clear all items from cart", async () => {
      const mockCart = {
        userId: mockRequest.user?._id,
        items: [
          {
            product: new Types.ObjectId("507f1f77bcf86cd799439022").toString(),
            quantity: 2,
          },
          {
            product: new Types.ObjectId("507f1f77bcf86cd799439033").toString(),
            quantity: 1,
          },
        ],
        save: jest.fn().mockResolvedValue(true),
      };

      (CartModel.findOne as jest.Mock).mockResolvedValue(mockCart);

      await clearCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Check that the items array was cleared
      expect(mockCart.items).toEqual([]);
      expect(mockCart.save).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Cart has been cleared",
        cart: mockCart,
      });
    });

    it("should return 404 if cart not found", async () => {
      (CartModel.findOne as jest.Mock).mockResolvedValue(null);

      await clearCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Cart not found",
      });
    });

    it("should call next with error on exception", async () => {
      const error = new Error("Database error");

      (CartModel.findOne as jest.Mock).mockRejectedValue(error);

      await clearCart(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
