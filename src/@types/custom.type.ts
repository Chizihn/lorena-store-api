import { Request, Response } from "express";
import { UserDocument } from "../interfaces/user.interface";

export interface AuthenticatedRequest extends Request {
  user?: UserDocument;
}

export interface AnyResponse extends Response {
  customData?: any; // Custom property you want to add to the Response
}
