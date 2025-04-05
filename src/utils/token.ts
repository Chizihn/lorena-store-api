import { Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/app.config";
import UserModel from "../models/user.model";
import { BadRequestException } from "./appError";
import { ErrorCodeEnum } from "../enums/error-code.enum";
import { sendEmail } from "./sendEmail";
import { HTTPSTATUS } from "../config/http.config";

export const generateToken = (userId: string, res: Response) => {
  const token = jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: false,
  });

  return token;
};

export const generateEmailVerificationOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Validates a token and returns the associated user
 */
export const validateToken = async (
  tokenField: "emailVerificationToken" | "passwordResetToken",
  tokenValue: string,
  email?: string,
  userId?: string
) => {
  const query: any = { [tokenField]: tokenValue };

  // Add either email or userId to the query based on what's provided
  if (email) query.email = email;
  if (userId) query._id = userId;

  const user = await UserModel.findOne(query);

  if (!user) {
    throw new BadRequestException(
      "Invalid token or user not found",
      ErrorCodeEnum.VALIDATION_ERROR
    );
  }

  return user;
};

/**
 * Checks if a token has expired and handles the expiration
 */
export const checkTokenExpiration = (
  tokenExpiresDate: Date,
  gracePeriodMinutes: number = 0
) => {
  const expirationWithGracePeriod = new Date(
    tokenExpiresDate.getTime() + gracePeriodMinutes * 60 * 1000
  );

  return new Date() <= expirationWithGracePeriod;
};

/**
 * Handles token regeneration and email sending
 */
export const handleTokenResend = async (
  user: any,
  tokenField: "emailVerificationToken" | "passwordResetToken",
  expiresField: "emailVerificationTokenExpires" | "passwordResetTokenExpires",
  generateTokenFn: () => string,
  emailSubject: string,
  getEmailText: (token: string, timeLeft?: string) => string
) => {
  // Check if the user has an existing token
  if (user[tokenField]) {
    const tokenExpires = user[expiresField] as Date;

    if (new Date() > tokenExpires) {
      // Token expired, generate new one
      const newToken = generateTokenFn();
      const newExpirationDate = new Date();
      newExpirationDate.setHours(newExpirationDate.getHours() + 1);

      user[tokenField] = newToken;
      user[expiresField] = newExpirationDate;

      await user.save();

      await sendEmail({
        to: user.email,
        subject: `Resent ${emailSubject}`,
        text: getEmailText(newToken),
      });

      return {
        status: HTTPSTATUS.OK,
        message: `${emailSubject} token expired. A new token has been sent to your email.`,
      };
    } else {
      // Token still valid, resend
      const timeLeft = getTimeLeftBeforeExpiration(tokenExpires);

      await sendEmail({
        to: user.email,
        subject: emailSubject,
        text: getEmailText(user[tokenField], timeLeft),
      });

      return {
        status: HTTPSTATUS.OK,
        message: `${emailSubject} token is still valid. The token has been sent to your email.`,
      };
    }
  } else {
    // No token exists, generate new one
    const newToken = generateTokenFn();
    const newExpirationDate = new Date();
    newExpirationDate.setHours(newExpirationDate.getHours() + 1);

    user[tokenField] = newToken;
    user[expiresField] = newExpirationDate;

    await user.save();

    await sendEmail({
      to: user.email,
      subject: emailSubject,
      text: getEmailText(newToken),
    });

    return {
      status: HTTPSTATUS.OK,
      message: `No existing token found. A new token has been sent to your email.`,
    };
  }
};
