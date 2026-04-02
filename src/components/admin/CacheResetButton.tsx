"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

export type CacheResetState = {
  ok: boolean;
  count: number;
  message: string;
};

const initialState: CacheResetState = {
  ok: false,
  count: 0,
  message: "",
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl border border-gray-200 bg-white px-6 py-3 text-center text-[10px] font-black uppercase tracking-widest text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
    >
      {pending ? "Limpando cache..." : "Zerar cache"}
    </button>
  );
}

export default function CacheResetButton({
  action,
}: {
  action: (prevState: CacheResetState, formData: FormData) => Promise<CacheResetState>;
}) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <div className="flex flex-col items-stretch gap-2">
      <form action={formAction}>
        <SubmitButton />
      </form>
      {state.message ? (
        <span
          className={`text-[10px] font-black uppercase tracking-widest ${
            state.ok ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {state.message}
        </span>
      ) : null}
    </div>
  );
}
