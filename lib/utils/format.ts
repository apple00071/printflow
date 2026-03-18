import { format } from "date-fns";

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: Date | string | number) => {
  try {
    return format(new Date(date), "dd/MM/yyyy");
  } catch {
    return String(date); // Assuming dateStr was a typo and meant to return the original date as a string
  }
};

export function formatDateTime(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString();
  } catch {
    return dateStr;
  }
}
