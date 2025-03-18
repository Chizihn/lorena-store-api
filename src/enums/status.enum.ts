export const UserStatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDEND: "SUSPENDED",
} as const;

export type UserStatusEnumType = keyof typeof UserStatusEnum;

export const OrderStatusEnum = {
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  DRAFT: "DRAFT",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
} as const;

export type OrderStatusEnumType = keyof typeof OrderStatusEnum;

export const PaymentStatusEnum = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
} as const;

export type PaymentStatusEnumType = keyof typeof PaymentStatusEnum;
