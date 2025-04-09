import { Request, Response } from "express";
import { UserDocument } from "../interfaces/user.interface";
import { ParsedQs } from "qs";
import { Types } from "mongoose";

interface Query extends ParsedQs {
  orderId?: string; // specify expected query parameters
  paymentMethod?: string;
  reference?: string;
}
export interface AuthenticatedRequest extends Request {
  user?: Partial<UserDocument>;
}

export interface TestRequest extends Request {
  user?: {
    _id: Types.ObjectId;
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    dob: Date | null;
    role: string[];
  };
}

export interface CustomRequest extends Request {
  query: Query;
}

export interface AnyResponse extends Response {
  customData?: any; // Custom property you want to add to the Response
}

export interface VerifyPaymentRequest extends AuthenticatedRequest {
  query: {
    reference?: string | string[];
    [key: string]: any;
  };
}
