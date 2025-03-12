export const StatusEnum = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDENT: "SUSPENDED",
} as const;

export type StatusEnumType = keyof typeof StatusEnum;
