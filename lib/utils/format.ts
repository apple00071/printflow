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
  } catch (error) {
    return "N/A";
  }
};

export const formatDateTime = (date: Date | string | number) => {
  try {
    return format(new Date(date), "dd/MM/yyyy HH:mm");
  } catch (error) {
    return "N/A";
  }
};
