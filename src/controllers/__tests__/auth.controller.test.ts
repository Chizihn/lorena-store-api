jest.mock("../../validators/auth.validator", () => ({
  UserSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
  CreateAccountSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
  LoginSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
  VerifyEmailSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
  ForgotPasswordSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
  ResetPasswordSchema: {
    parse: jest.fn().mockImplementation((data) => data),
  },
}));

// Mock the models
jest.mock("../../models/user.model");
jest.mock("../../models/account.model");

// Mock the email utility
jest.mock("../../utils/email", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

// Mock the token utility
jest.mock("../../utils/token", () => ({
  generateToken: jest.fn().mockReturnValue("mock-token"),
  generateEmailVerificationOtp: jest.fn().mockReturnValue("123456"),
  generateOtp: jest.fn().mockReturnValue("654321"),
}));

// Mock the bcrypt utility
jest.mock("../../utils/bcrypt", () => ({
  hashValue: jest.fn().mockResolvedValue("hashed-password"),
  compareValue: jest.fn().mockResolvedValue(true),
}));

import { Request, Response, NextFunction } from "express";
import UserModel from "../../models/user.model";
import AccountModel from "../../models/account.model";
import { HTTPSTATUS } from "../../config/http.config";
import { ProviderEnum } from "../../enums/account-provider.enum";
import { AuthenticatedRequest } from "../../types/custom.type";
import { ErrorCodeEnum } from "../../enums/error-code.enum";
import {
  createAccountHandler,
  loginHandler,
  googleLoginHandler,
  verifyEmailHandler,
  resendVerifyEmailToken,
  forgotPasswordHandler,
  verifyResetTokenHandler,
  resetPasswordHandler,
  resendResetPasswordToken,
  linkGoogleAccount,
  unlinkGoogleAccount,
} from "../auth.controller";
import { Types } from "mongoose";
import { RolesEnum } from "../../enums/roles.enum";

describe("Auth Controller Tests", () => {
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
      cookie: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createAccountHandler", () => {
    it("should create a new account successfully", async () => {
      mockRequest.body = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        _id: "123",
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        save: jest.fn().mockResolvedValue(true),
        toObject: jest.fn().mockReturnValue({
          _id: "123",
          firstName: "Test",
          lastName: "User",
          email: "test@example.com",
        }),
      };

      const mockAccount = {
        _id: "456",
        userId: "123",
        provider: ProviderEnum.EMAIL,
        providerId: "test@example.com",
        toObject: jest.fn().mockReturnValue({
          _id: "456",
          userId: "123",
          provider: ProviderEnum.EMAIL,
          providerId: "test@example.com",
        }),
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(null);
      (UserModel as jest.Mocked<any>).mockImplementation(() => mockUser);
      (AccountModel.create as jest.Mock).mockResolvedValue(mockAccount);

      await createAccountHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "User account created successfully",
        token: "mock-token",
        user: expect.any(Object),
      });
    });

    it("should return 409 if user already exists", async () => {
      mockRequest.body = {
        firstName: "Test",
        lastName: "User",
        email: "test@example.com",
        password: "password123",
      };

      const existingUser = {
        _id: "123",
        email: "test@example.com",
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(existingUser);

      await createAccountHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("loginHandler", () => {
    it("should login user successfully", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };

      const mockUser = {
        _id: "123",
        email: "test@example.com",
        password: "hashed-password",
        toObject: jest.fn().mockReturnValue({
          _id: "123",
          email: "test@example.com",
        }),
      };

      const mockAccount = {
        _id: "456",
        userId: "123",
        provider: ProviderEnum.EMAIL,
        providerId: "test@example.com",
        toObject: jest.fn().mockReturnValue({
          _id: "456",
          userId: "123",
          provider: ProviderEnum.EMAIL,
          providerId: "test@example.com",
        }),
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (AccountModel.findOne as jest.Mock).mockResolvedValue(mockAccount);

      await loginHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Login successful",
        token: "mock-token",
        user: expect.any(Object),
        account: mockAccount,
      });
    });

    it("should return 400 for invalid credentials", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockUser = {
        _id: "123",
        email: "test@example.com",
        password: "hashed-password",
      };

      const mockAccount = {
        _id: "456",
        userId: "123",
        provider: ProviderEnum.EMAIL,
        providerId: "test@example.com",
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);
      (AccountModel.findOne as jest.Mock).mockResolvedValue(mockAccount);
      (
        require("../../utils/bcrypt").compareValue as jest.Mock
      ).mockResolvedValue(false);

      await loginHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid credentials",
      });
    });
  });

  describe("verifyEmailHandler", () => {
    it("should verify email successfully", async () => {
      // Setup request with just the token
      mockRequest.body = { token: "123456" };

      const mockUser = {
        _id: userId,
        email: "john@example.com",
        emailVerified: false,
        emailVerificationToken: "123456",
        emailVerificationTokenExpires: new Date(Date.now() + 3600000),
      };

      // Mock findOne to return our test user
      (UserModel.findOne as jest.Mock).mockResolvedValueOnce(mockUser);

      // Mock findOneAndUpdate for BOTH potential calls
      (UserModel.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({
        ...mockUser,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationTokenExpires: null,
      });

      await verifyEmailHandler(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      // First check that findOne was called correctly
      expect(UserModel.findOne).toHaveBeenCalledWith({
        emailVerificationToken: "123456",
        _id: userId,
      });

      // Now check the last findOneAndUpdate call
      const lastFindOneAndUpdateCall = (UserModel.findOneAndUpdate as jest.Mock)
        .mock.calls[0];
      expect(lastFindOneAndUpdateCall[0]).toEqual({ _id: userId });
      expect(lastFindOneAndUpdateCall[1]).toEqual({
        $set: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpires: null,
        },
      });
      expect(lastFindOneAndUpdateCall[2]).toEqual({ new: true });

      // Check response
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Email verified successfully",
      });
    });

    it("should return 400 for invalid token", async () => {
      mockRequest.body = { email: "test@example.com", token: "invalid" };

      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      await verifyEmailHandler(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        emailVerificationToken: "invalid",
        _id: userId,
      });

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Invalid verification token",
      });
    });
  });

  describe("linkGoogleAccount", () => {
    it("should link Google account successfully", async () => {
      mockRequest.user = { _id: "123" };
      mockRequest.body = {
        providerId: "google123",
        refreshToken: "refresh-token",
      };

      (AccountModel.findOne as jest.Mock).mockResolvedValue(null);
      (AccountModel.create as jest.Mock).mockResolvedValue({
        provider: "GOOGLE",
        providerId: "google123",
      });

      await linkGoogleAccount(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: {
          account: {
            provider: "GOOGLE",
            providerId: "google123",
          },
        },
      });
    });

    it("should return 400 if Google account already linked", async () => {
      mockRequest.user = { _id: "123" };
      mockRequest.body = {
        providerId: "google123",
      };

      (AccountModel.findOne as jest.Mock).mockResolvedValue({
        provider: "GOOGLE",
        providerId: "google123",
      });

      await linkGoogleAccount(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "fail",
        message: "This Google account is already linked to another user",
      });
    });
  });

  describe("unlinkGoogleAccount", () => {
    it("should unlink Google account successfully", async () => {
      mockRequest.user = { _id: "123" };

      (AccountModel.findOneAndDelete as jest.Mock).mockResolvedValue({
        provider: "GOOGLE",
      });

      await unlinkGoogleAccount(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: null,
      });
    });

    it("should return 404 if no linked Google account found", async () => {
      mockRequest.user = { _id: "123" };

      (AccountModel.findOneAndDelete as jest.Mock).mockResolvedValue(null);

      await unlinkGoogleAccount(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "fail",
        message: "No linked Google account found",
      });
    });
  });

  describe("forgotPasswordHandler", () => {
    it("should send password reset email successfully", async () => {
      mockRequest.body = { email: "test@example.com" };

      const mockUser = {
        _id: "123",
        email: "test@example.com",
        save: jest.fn().mockResolvedValue(true),
      };

      // Fix: Mock ForgotPasswordSchema.parse
      jest.mock("../../validators/auth.validator", () => ({
        ...jest.requireActual("../../validators/auth.validator"),
        ForgotPasswordSchema: {
          parse: jest.fn().mockImplementation((data) => data),
        },
      }));

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      await forgotPasswordHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Password reset token sent successfully.",
      });
    });

    it("should return 404 if user not found", async () => {
      mockRequest.body = { email: "nonexistent@example.com" };

      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      await forgotPasswordHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: ErrorCodeEnum.AUTH_USER_NOT_FOUND,
      });
    });
  });

  describe("resetPasswordHandler", () => {
    it("should reset password successfully", async () => {
      mockRequest.body = {
        email: "test@example.com",
        token: "654321",
        newPassword: "newpassword123",
      };

      const mockUser = {
        _id: "123",
        email: "test@example.com",
        passwordResetToken: "654321",
        passwordResetTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
        save: jest.fn().mockResolvedValue(true),
      };

      // Fix: Mock ResetPasswordSchema.parse
      jest.mock("../../validators/auth.validator", () => ({
        ...jest.requireActual("../../validators/auth.validator"),
        ResetPasswordSchema: {
          parse: jest.fn().mockImplementation((data) => data),
        },
      }));

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      await resetPasswordHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(mockResponse.status).toHaveBeenCalledWith(HTTPSTATUS.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Password reset successfully!",
      });
    });

    it("should return 404 if user not found", async () => {
      mockRequest.body = {
        email: "nonexistent@example.com",
        token: "654321",
        newPassword: "newpassword123",
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(null);

      await resetPasswordHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should return 400 if token is invalid", async () => {
      mockRequest.body = {
        email: "test@example.com",
        token: "invalid-token",
        newPassword: "newpassword123",
      };

      const mockUser = {
        _id: "123",
        email: "test@example.com",
        passwordResetToken: "654321", // Different from the token in request
        passwordResetTokenExpires: new Date(Date.now() + 15 * 60 * 1000),
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      await resetPasswordHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should return 400 if token is expired", async () => {
      mockRequest.body = {
        email: "test@example.com",
        token: "654321",
        newPassword: "newpassword123",
      };

      const mockUser = {
        _id: "123",
        email: "test@example.com",
        passwordResetToken: "654321",
        passwordResetTokenExpires: new Date(Date.now() - 15 * 60 * 1000), // Expired token
      };

      (UserModel.findOne as jest.Mock).mockResolvedValue(mockUser);

      await resetPasswordHandler(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
