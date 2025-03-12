// Enum and type for product color
export const ColorEnum = {
  RED: "RED",
  BLACK: "BLACK",
  WHITE: "WHITE",
  BLUE: "BLUE",
  GREEN: "GREEN",
  YELLOW: "YELLOW",
  GRAY: "GRAY",
  PURPLE: "PURPLE",
  PINK: "PINK",
  BROWN: "BROWN",
  ORANGE: "ORANGE",
  GOLD: "GOLD",
  SILVER: "SILVER",
} as const;

export type ColorEnumType = keyof typeof ColorEnum;

// Enum and type for product sizes
export const SizeEnum = {
  XS: "XS",
  S: "S",
  M: "M",
  L: "L",
  XL: "XL",
  XXL: "XXL",
  // Add more sizes as needed
} as const;

export type SizeEnumType = keyof typeof SizeEnum;
