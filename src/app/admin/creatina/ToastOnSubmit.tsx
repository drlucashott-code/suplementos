"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import toast from "react-hot-toast";

type Props = {
  message: string;
};

export function ToastOnSubmit({ message }: Props) {
  const { pending } = useFormStatus();
  const wasPending = useRef(false);

  useEffect(() => {
    // começou a enviar
    if (pending && !wasPending.current) {
      wasPending.current = true;
      toast.loading("Salvando...");
      return;
    }

    // terminou de enviar (sucesso)
    if (!pending && wasPending.current) {
      wasPending.current = false;
      toast.dismiss();
      toast.success(message);
    }
  }, [pending, message]);

  return null;
}
