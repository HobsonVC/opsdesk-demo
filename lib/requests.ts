import { Clock3, Laptop, ArrowLeftRight, ReceiptText, Ellipsis, type LucideIcon } from "lucide-react";

export const REQUEST_TYPES = ["overtime", "schedule_swap", "equipment", "refund_approval", "other"] as const;
export const REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export const TEAMS = ["Alpha", "Bravo", "Charlie", "Delta"] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const TYPE_META: Record<RequestType, { label: string; icon: LucideIcon; hasAmount: boolean }> = {
  overtime: { label: "Overtime", icon: Clock3, hasAmount: false },
  schedule_swap: { label: "Shift swap", icon: ArrowLeftRight, hasAmount: false },
  equipment: { label: "Equipment", icon: Laptop, hasAmount: true },
  refund_approval: { label: "Refund approval", icon: ReceiptText, hasAmount: true },
  other: { label: "Other", icon: Ellipsis, hasAmount: false },
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export const STATUS_SERIES = [
  { key: "approved", label: "Approved", color: "var(--success)" },
  { key: "pending", label: "Pending", color: "var(--warning)" },
  { key: "rejected", label: "Rejected", color: "var(--destructive)" },
] as const;

export function formatRef(ref: number) {
  return `REQ-${ref}`;
}
