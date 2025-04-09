import { Request, Response, NextFunction } from "express";
import UserModel from "../../models/user.model";
import AccountModel from "../../models/account.model";

import { HTTPSTATUS } from "../../config/http.config";
import { AuthenticatedRequest } from "../../types/custom.type";
import { RolesEnum } from "../../enums/roles.enum";

jest.mock("../../validators/auth.validator.ts", () => ({
  UpdateProfileSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
}));

// Mock the models
jest.mock("../../models/user.model");
jest.mock("../../models/account.model");

import {
  updateProfileHandler,
  fetchUserProfile,
  getUsers,
  getUser,
} from "../user.controller";
import { Types } from "mongoose";

describe("User Controller Tests", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let userId: Types.ObjectId;

  beforeEach(() => {
    userId = new Types.ObjectId("507f1f77bcf86cd799439011");
    mockRequest = {
      user: {
        _id: userId,
        role: [RolesEnum.ADMIN, RolesEnum.USER, RolesEnum.MANAGER],
      },
    } as unknown as AuthenticatedRequest;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("updateProfileHandler", () => {
    it("should update user profile successfully", async () => {
      // Set up request body
      mockRequest.body = {
        firstName: "Updated",
        lastName: "User",
        email: "updated@example.com",
      };

      const mockUpdatedUser = {
        _id: userId,
        firstName: "Updated",
        lastName: "User",
        email: "updated@example.com",
      };

      // Mock the findByIdAndUpdate method with the correct return value
      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(
        mockUpdatedUser
      );

      await updateProfileHandler(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // Verify the mock was called with the correct arguments
      expect(UserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        userId,
        mockRequest.body,
        { new: true }
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "User profile updated successfully",
      });
    });

    it("should return 404 if user not found", async () => {
      mockRequest.body = {
        firstName: "Updated",
        lastName: "User",
        email: "updated@example.com",
      };

      (UserModel.findByIdAndUpdate as jest.Mock).mockResolvedValue(null);

      await updateProfileHandler(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("fetchUserProfile", () => {
    it("should fetch user profile successfully", async () => {
      const mockUser = {
        _id: userId,
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        toObject: jest.fn().mockReturnValue({
          _id: userId,
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        }),
      };

      const mockAccount = {
        _id: "456",
        userId: userId,
        provider: "email",
        toObject: jest.fn().mockReturnValue({
          _id: "456",
          userId: userId,
          provider: "email",
        }),
      };

      (UserModel.findById as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(mockUser),
      }));
      (AccountModel.findOne as jest.Mock).mockResolvedValue(mockAccount);

      await fetchUserProfile(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findById).toHaveBeenCalledWith(userId);
      expect(AccountModel.findOne).toHaveBeenCalledWith({ userId: userId });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...mockUser.toObject(),
        providerInfo: mockAccount.toObject(),
      });
    });

    it("should return 404 if user not found", async () => {
      (UserModel.findById as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockResolvedValue(null),
      }));

      await fetchUserProfile(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getUsers", () => {
    it("should return all users", async () => {
      const mockUsers = [
        { _id: "1", firstName: "User 1", role: RolesEnum.USER },
        { _id: "2", firstName: "User 2", role: RolesEnum.USER },
      ];

      (UserModel.find as jest.Mock).mockResolvedValue(mockUsers);

      await getUsers(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.find).toHaveBeenCalledWith({
        role: { $nin: [RolesEnum.ADMIN, RolesEnum.MANAGER] },
      });
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
    });

    it("should return 404 if no users found", async () => {
      (UserModel.find as jest.Mock).mockResolvedValue(null);

      await getUsers(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("getUser", () => {
    it("should return a single user", async () => {
      mockRequest.params = { id: "123" };
      const mockUser = {
        _id: "123",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
      };

      (UserModel.findById as jest.Mock).mockResolvedValue(mockUser);

      await getUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findById).toHaveBeenCalledWith("123");
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
    });

    it("should return 404 if user not found", async () => {
      mockRequest.params = { id: "123" };

      (UserModel.findById as jest.Mock).mockResolvedValue(null);

      await getUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
