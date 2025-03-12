import { Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/app.config";

export const generateToken = (userId: string, res: Response) => {
  const token = jwt.sign({ userId }, config.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return token;
};

export const generateEmailVerificationToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const generateAuthToken = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
