import { z } from "zod";

const formDataSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

// Schema for the entire request body
export const checkoutSchema = z.object({
  formData: formDataSchema.optional(),
  orderId: z.string().min(1, "Order ID is required"),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    isDefault: z.boolean(),
  }),
  billingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    isDefault: z.boolean(),
  }),
  paymentMethod: z.enum(["CARD", "BANK_TRANSFER"]),
  email: z.string().email(),
  notes: z.string().optional(),
  trackingNumber: z.string().optional(),
});
