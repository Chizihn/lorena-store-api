import { NextFunction, Response } from "express";
import {
  AuthenticatedRequest,
  VerifyPaymentRequest,
} from "../@types/custom.type";
import OrderModel, {
  OrderItemDocument,
  PaymentMethodEnum,
} from "../models/order.model";
import ProductModel from "../models/product.model";
import { OrderStatusEnum, PaymentStatusEnum } from "../enums/status.enum";
import axios from "axios";
import CartModel from "../models/cart.model";
import { config } from "../config/app.config";
import UserModel from "../models/user.model";
import crypto from "crypto";
import { NotFoundException } from "../utils/appError";
import { ErrorCodeEnum } from "../enums/error-code.enum";
import { generateTrackingNumber } from "../utils/uuid";

// Function for fetching orders only
export const getOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    // Fetch the orders for the user
    const orders = await OrderModel.find({ userId }).populate({
      path: "items.product",
      model: "Product",
      select: "discountedPrice originalPrice name image stock",
    });

    // Instead of throwing an error, just return an empty array
    return res.status(200).json({
      orders: orders || [],
      count: orders.length,
    });
  } catch (error) {
    next(error);
  }
};

// Separate function for updating product stock
export const updateOutOfStockProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;

    // Fetch the orders for the user, focusing only on products
    const orders = await OrderModel.find({ userId }).populate({
      path: "items.product",
      model: "Product",
      select: "_id stock",
    });

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "No products to update" });
    }

    // Track products that were updated
    const updatedProducts = [];

    // Check for out-of-stock products and update them
    const productUpdates = [];
    for (const order of orders) {
      for (const item of order.items) {
        const product = item.product;
        if (product && product.stock <= 0) {
          updatedProducts.push(product._id);
          productUpdates.push(
            ProductModel.updateOne({ _id: product._id }, { $set: { stock: 0 } })
          );
        }
      }
    }

    // Execute all updates in parallel
    if (productUpdates.length > 0) {
      await Promise.all(productUpdates);
      return res.status(200).json({
        message: "Out of stock products updated",
        updatedCount: productUpdates.length,
        updatedProductIds: updatedProducts,
      });
    } else {
      return res.status(200).json({ message: "No products needed updating" });
    }
  } catch (error) {
    next(error);
  }
};

export const getSingleOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    console.log("userid", userId);

    const order = await OrderModel.findById(req.params.id).populate({
      path: "items.product",
      model: "Product",
      select: "discountedPrice originalPrice name image", // Include any other fields you need
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    return res.status(200).json({ order });
  } catch (error) {
    next(error);
  }
};

// export const createOrder =  async (
//     req: AuthenticatedRequest,
//     res: Response,
//     next: NextFunction
//   ) =>  {
//   const userId = req.user?._id;

//       try {
//         const {items, totalAmount} = req.body;

//         const orders = await OrderModel.findOne({userId});

//         if (!userId || !items || !Array.isArray(items) || items.length === 0) {
//             return res.status(400).json({
//               success: false,
//               error: 'Invalid order data. Customer ID and at least one item required.'
//             });
//           }

//           const orderItems: OrderItemDocument[] = []

//        for (const item of items) {
//         const product = await ProductModel.findById(item.product_id);

//         if (!product) {
//             return res.status(404).json({
//               success: false,
//               error: `Product with ID ${item.product._id} not found`
//             });
//           }

//           if (product.stock < item.quantity) {
//             return res.status(400).json({
//               success: false,
//               error: `Insufficient stock for product ${product.name}. Available: ${product.stock}`
//             });
//           }

//     orderItems.push({
//             product: product.id,
//             quantity: item.quantity,
//           });

//        }

//        const newOrder: OrderDocument = {
//         ...orders,
//         items: orderItems,
//         totalAmount: totalAmount,
//        }

//       } catch (error) {
//           next(error)
//       }
//   }

