import { useState } from "react";
import { optimizeImage } from "../../utils/image";

// Round profile picture, with the first letter of the name as a fallback (also used when the picture fails to load).
export default function Avatar({ user, size = 36, className = "" }) {
  const [failedUrl, setFailedUrl] = useState("");
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (user?.avatar && failedUrl !== user.avatar) {
    const retryRaw = failedUrl === `${user.avatar}#raw`;
    return <img src={retryRaw ? user.avatar : optimizeImage(user.avatar)} alt={user.name || "Profile"} style={style} className={`shrink-0 rounded-full object-cover ${className}`} decoding="async" referrerPolicy="no-referrer" onError={() => setFailedUrl((failed) => (optimizeImage(user.avatar) !== user.avatar && failed !== `${user.avatar}#raw` ? `${user.avatar}#raw` : user.avatar))} />;
  }
  return (
    <span style={style} className={`flex shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white ${className}`} aria-label={user?.name || "Profile"}>
      {(user?.name || "?").charAt(0).toUpperCase()}
    </span>
  );
}
