"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import toast from "react-hot-toast";

type Props = {
  message: string;
};

export function ToastOnSubmit({ message }: Props) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (!pending) return;

    // toast só dispara quando o form entra em estado "pending"
    toast.success(message);
  }, [pending, message]);

  return null;
}
