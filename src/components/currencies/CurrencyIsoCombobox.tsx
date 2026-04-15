"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WorldCurrencyMeta } from "@/lib/currencies/worldCurrencyMap";
import { formControlFlex1Class } from "@/lib/uiFormClasses";

type Row = { code: string; label: string };

type CurrencyIsoComboboxProps = {
  /** ISO code, uppercase */
  value: string;
  metaMap: Map<string, WorldCurrencyMeta>;
  options: Row[];
  onSelect: (code: string) => void;
  onClear: () => void;
  disabled?: boolean;
};

function labelForCode(
  code: string,
  map: Map<string, WorldCurrencyMeta>,
): string {
  if (!code) return "";
  const meta = map.get(code);
  return [
    code,
    meta?.name ? ` - ${meta.name}` : "",
    meta?.symbol ? ` (${meta.symbol})` : "",
  ].join("");
}

export function CurrencyIsoCombobox({
  value,
  metaMap,
  options,
  onSelect,
  onClear,
  disabled,
}: CurrencyIsoComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setQuery(labelForCode(value, metaMap));
  }, [value, metaMap]);

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
    if (!t) return options.slice(0, 120);
    return options
      .filter(
        (o) =>
          o.code.toLowerCase().includes(t) ||
          o.label.toLowerCase().includes(t),
      )
      .slice(0, 200);
  }, [options, query]);

  if (disabled) {
    return (
      <input
        type="text"
        readOnly
        disabled
        value={value}
        className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm uppercase opacity-80 dark:border-zinc-700 dark:bg-zinc-900"
        placeholder="USD"
      />
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="flex gap-1">
        <input
          type="text"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search currency…"
          className={formControlFlex1Class}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls="currency-iso-listbox"
        />
        {value ? (
          <button
            type="button"
            className="shrink-0 rounded-xl border border-zinc-200 px-2.5 text-sm text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            onClick={() => {
              onClear();
              setQuery("");
              setOpen(false);
            }}
            aria-label="Clear currency"
          >
            ×
          </button>
        ) : null}
      </div>
      {open && filtered.length > 0 ? (
        <ul
          id="currency-iso-listbox"
          role="listbox"
          className="absolute z-[110] mt-1 max-h-52 w-full overflow-auto rounded-xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-950"
        >
          {filtered.map((o) => (
            <li key={o.code} role="presentation">
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(o.code);
                  setQuery(labelForCode(o.code, metaMap));
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
