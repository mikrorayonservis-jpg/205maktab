import type { NewsStatus } from "@/server/news";

export const STATUS_TONE: Record<NewsStatus, "neutral" | "warning" | "primary" | "success" | "danger"> = {
  draft: "neutral",
  pending: "warning",
  approved: "primary",
  published: "success",
  archived: "danger",
};
