const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// Example result: SB261031K7Q2 (SB + yymmdd in IST + 4 random characters).
const generateOrderNumber = () => {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const yy = String(ist.getUTCFullYear()).slice(-2);
  const mm = String(ist.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(ist.getUTCDate()).padStart(2, "0");
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return `SB${yy}${mm}${dd}${suffix}`;
};

export default generateOrderNumber;
