import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../@types/custom.type";
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

    if (!orders || orders.length === 0) {
      return res.status(200).json({ message: "You have no orders" });
    }

    // Return the orders without modifying anything
    return res.status(200).json({ orders });
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

    const uniqueReference = `${userId}_${Date.now()}_${Math.random()
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
      orderId,
      shippingAddress,
      billingAddress,
      paymentMethod,
      email,
      notes,
    } = req.body;

    console.log("req.body", req.body);

    // Validate payment method
    if (!Object.values(PaymentMethodEnum).includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        error: "Invalid payment method. Must be CARD or BANK TRANSFER",
      });
    }

    // Find the draft order
    const order = await OrderModel.findOne({ _id: orderId, userId });

    console.log("order", order);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: "Order not found",
      });
    }

    console.log("Order found:", order);

    // Reset order status if previous attempt was unsuccessful
    if (
      order.orderStatus !== OrderStatusEnum.DRAFT &&
      order.paymentStatus === PaymentStatusEnum.PENDING
    ) {
      // Reset order status to DRAFT and paymentStatus to PENDING to allow retry
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

    // Save updated user with new addresses
    await user.save();

    console.log("user", user);

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

    const callbackUrl =
      config.NODE_ENV === "development"
        ? "http://localhost:3000"
        : config.FRONTEND_ORIGIN;

    // Initialize Paystack transaction based on payment method
    let paystackPayload = {
      email: email,
      amount: Math.round(order.totalAmount * 100), // Convert to kobo/cents
      reference: order.paystackReference,
      callback_url: `${callbackUrl}/orders/verify`,
      metadata: {
        orderId: orderId,
        userId: userId,
        attemptId: order.paymentAttempts,
      },
      paymentMethod: PaymentMethodEnum.BANK_TRANSFER ? "bank" : "card",
    };

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
