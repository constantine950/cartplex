"use client";

const SORT_OPTIONS = [
  { value: "NEWEST", label: "Newest" },
  { value: "PRICE_ASC", label: "Price: Low to High" },
  { value: "PRICE_DESC", label: "Price: High to Low" },
  { value: "BEST_RATED", label: "Best Rated" },
  { value: "RELEVANCE", label: "Relevance" },
];

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer"
    >
      {SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
