import cloudinary from "../config/cloudinary.js";

const cloudinaryReady = () => Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

// Providers hand out small or short-lived picture links. Ask Google for a sharper copy.
const sharpen = (url) => String(url || "").replace(/=s\d+-c$/, "=s400-c");

// True when the account has no picture, or only a link that points at a provider instead of our own storage.
export const needsOwnPhoto = (user) => {
  const avatar = user?.avatar;
  if (!avatar?.url) return true;
  return !avatar.publicId && !avatar.url.includes("res.cloudinary.com");
};

// Copies a sign-in provider's profile picture into our Cloudinary so it loads everywhere (website, admin panel, chat)
// and keeps working after the provider's link expires. Falls back to the provider link if the copy cannot be made.
export const importProviderPhoto = async (pictureUrl) => {
  const source = sharpen(pictureUrl);
  if (!source) return null;
  if (!cloudinaryReady()) return { url: source, publicId: "" };
  try {
    const result = await cloudinary.uploader.upload(source, {
      folder: "snipe-and-bite/avatars",
      resource_type: "image",
      transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto" }],
    });
    return { url: result.secure_url, publicId: result.public_id };
  } catch (error) {
    console.error(`Could not copy the provider photo: ${error.message}`);
    return { url: source, publicId: "" };
  }
};
