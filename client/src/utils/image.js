// Asks Cloudinary for the best format and quality for the visitor's browser. Other URLs are returned untouched.
export const optimizeImage = (url) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/image/upload/")) return url;
  const [head, tail] = url.split("/image/upload/");
  if (/^(?:[a-z]{1,3}_[^/]+,?)+\//.test(tail)) return url; // already carries a transformation
  return `${head}/image/upload/f_auto,q_auto/${tail}`;
};
