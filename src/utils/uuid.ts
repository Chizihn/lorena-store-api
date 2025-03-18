import { v4 as uuidv4 } from "uuid";

export function generateOrderId() {
  return `order-${uuidv4().replace(/-/g, "").substring(0, 10)}`;
}
