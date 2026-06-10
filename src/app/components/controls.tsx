import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

// -- Shared UI ------------------------------------------------------------------

export function Field({
  label, value, onChange, type = "text", placeholder, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
        {required && <span className="text-amber-400 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="bg-secondary/60 border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40 transition-all"
      />
    </div>
  );
}

// -- Custom Select --------------------------------------------------------------

export function CustomSelect({
  value, onChange, options, placeholder, size = "md", className, disabled, searchable = false, searchPlaceholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[] | { label: string; value: string }[];
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, minWidth: 0, maxHeight: 208 });
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const updatePosition = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    const margin = 8;
    const preferredHeight = searchable ? 260 : 212;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openAbove = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const maxHeight = Math.max(120, Math.min(240, openAbove ? spaceAbove : spaceBelow));
    const top = openAbove
      ? Math.max(margin, rect.top - maxHeight - 4)
      : Math.min(rect.bottom + 4, window.innerHeight - maxHeight - margin);
    const left = Math.min(Math.max(margin, rect.left), window.innerWidth - margin - Math.min(rect.width, 512));

    setPosition({
      top,
      left,
      minWidth: rect.width,
      maxHeight,
    });
  };

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        ref.current &&
        !ref.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, searchable]);

  useEffect(() => {
    if (!open || !searchable) return;
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, [open, searchable]);

  const normalized = (options as (string | { label: string; value: string })[]).map(o =>
    typeof o === "string" ? { label: o, value: o } : o
  );
  const selected = normalized.find(o => o.value === value);
  const normalizedQuery = normalizeSelectText(query);
  const visibleOptions = normalizedQuery
    ? normalized.filter(o =>
        normalizeSelectText(o.label).includes(normalizedQuery) ||
        normalizeSelectText(o.value).includes(normalizedQuery)
      )
    : normalized;

  const triggerCls = size === "sm"
    ? "w-full overflow-hidden flex items-center justify-between gap-2 bg-secondary border border-border rounded-lg pl-3 pr-2.5 py-1.5 text-xs font-medium text-foreground hover:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/25 transition-all cursor-pointer"
    : "w-full overflow-hidden flex items-center justify-between gap-2 bg-secondary/60 border border-border rounded-lg px-3.5 py-2.5 text-sm text-foreground hover:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/25 transition-all cursor-pointer";

  const disabledCls = "opacity-50 cursor-not-allowed pointer-events-none";

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          updatePosition();
          setOpen(v => !v);
        }}
        className={`${triggerCls} ${disabled ? disabledCls : ""}`}
      >
        <span className={`${selected ? "text-foreground" : "text-muted-foreground/50"} block min-w-0 flex-1 truncate whitespace-nowrap text-left`}>
          {selected?.label ?? placeholder ?? "Seleccionar..."}
        </span>
        <ChevronDown className={`flex-shrink-0 text-muted-foreground transition-transform duration-150 ${open ? "rotate-180" : ""} ${size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[120] w-max max-w-[min(32rem,calc(100vw-2rem))] bg-card border border-border rounded-xl shadow-lg shadow-black/8 overflow-hidden"
          style={{
            top: position.top,
            left: position.left,
            minWidth: position.minWidth,
          }}
        >
          {searchable && (
            <div className="p-2 border-b border-border bg-card">
              <input
                ref={searchRef}
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={searchPlaceholder ?? "Buscar..."}
                className="w-full rounded-lg border border-border bg-secondary/50 px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-400/25 focus:border-amber-400/40"
              />
            </div>
          )}
          <div className="overflow-y-auto py-1" style={{ maxHeight: searchable ? position.maxHeight - 48 : position.maxHeight }}>
            {visibleOptions.map(opt => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); close(); }}
                  className={`w-full whitespace-nowrap text-left flex items-center justify-between gap-3 px-3.5 py-2 text-sm transition-colors ${
                    isSelected
                      ? "bg-amber-400/10 text-amber-600"
                      : "text-foreground hover:bg-secondary/70"
                  }`}
                >
                  <span className="block min-w-0 flex-1 truncate whitespace-nowrap">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                </button>
              );
            })}
            {visibleOptions.length === 0 && (
              <div className="px-3.5 py-3 text-xs text-muted-foreground">
                Sin resultados
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function normalizeSelectText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function SelectField({
  label, value, onChange, options, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: string[]; required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
        {required && <span className="text-amber-400 ml-1">*</span>}
      </label>
      <CustomSelect
        value={value}
        onChange={onChange}
        options={options}
        placeholder="Seleccionar..."
      />
    </div>
  );
}

export function StatCard({
  label, value, sub, icon: Icon, color = "amber",
}: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: "amber" | "blue" | "emerald" | "purple";
}) {
  const palette = {
    amber:   "text-amber-400   bg-amber-400/8   border-amber-400/20",
    blue:    "text-blue-400    bg-blue-400/8    border-blue-400/20",
    emerald: "text-emerald-400 bg-emerald-400/8 border-emerald-400/20",
    purple:  "text-purple-400  bg-purple-400/8  border-purple-400/20",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-start gap-3.5">
      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${palette[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
        <p className="text-xl font-bold text-foreground font-mono leading-none">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}
