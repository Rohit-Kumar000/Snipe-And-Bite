// The standard Indian veg / non-veg mark.
export default function VegMark({ isVeg }) {
  const color = isVeg ? "border-leaf text-leaf" : "border-brand text-brand";
  return (
    <span
      className={`inline-flex h-4 w-4 items-center justify-center rounded-sm border-2 ${color}`}
      title={isVeg ? "Vegetarian" : "Non-vegetarian"}
    >
      <span className="h-2 w-2 rounded-full bg-current" />
    </span>
  );
}
