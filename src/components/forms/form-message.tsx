import type { ActionState } from "@/types/actions";

export function FormMessage({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <p
      aria-live="polite"
      className={
        state.status === "success"
          ? "rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800"
          : "rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-800"
      }
    >
      {state.message}
    </p>
  );
}

export function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs font-medium text-danger">{errors[0]}</p>;
}