export const createOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?._id;
  console.log("userid", userId);

  try {
    const { items, totalAmount } = req.body;
    console.log("items", items);
    console.log("titoalmaou", totalAmount);

    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error:
          "Invalid order data. Customer ID and at least one item required.",
      });
    }

    const orderItems: OrderItemDocument[] = [];

    // Validate products and quantities
    for (const item of items) {
      const product = await ProductModel.findById(item.product_id);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product with ID ${item.product_id} not found`,
        });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          error: `Insufficient stock for product ${product.name}. Available: ${product.stock}`,
        });
      }

      orderItems.push({
        product: product,
        quantity: item.quantity,
      });
    }

    // Optional: Verify the total amount
    //   if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
    //     return res.status(400).json({
    //       success: false,
    //       error: 'Total amount does not match the sum of item prices.'
    //     });
    //   }

    const uniqueReference = `${userId}_${Date.now()}${Math.random()
      .toString(36)
      .substring(2)}`;

    // Create a draft order
    const newOrder = new OrderModel({
      userId,
      items: orderItems,
      totalAmount,
      paymentStatus: PaymentStatusEnum.PENDING,
      orderStatus: OrderStatusEnum.DRAFT,
      paystackReference: uniqueReference,
    });

    // Save the draft order
    const savedOrder = await newOrder.save();

    const cart = await CartModel.findOne({ userId });

    if (cart) {
      cart.items = []; // Clear the cart items
      await cart.save();
    }

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: {
        orderId: savedOrder._id,
        items: savedOrder.items,
        totalAmount: savedOrder.totalAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const checkout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.user?._id;

  console.log("userid", userId);

  try {
    const {
      formData,
      orderId,
      shippingAddress,
      billingAddress,
      paymentMethod,
      email,
      notes,
    } = req.body;

    // Validate payment method
    if (!Object.values(PaymentMethodEnum).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment method. Must be CARD or BANK TRANSFER",
      });
    }

    // Find the draft order
    const order = await OrderModel.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // Check if all products in the order are in stock
    const outOfStockItems = [];
    for (const item of order.items) {
      const product = await ProductModel.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          error: `Product with ID ${item.product} not found`,
        });
      }

      // Check if product stock is sufficient
      if (product.stock < item.quantity) {
        outOfStockItems.push({
          productId: item.product,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock: product.stock,
        });
      }
    }

    // If any products are out of stock, return an error
    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Some products are out of stock",
        outOfStockItems: outOfStockItems,
      });
    }

    if (order.paymentStatus === PaymentStatusEnum.PENDING) {
      order.orderStatus = OrderStatusEnum.DRAFT;
      order.paymentStatus = PaymentStatusEnum.PENDING;
      order.paymentMethod = null;
      await order.save();
    }

    // Ensure totalAmount is not null or undefined
    if (!order.totalAmount) {
      return res.status(400).json({
        success: false,
        error: "Order total amount is missing",
      });
    }

    // Add or update shipping address in user's addresses
    const user = await UserModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
      });
    }

    // Add shipping address to user's addresses array if it's not already there
    if (
      !user.addresses.some((addr) => addr.street === shippingAddress.street)
    ) {
      user.addresses.push(shippingAddress);
    }

    // Add billing address to user's addresses array if it's not already there
    if (!user.addresses.some((addr) => addr.street === billingAddress.street)) {
      user.addresses.push(billingAddress);
    }

    Object.assign(user, formData);

    // Save updated user with new addresses
    await user.save();

    // Update order with checkout details
    order.shippingAddress = shippingAddress;
    order.billingAddress = billingAddress;
    order.paymentMethod = paymentMethod;
    order.notes = notes;
    order.orderStatus = OrderStatusEnum.AWAITING_PAYMENT;

    // Increment payment attempts counter
    order.paymentAttempts = order.paymentAttempts
      ? order.paymentAttempts + 1
      : 1;

    // Generate a unique reference for each payment attempt
    const newUniqueReference = `${order.paystackReference}${order.paymentAttempts}`;

    //Calback url
    const callbackUrl =
      config.NODE_ENV === "development"
        ? "http://localhost:3000"
        : config.FRONTEND_ORIGIN;

    // Initialize Paystack transaction based on payment method
    let paystackPayload = {
      email: email,
      amount: Math.round(order.totalAmount * 100), // Convert to kobo/cents
      reference: newUniqueReference,
      callback_url: `${callbackUrl}/orders/confirmation?orderId=${order._id}`,
      metadata: {
        orderId: orderId,
        userId: userId,
        attemptId: order.paymentAttempts,
      },
      // Use channels array to specify available payment methods
      channels:
        paymentMethod === PaymentMethodEnum.BANK_TRANSFER
          ? ["bank_transfer"] // Transfer first if user selected transfer
          : ["card"], // Card first if user selected card
    };

    console.log("callbackurl", paystackPayload.callback_url);

    // Make the request to Paystack API
    const paystackResponse = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      paystackPayload,
      {
        headers: {
          Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (paystackResponse.data.status) {
      // Store the Paystack reference in the order
      order.paystackReference = paystackResponse.data.data.reference;

      // Save updated order
      await order.save();

      return res.status(200).json({
        success: true,
        message: "Checkout initialized",
        paymentUrl: paystackResponse.data.data.authorization_url,
        reference: paystackResponse.data.data.reference,
        paymentMethod: paymentMethod,
        attemptNumber: order.paymentAttempts,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Failed to initialize payment",
      });
    }
  } catch (error) {
    console.error("Error during checkout:", error);
    next(error); // Pass the error to the next middleware (error handler)
  }
};

export const paystackWebhook = async (
  req: VerifyPaymentRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Verify that the request is from Paystack
    const hash = crypto
      .createHmac("sha512", config.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid signature" });
    }

    // Get event type and data
    const event = req.body;

    // Handle the event based on type
    if (event?.event === "charge.success") {
      const reference = event.data.reference;
      const paymentData = event.data;

      // Extract metadata from the payment
      const { orderId, userId } = paymentData.metadata;

      // Find the order using the orderId
      const order = await OrderModel.findById(orderId);

      if (!order) {
        console.error("Order not found for reference:", reference);
        return res.status(200).send("Webhook received"); // Return 200 to acknowledge receipt
      }

      // Update order status
      order.paymentStatus = PaymentStatusEnum.PAID;
      order.orderStatus = OrderStatusEnum.PROCESSING;
      await order.save();

      // Update product inventory based on the order items
      for (const item of order.items) {
        await ProductModel.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      console.log(`Payment verified and order ${orderId} updated to PAID`);
    }

    // Always return 200 for webhooks to acknowledge receipt
    return res.status(200).send("Webhook received");
  } catch (error) {
    next(error);
    return res.status(200).send("Webhook received");
  }
};

export const checkOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    const { orderId } = req.params;

    // Find the order for this user
    const order = await OrderModel.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    // If payment is still pending and we have a reference, check Paystack
    if (
      order.paymentStatus === PaymentStatusEnum.PENDING &&
      order.paystackReference
    ) {
      try {
        // Verify the payment with Paystack
        const verificationResponse = await axios.get(
          `https://api.paystack.co/transaction/verify/${order.paystackReference}`,
          {
            headers: {
              Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        const paymentData = verificationResponse.data.data;

        // Update order if payment was successful
        if (
          verificationResponse.data.status &&
          paymentData.status === "success"
        ) {
          order.paymentStatus = PaymentStatusEnum.PAID;
          order.orderStatus = OrderStatusEnum.PROCESSING;
          await order.save();

          // Update product inventory
          for (const item of order.items) {
            await ProductModel.findByIdAndUpdate(item.product, {
              $inc: { stock: -item.quantity },
            });
          }
        }
      } catch (error) {
        console.error("Error verifying payment with Paystack:", error);
        // Don't fail the request, just continue with the current order status
      }
    }

    // Return the order with its current status
    return res.status(200).json({
      success: true,
      order: {
        _id: order._id,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        items: order.items,
        // Include other fields you want to return
      },
    });
  } catch (error) {
    console.error("Error checking order status:", error);
    next(error);
  }
};

