import { useState } from "react";
import { FaUtensils } from "react-icons/fa";
import { optimizeImage } from "../../utils/image";

// Shows the dish photo, or a neutral icon when there is no photo or it fails to load.
export default function FoodImage({ src, alt, className = "" }) {
  const [failedSrc, setFailedSrc] = useState("");
  if (!src || failedSrc === src) {
    return (
      <div className={`flex items-center justify-center bg-orange-50 text-accent/60 ${className}`} role="img" aria-label={alt || "No photo"}>
        <FaUtensils size={28} />
      </div>
    );
  }
  const retryRaw = failedSrc === `${src}#raw`;
  return <img src={retryRaw ? src : optimizeImage(src)} alt={alt} loading="lazy" decoding="async" onError={() => setFailedSrc((failed) => (optimizeImage(src) !== src && failed !== `${src}#raw` ? `${src}#raw` : src))} className={`object-cover object-center ${className}`} />;
}
