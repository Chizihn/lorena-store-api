import { Request, Response, NextFunction } from "express";
import OrderModel from "../models/order.model";
import { OrderStatusEnum, PaymentStatusEnum } from "../enums/status.enum";

export const getOrderStatistics = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const totalOrders = await OrderModel.countDocuments();

    const totalPaidOrders = await OrderModel.countDocuments({
      paymentStatus: PaymentStatusEnum.PAID,
    });

    const totalPendingOrders = await OrderModel.countDocuments({
      paymentStatus: PaymentStatusEnum.PENDING,
    });

    const totalShippedOrders = await OrderModel.countDocuments({
      orderStatus: OrderStatusEnum.SHIPPED,
    });

    const totalDeliveredOrders = await OrderModel.countDocuments({
      orderStatus: OrderStatusEnum.DELIVERED,
    });

    const totalCancelledOrders = await OrderModel.countDocuments({
      orderStatus: OrderStatusEnum.CANCELLED,
    });

    res.status(200).json({
      totalOrders,
      totalPaidOrders,
      totalPendingOrders,
      totalShippedOrders,
      totalDeliveredOrders,
      totalCancelledOrders,
    });
  } catch (error) {
    next(error);
  }
};