export const verifyPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    const reference = req.params?.id;

    console.log("Reference:", reference);

    if (!reference) {
      return res.status(400).json({
        success: false,
        error: "Reference parameter is required",
      });
    }

    // Verify the payment with Paystack
    const verificationResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    // console.log("Verification Response:", verificationResponse);

    const paymentData = verificationResponse.data.data;

    if (verificationResponse.data.status && paymentData.status === "success") {
      // Payment was successful
      const orderId = paymentData.metadata.orderId;

      // Fetch the order using the orderId
      const order = await OrderModel.findOne({ _id: orderId, userId });

      if (!order) {
        return res.status(404).json({
          success: false,
          error: "Order not found",
        });
      }

      // Update order status to paid
      order.paymentStatus = PaymentStatusEnum.PAID;
      order.orderStatus = OrderStatusEnum.PROCESSING;

      await order.save();

      // Update product inventory based on the order items
      for (const item of order.items) {
        await ProductModel.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      // Return success status and the order ID
      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
        orderId: orderId,
      });
    } else {
      // Payment failed
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
        reference: reference,
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    next(error);
  }
};

export const checkOrderStatusAndVerifyPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    const orderId = req.params?.id;

    console.log("orderid", orderId);

    // Fetch the order for this user
    const order = await OrderModel.findOne({ _id: orderId, userId });

    console.log("order", order);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    if (
      order.paymentStatus === PaymentStatusEnum.PENDING &&
      order.paystackReference
    ) {
      try {
        // Verify the payment with Paystack
        const verificationResponse = await axios.get(
          `https://api.paystack.co/transaction/verify/${order.paystackReference}`,
          {
            headers: {
              Authorization: `Bearer ${config.PAYSTACK_SECRET_KEY}`,
            },
          }
        );

        const paymentData = verificationResponse.data.data;

        const trackingNumber = generateTrackingNumber();

        // If payment was successful, update the order
        if (
          verificationResponse.data.status &&
          paymentData.status === "success"
        ) {
          order.paymentStatus = PaymentStatusEnum.PAID;
          order.orderStatus = OrderStatusEnum.PROCESSING;
          order.isConfirmed = true;
          order.trackingNumber = trackingNumber;

          await order.save();

          // Update product inventory
          for (const item of order.items) {
            await ProductModel.findByIdAndUpdate(item.product, {
              $inc: { stock: -item.quantity },
            });
          }
        }
      } catch (error) {
        console.error("Error verifying payment with Paystack:", error);
        // If verification fails, we continue with the existing status, just log the error.
      }
    }

    // Return the order with its current status (including payment status)
    return res.status(200).json({
      success: true,
      order: order,
    });
  } catch (error) {
    console.error("Error checking order status and verifying payment:", error);
    next(error); // Pass error to error handling middleware
  }
};
