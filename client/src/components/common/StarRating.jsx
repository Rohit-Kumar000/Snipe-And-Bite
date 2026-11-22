import { FaStar, FaRegStar } from "react-icons/fa";

// Shows a rating. Pass onChange to make it clickable.
export default function StarRating({ value = 0, onChange, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-accent">
      {[1, 2, 3, 4, 5].map((star) => {
        const Icon = star <= Math.round(value) ? FaStar : FaRegStar;
        return onChange ? (
          <button key={star} type="button" onClick={() => onChange(star)} aria-label={`${star} star`}>
            <Icon size={size} />
          </button>
        ) : (
          <Icon key={star} size={size} />
        );
      })}
    </span>
  );
}
