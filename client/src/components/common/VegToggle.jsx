const OPTIONS = [
  { value: "", label: "All" },
  { value: "true", label: "Veg" },
  { value: "false", label: "Non-veg" },
];

// value is "", "true" or "false" (the same values the menu API uses).
export default function VegToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-full border border-gray-300 bg-white p-1">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            value === option.value ? "bg-brand text-white" : "text-choco hover:bg-black/5"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
