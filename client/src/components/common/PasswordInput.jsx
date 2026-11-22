import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? "text" : "password"} className={`input pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        className="absolute inset-y-0 right-2 inline-flex w-10 items-center justify-center rounded-lg text-gray-500 transition hover:bg-black/5 hover:text-brand"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <FiEyeOff size={18} /> : <FiEye size={18} />}
      </button>
    </div>
  );
}
