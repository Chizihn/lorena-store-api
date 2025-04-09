import { Request, Response, NextFunction } from "express";

import OrderModel from "../../models/order.model";
import ProductModel from "../../models/product.model";
import UserModel from "../../models/user.model";
import CartModel from "../../models/cart.model";
import { HTTPSTATUS } from "../../config/http.config";
import { AuthenticatedRequest } from "../../types/custom.type";
import { Types } from "mongoose";
import axios from "axios";
import { RolesEnum } from "../../enums/roles.enum";

jest.mock("../../validators/order.validator", () => ({
  OrderSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
}));

// Mock the models and axios
jest.mock("../../models/order.model");
jest.mock("../../models/product.model");
jest.mock("../../models/user.model");
jest.mock("../../models/cart.model");
jest.mock("axios");
jest.mock("crypto");

import {
  getOrders,
  updateOutOfStockProducts,
  getSingleOrder,
  createOrder,
  checkout,
  paystackWebhook,
  checkOrderStatusAndVerifyPayment,
} from "../order.controller";
import { OrderStatusEnum, PaymentStatusEnum } from "../../enums/status.enum";

describe("Order Controller Tests", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let userId: Types.ObjectId;

  beforeEach(() => {
    userId = new Types.ObjectId("507f1f77bcf86cd799439011");
    mockRequest = {
      user: {
        _id: userId,
        id: userId.toString(), // Keep id for backward compatibility
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        role: [RolesEnum.ADMIN],
      },
      params: {},
      body: {},
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Getting all orders //

  describe("getOrders", () => {
    it("should return user's orders", async () => {
      const mockOrders = [
        {
          _id: new Types.ObjectId("507f1f77bcf86cd799439012"),
          userId: userId, // Use the consistent userId
          items: [
            {
              product: {
                _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
                name: "New Product",
                image: "test.jpg",
                stock: "10",
                originalPrice: "100",
                discountedPrice: "100",
                description: "Test description",
                slug: "test-1",
                category: "cat1",
              },
              quantity: 2,
            },
          ],
        },
      ];

      (OrderModel.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockOrders),
      }));

      await getOrders(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        orders: mockOrders,
        count: mockOrders.length,
      });
    });

    it("should return empty array if no orders found", async () => {
      (OrderModel.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue([]),
      }));

      await getOrders(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        orders: [],
        count: 0,
      });
    });
  });

  // Update out of stock  //
  describe("updateOutOfStockProducts", () => {
    it("should update out of stock products", async () => {
      const productId = new Types.ObjectId("507f1f77bcf86cd799439011");
      const mockOrders = [
        {
          items: [
            {
              product: {
                _id: productId,
                name: "New Product",
                image: "test.jpg",
                stock: "0",
                originalPrice: "100",
                discountedPrice: "100",
                description: "Test description",
                slug: "test-1",
                category: "cat1",
              },
            },
          ],
        },
      ];

      (OrderModel.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockOrders),
      }));

      (ProductModel.updateOne as jest.Mock).mockResolvedValue({
        modifiedCount: 1,
      });

      await updateOutOfStockProducts(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(ProductModel.updateOne).toHaveBeenCalledWith(
        { _id: productId },
        { $set: { outOfStock: true, stock: 0 } }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Out of stock products updated",
        updatedCount: 1,
        updatedProductIds: [productId],
      });
    });

    it("should return message if no products need updating", async () => {
      const mockOrders = [
        {
          items: [
            {
              product: {
                _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
                name: "New Product",
                image: "test.jpg",
                stock: "5",
                originalPrice: "100",
                discountedPrice: "100",
                description: "Test description",
                slug: "test-1",
                category: "cat1",
              },
            },
          ],
        },
      ];

      (OrderModel.find as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockOrders),
      }));

      await updateOutOfStockProducts(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No products needed updating",
      });
    });
  });

  // Getting single //
  describe("getSingleOrder", () => {
    it("should return a single order", async () => {
      const orderId = new Types.ObjectId("507f1f77bcf86cd799439012");
      const mockOrder = {
        _id: orderId,
        items: [
          {
            product: {
              _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
              name: "New Product",
              image: "test.jpg",
              stock: "10",
              originalPrice: "100",
              discountedPrice: "100",
              description: "Test description",
              slug: "test-1",
              category: "cat1",
            },
            quantity: 2,
          },
        ],
      };

      mockRequest.params = { id: orderId.toString() };

      (OrderModel.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(mockOrder),
      }));

      await getSingleOrder(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(OrderModel.findById).toHaveBeenCalledWith(orderId.toString());
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ order: mockOrder });
    });

    it("should return 404 if order not found", async () => {
      const orderId = new Types.ObjectId("507f1f77bcf86cd799439012");
      mockRequest.params = { id: orderId.toString() };

      (OrderModel.findById as jest.Mock).mockImplementation(() => ({
        populate: jest.fn().mockResolvedValue(null),
      }));

      await getSingleOrder(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(OrderModel.findById).toHaveBeenCalledWith(orderId.toString());
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Order not found",
      });
    });
  });

  describe("createOrder", () => {
    it("should create a new order", async () => {
      const productId = new Types.ObjectId("507f1f77bcf86cd799439011"); // Valid 24-character ObjectId
      const orderId = new Types.ObjectId("507f1f77bcf86cd799439012"); // Another valid ObjectId

      const mockProduct = {
        _id: productId,
        name: "New Product",
        image: "test.jpg",
        stock: "10",
        originalPrice: "100",
        discountedPrice: "100",
        description: "Test description",
        slug: "test-1",
        category: "cat1",
      };

      const mockOrder = {
        _id: orderId,
        userId: userId,
        items: [
          {
            product: mockProduct,
            quantity: 2,
          },
        ],
        totalAmount: 200,
        paymentStatus: PaymentStatusEnum.PENDING,
        orderStatus: OrderStatusEnum.DRAFT,
      };

      mockRequest.body = {
        items: [
          {
            product_id: productId,
            quantity: 2,
          },
        ],
        totalAmount: 200,
      };

      (ProductModel.findById as jest.Mock).mockResolvedValue(mockProduct);

      // Mock the OrderModel constructor and save method
      const mockOrderInstance = {
        save: jest.fn().mockResolvedValue(mockOrder),
      };
      (OrderModel as unknown as jest.Mock).mockImplementation(
        () => mockOrderInstance
      );

      (CartModel.findOne as jest.Mock).mockResolvedValue({
        items: [],
        save: jest.fn().mockResolvedValue(true),
      });

      await createOrder(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(ProductModel.findById).toHaveBeenCalledWith(productId);
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        message: "Order created successfully",
        order: {
          orderId: mockOrder._id,
          items: mockOrder.items,
          totalAmount: mockOrder.totalAmount,
        },
      });
    });

    it("should return 400 for invalid order data", async () => {
      mockRequest.body = {
        items: [],
        totalAmount: 200,
      };

      await createOrder(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error:
          "Invalid order data. Customer ID and at least one item required.",
      });
    });
  });

  // describe("checkout", () => {
  //   it("should initialize checkout process", async () => {
  // const productId = new Types.ObjectId("507f1f77bcf86cd799439011");
  //   const orderId = new Types.ObjectId("507f1f77bcf86cd799439012");

  //     const mockOrder = {
  //       _id: orderId,
  //       userId: userId,
  //       items: [
  //         {
  //           product: productId,
  //           quantity: 2,
  //         },
  //       ],
  //       totalAmount: 200,
  //       paymentStatus: "PENDING",
  //       orderStatus: "DRAFT",
  //       save: jest.fn().mockResolvedValue(true),
  //     };

  //     const mockUser = {
  //       _id: userId,
  //       addresses: [],
  //       save: jest.fn().mockResolvedValue(true),
  //     };

  //     mockRequest.body = {
  //       formData: {},
  //       orderId: orderId.toString(),
  //       shippingAddress: { street: "Test Street" },
  //       billingAddress: { street: "Test Street" },
  //       paymentMethod: "CARD",
  //       email: "test@example.com",
  //       notes: "Test notes",
  //     };

  //     // Fix: Use the correct query parameters
  //     (OrderModel.findOne as jest.Mock).mockResolvedValueOnce(mockOrder);
  //     (ProductModel.findById as jest.Mock).mockResolvedValue({ stock: 10 });
  //     (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);
  //     (axios.post as jest.Mock).mockResolvedValue({
  //       data: {
  //         status: true,
  //         data: {
  //           authorization_url: "https://paystack.com/pay",
  //           reference: "test_ref",
  //         },
  //       },
  //     });

  //     await checkout(
  //       mockRequest as AuthenticatedRequest,
  //       mockResponse as Response,
  //       mockNext
  //     );

  //     expect(OrderModel.findOne).toHaveBeenCalledWith({
  //       _id: orderId.toString(),
  //       userId: userId, // Fix: Include userId in expected query
  //     });
  //     expect(UserModel.findById).toHaveBeenCalledWith(userId);
  //     expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  //     expect(mockResponse.json).toHaveBeenCalledWith({
  //       success: true,
  //       message: "Checkout initialized",
  //       paymentUrl: "https://paystack.com/pay",
  //       reference: "test_ref",
  //       paymentMethod: "CARD",
  //       attemptNumber: 1,
  //     });
  //   });

  //   it("should return 400 for invalid payment method", async () => {
  //     const orderId = new Types.ObjectId();

  //     mockRequest.body = {
  //       formData: {},
  //       orderId: orderId.toString(),
  //       shippingAddress: { street: "Test Street" },
  //       billingAddress: { street: "Test Street" },
  //       paymentMethod: "INVALID",
  //       email: "test@example.com",
  //       notes: "Test notes",
  //     };

  //     // No need to mock OrderModel.findOne since it should fail before that

  //     await checkout(
  //       mockRequest as AuthenticatedRequest,
  //       mockResponse as Response,
  //       mockNext
  //     );

  //     expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.BAD_REQUEST);
  //     expect(mockResponse.json).toHaveBeenCalledWith({
  //       success: false,
  //       error: "Invalid payment method. Must be CARD or BANK TRANSFER",
  //     });
  //   });
  // });

  // describe("paystackWebhook", () => {
  //   it("should handle successful payment webhook", async () => {
  //     const orderId = new Types.ObjectId();
  //     const productId = new Types.ObjectId();

  //     const mockOrder = {
  //       _id: orderId,
  //       items: [
  //         {
  //           product: productId,
  //           quantity: 2,
  //         },
  //       ],
  //       paymentStatus: "PENDING",
  //       orderStatus: "DRAFT",
  //       save: jest.fn().mockResolvedValue(true),
  //     };

  //     mockRequest.body = {
  //       event: "charge.success",
  //       data: {
  //         reference: "test_ref",
  //         metadata: {
  //           orderId: orderId.toString(),
  //           userId: userId.toString(),
  //         },
  //       },
  //     };

  //     mockRequest.headers = {
  //       "x-paystack-signature": "valid_signature",
  //     };

  //     // Fix: Mock the crypto hash calculation
  //     jest.spyOn(crypto, "getRandomValues").mockReturnValue({
  //       update: jest.fn().mockReturnThis(),
  //       digest: jest.fn().mockReturnValue("valid_signature"),
  //     } as any);

  //     (OrderModel.findById as jest.Mock).mockResolvedValue(mockOrder);
  //     (ProductModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

  //     await paystackWebhook(
  //       mockRequest as any,
  //       mockResponse as Response,
  //       mockNext
  //     );

  //     expect(OrderModel.findById).toHaveBeenCalledWith(orderId.toString());
  //     expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  //     expect(mockResponse.send).toHaveBeenCalledWith("Webhook received");
  //   });

  //   it("should handle invalid signature", async () => {
  //     const orderId = new Types.ObjectId();

  //     mockRequest.body = {
  //       event: "charge.success",
  //       data: {
  //         reference: "test_ref",
  //         metadata: {
  //           orderId: orderId.toString(),
  //           userId: userId.toString(),
  //         },
  //       },
  //     };

  //     mockRequest.headers = {
  //       "x-paystack-signature": "invalid_signature",
  //     };

  //     await paystackWebhook(
  //       mockRequest as any,
  //       mockResponse as Response,
  //       mockNext
  //     );

  //     expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.UNAUTHORIZED);
  //     expect(mockResponse.json).toHaveBeenCalledWith({
  //       status: "error",
  //       message: "Invalid signature",
  //     });
  //   });
  // });

  // describe("checkOrderStatusAndVerifyPayment", () => {
  //   it("should verify payment and update order status", async () => {
  //     const orderId = new Types.ObjectId();
  //     const productId = new Types.ObjectId();

  //     const mockOrder = {
  //       _id: orderId,
  //       userId: userId,
  //       paymentStatus: "PENDING",
  //       paystackReference: "test_ref",
  //       items: [
  //         {
  //           product: productId,
  //           quantity: 2,
  //         },
  //       ],
  //       save: jest.fn().mockResolvedValue(true),
  //     };

  //     mockRequest.params = { id: orderId.toString() };

  //     (OrderModel.findOne as jest.Mock).mockResolvedValue(mockOrder);
  //     (axios.get as jest.Mock).mockResolvedValue({
  //       data: {
  //         status: true,
  //         data: {
  //           status: "success",
  //         },
  //       },
  //     });
  //     (ProductModel.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

  //     await checkOrderStatusAndVerifyPayment(
  //       mockRequest as AuthenticatedRequest,
  //       mockResponse as Response,
  //       mockNext
  //     );

  //     expect(OrderModel.findOne).toHaveBeenCalledWith({
  //       _id: orderId.toString(),
  //       userId: userId,
  //     });
  //     expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
  //     expect(mockResponse.json).toHaveBeenCalledWith({
  //       success: true,
  //       order: expect.any(Object),
  //     });
  //   });

  //   it("should return 404 if order not found", async () => {
  //     const orderId = new Types.ObjectId();

  //     mockRequest.params = { id: orderId.toString() };

  //     (OrderModel.findOne as jest.Mock).mockResolvedValue(null);

  //     await checkOrderStatusAndVerifyPayment(
  //       mockRequest as AuthenticatedRequest,
  //       mockResponse as Response,
  //       mockNext
  //     );

  //     expect(OrderModel.findOne).toHaveBeenCalledWith({
  //       _id: orderId.toString(),
  //       userId: userId,
  //     });
  //     expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
  //     expect(mockResponse.json).toHaveBeenCalledWith({
  //       success: false,
  //       error: "Order not found",
  //     });
  //   });
  // });

  // ####
});
