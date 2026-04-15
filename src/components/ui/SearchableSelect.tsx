"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { formControlFlex1DisabledClass } from "@/lib/uiFormClasses";

export type SearchableSelectOption = {
  value: string;
  label: string;
};

export type SearchableSelectProps = {
  /** Selected option value, or empty / null when cleared. */
  value: string | null | undefined;
  onChange: (next: string | null) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  isClearable?: boolean;
  className?: string;
  /** Accessible name when no visible label is tied to the control. */
  ariaLabel?: string;
  /** Shown next to the spinner while `loading` is true. */
  loadingText?: string;
  /** Message when `options` is empty (after load). */
  emptyText?: string;
  /** Max height class for the dropdown list (Tailwind). */
  listMaxHeightClass?: string;
};

/**
 * Select2-style searchable dropdown: type to filter, click to choose, optional clear.
 * Uses plain React + Tailwind (no jQuery Select2 / react-select).
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select…",
  disabled = false,
  loading = false,
  isClearable = true,
  className = "",
  ariaLabel,
  loadingText = "Loading…",
  emptyText = "No options",
  listMaxHeightClass = "max-h-52",
}: SearchableSelectProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedLabel = useMemo(() => {
    const v = value == null || value === "" ? null : String(value);
    if (!v) return "";
    const o = options.find((x) => x.value === v);
    return o?.label ?? "";
  }, [value, options]);

  /** When closing (e.g. click outside), reset the search field to the current label. */
  useEffect(() => {
    if (!open) {
      setQuery(selectedLabel);
    }
  }, [open, selectedLabel]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    if (!t) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(t) ||
        o.value.toLowerCase().includes(t),
    );
  }, [options, query]);

  const showList = open && !loading && !disabled;

  const handleOpen = () => {
    if (disabled || loading) return;
    setOpen(true);
    setQuery(selectedLabel);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setOpen(false);
  };

  const selectOption = (opt: SearchableSelectOption) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
  };

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 text-sm text-zinc-500 ${className}`}
      >
        <span
          className="inline-block size-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent"
          aria-hidden
        />
        <span>{loadingText}</span>
      </div>
    );
  }

  const inputDisplay = open ? query : selectedLabel || "";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <div className="flex gap-1">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          disabled={disabled}
          value={inputDisplay}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          aria-expanded={showList}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          className={formControlFlex1DisabledClass}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={handleOpen}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              setQuery(selectedLabel);
            }
          }}
        />
        {isClearable && (value != null && value !== "") ? (
          <button
            type="button"
            disabled={disabled}
            className="shrink-0 rounded-xl border border-zinc-200 px-2.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={handleClear}
            aria-label="Clear selection"
          >
            ×
          </button>
        ) : null}
      </div>
      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          className={`absolute z-[110] mt-1 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950 ${listMaxHeightClass}`}
        >
          {isClearable ? (
            <li role="presentation">
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleClear();
                }}
              >
                {placeholder}
              </button>
            </li>
          ) : null}
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-500">{emptyText}</li>
          ) : (
            filtered.map((o) => (
              <li key={o.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={String(value) === o.value}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectOption(o);
                  }}
                >
                  {o.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
