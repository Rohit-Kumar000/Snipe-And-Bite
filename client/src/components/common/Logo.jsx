import { useState } from "react";
import useTheme from "../../hooks/useTheme";
import { DARK_LOGO_URL, LIGHT_LOGO_URL } from "../../utils/constants";
import { optimizeImage } from "../../utils/image";

// The brand logo for the current theme. Pass variant="dark" on surfaces that are always dark (the footer).
// If the image cannot load, the name is shown as text so the layout never breaks.
export default function Logo({ variant, alt = "Snipe&Bite", className = "", ...rest }) {
  const { theme } = useTheme();
  const [failed, setFailed] = useState(false);
  const src = (variant || theme) === "dark" ? DARK_LOGO_URL : LIGHT_LOGO_URL;

  if (failed) {
    return <span className={`flex items-center justify-center font-display text-2xl font-extrabold text-brand ${className}`}>Snipe&amp;Bite</span>;
  }
  return <img src={optimizeImage(src)} alt={alt} className={className} decoding="async" onError={() => setFailed(true)} {...rest} />;
}
