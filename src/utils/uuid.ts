import { v4 as uuidv4 } from "uuid";

export function generateOrderId() {
  return `${uuidv4().replace(/-/g, "").substring(0, 10)}`;
}

export function generateTrackingNumber() {
  return `${uuidv4().replace(/-/g, "").substring(0, 8)}`;
}
