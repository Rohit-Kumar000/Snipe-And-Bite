const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Formats a number as Indian rupees, for example 1234.5 becomes ₹1,234.5
export const formatPrice = (value) => formatter.format(Number(value) || 0);
