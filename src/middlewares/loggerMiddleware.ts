import { Request, Response, NextFunction } from "express";
import Logger from "../utils/logger";

const loggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  // Log request
  Logger.info(`Incoming ${req.method} request to ${req.url}`, {
    headers: req.headers,
    query: req.query,
    body: req.body,
  });

  // Capture response data
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;

    // Log response
    Logger.info(`Response for ${req.method} ${req.url}`, {
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      body: body,
    });

    return originalSend.call(this, body);
  };

  next();
};

export default loggerMiddleware;
