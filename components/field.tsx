import { cn } from "@/lib/utils";

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  textarea,
  description,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
  description?: string;
}) {
  const classes =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900";

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-800">{label}</span>
      {description ? <span className="mt-1 block text-xs text-slate-500">{description}</span> : null}
      {textarea ? (
        <textarea
          name={name}
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className={cn(classes, "min-h-28 resize-y")}
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue ?? ""}
          placeholder={placeholder}
          className={classes}
        />
      )}
    </label>
  );
}
