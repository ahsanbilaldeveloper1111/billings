/**
 * Normalizes a controlled numeric input string by stripping redundant leading
 * zeros from the integer part (`"007"` → `"7"`, `"-02"` → `"-2"`, `"0.5"` unchanged).
 *
 * Use in `onChange` for `type="number"` / numeric fields. Do **not** use for
 * identifiers that may legitimately retain leading zeros (e.g. bank account numbers).
 */
export function stripNumericLeadingZerosForControlledInput(raw: string): string {
  if (raw === "") return "";
  const t = raw.trim();
  if (t === "") return "";
  if (t === "-") return "-";
  if (t === ".") return "0.";

  let neg = false;
  let s = t;
  if (s.startsWith("-")) {
    neg = true;
    s = s.slice(1);
  }

  let acc = "";
  let dotSeen = false;
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") acc += ch;
    else if (ch === "." && !dotSeen) {
      acc += ch;
      dotSeen = true;
    }
  }
  if (acc === "" || acc === ".") return neg ? "-" : "";

  const di = acc.indexOf(".");
  const intPart = di >= 0 ? acc.slice(0, di) : acc;
  const frac = di >= 0 ? acc.slice(di) : "";
  let intStripped = intPart.replace(/^0+/, "");
  if (intStripped === "") intStripped = "0";
  const out = intStripped + frac;
  return neg ? `-${out}` : out;
}

/**
 * For plain digit-only values (e.g. numeric ID filters). If the trimmed value
 * contains any non-digit, returns it unchanged (safe for accidental paste of UUIDs).
 */
export function stripLeadingZerosDigitOnly(raw: string): string {
  const t = raw.trim();
  if (t === "") return "";
  if (!/^\d+$/.test(t)) return t;
  const stripped = t.replace(/^0+/, "");
  return stripped === "" ? "0" : stripped;
}
