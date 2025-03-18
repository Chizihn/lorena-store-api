// import { NextFunction, Request, Response } from "express";

// type AsyncControllerType = (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => Promise<any>;

// export const asyncHandler =
//   (controller: AsyncControllerType): AsyncControllerType =>
//   async (req, res, next) => {
//     try {
//       await controller(req, res, next);
//     } catch (error) {
//       next(error);
//     }
//   };

import { NextFunction, Request, Response } from "express";
import { AuthenticatedRequest } from "../@types/custom.type";

type AsyncControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

type AsyncAuthControllerType = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => Promise<any>;

// Standard async handler for regular requests
export const asyncHandler =
  (controller: AsyncControllerType): AsyncControllerType =>
  async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      next(error);
    }
  };

// Special async handler for authenticated requests
export const asyncAuthHandler =
  (controller: AsyncAuthControllerType): AsyncControllerType =>
  async (req, res, next) => {
    try {
      // Cast the request to AuthenticatedRequest before passing to controller
      await controller(req as AuthenticatedRequest, res, next);
    } catch (error) {
      next(error);
    }
  };
