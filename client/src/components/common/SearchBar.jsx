import { useEffect, useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import useDebounce from "../../hooks/useDebounce";

// Calls onSearch shortly after the user stops typing.
export default function SearchBar({ value = "", onSearch, placeholder = "Search for dishes..." }) {
  const [text, setText] = useState(value);
  const debounced = useDebounce(text, 400);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(value);
  }, [value]);

  useEffect(() => {
    if (debounced !== value) onSearch(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="relative w-full">
      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        className="input pl-11 pr-10"
      />
      {text && (
        <button
          type="button"
          onClick={() => setText("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
          aria-label="Clear search"
        >
          <FiX />
        </button>
      )}
    </div>
  );
}
