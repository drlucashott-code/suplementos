"use client";

import { useFormStatus } from "react-dom";

export default function DeleteCategoryButton({
  action,
}: {
  action: () => void;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const confirmed = confirm("Tem certeza que deseja excluir esta categoria?");
        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="text-red-400 hover:text-red-600 font-bold text-xs uppercase tracking-tighter transition-colors disabled:cursor-not-allowed disabled:opacity-60"
      title="Excluir Categoria"
    >
      {pending ? "Excluindo..." : "Excluir"}
    </button>
  );
}
