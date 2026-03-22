"use client";

import { useState } from "react";
import { X, Send, MessageSquarePlus } from "lucide-react";
import toast from "react-hot-toast";

export default function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append("access_key", "f4743494-8f26-43c2-b04d-ecbe857f8114");

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        toast.success("Obrigado. Seu feedback foi enviado.");
        setIsOpen(false);
      } else {
        toast.error("Ocorreu um erro ao enviar.");
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="mb-8 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-[13px] font-medium text-[#0F1111] shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-95"
      >
        <MessageSquarePlus className="h-[18px] w-[18px] text-[#007185]" />
        Enviar feedback ou sugestões
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-200 bg-[#F0F2F2] p-4">
              <h3 className="font-bold text-[#0F1111]">Enviar feedback</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 transition-colors hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#0F1111]">Assunto</label>
                <input
                  type="text"
                  name="assunto"
                  required
                  placeholder="Ex.: sugestão de novo produto ou filtro"
                  className="rounded-md border border-gray-300 p-2 text-[14px] outline-none focus:border-[#e47911] focus:ring-1 focus:ring-[#e47911]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#0F1111]">Sua mensagem</label>
                <textarea
                  name="mensagem"
                  rows={4}
                  required
                  placeholder="Descreva detalhadamente sua sugestão..."
                  className="resize-none rounded-md border border-gray-300 p-2 text-[14px] outline-none focus:border-[#e47911] focus:ring-1 focus:ring-[#e47911]"
                />
              </div>

              <input type="checkbox" name="botcheck" className="hidden" style={{ display: "none" }} />

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#FFD814] py-2.5 font-bold text-[#0F1111] transition-colors hover:bg-[#F7CA00] disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
