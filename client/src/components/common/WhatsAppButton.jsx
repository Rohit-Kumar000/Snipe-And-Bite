import { useSelector } from "react-redux";
import { FaWhatsapp } from "react-icons/fa";

// Floating chat button. It is shown only when a WhatsApp number is set in the admin settings.
export default function WhatsAppButton() {
  const number = useSelector((state) => state.settings.data?.whatsappNumber);
  const digits = (number || "").replace(/\D/g, "");
  if (!digits) return null;

  return (
    <a
      href={`https://wa.me/${digits}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <FaWhatsapp size={30} />
    </a>
  );
}
