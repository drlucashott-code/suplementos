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
    
    // ✅ Sua Access Key do Web3Forms
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
        toast.success("Obrigado! Seu feedback foi enviado.");
        setIsOpen(false); 
      } else {
        toast.error("Ops! Ocorreu um erro ao enviar.");
      }
    } catch  {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Botão no Footer com texto mais profissional */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 mb-8 px-5 py-2.5 bg-white border border-gray-300 rounded-full text-[13px] text-[#0F1111] font-medium shadow-sm hover:bg-gray-50 hover:shadow-md transition-all active:scale-95"
      >
        <MessageSquarePlus className="w-[18px] h-[18px] text-[#007185]" />
        Enviar feedback ou sugestões
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Header do Modal */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-[#F0F2F2]">
              <h3 className="font-bold text-[#0F1111]">Enviar Feedback</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
              
              {/* Campo de Assunto Livre */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#0F1111]">Assunto</label>
                <input 
                  type="text"
                  name="assunto" 
                  required
                  placeholder="Ex: Sugestão de novo produto ou filtro"
                  className="border border-gray-300 rounded-md p-2 text-[14px] outline-none focus:border-[#e47911] focus:ring-1 focus:ring-[#e47911]"
                />
              </div>

              {/* Campo de Mensagem */}
              <div className="flex flex-col gap-1">
                <label className="text-[13px] font-bold text-[#0F1111]">Sua mensagem</label>
                <textarea 
                  name="mensagem" 
                  rows={4} 
                  required
                  placeholder="Descreva detalhadamente sua sugestão..."
                  className="border border-gray-300 rounded-md p-2 text-[14px] outline-none focus:border-[#e47911] focus:ring-1 focus:ring-[#e47911] resize-none"
                />
              </div>

              {/* Input invisível anti-spam */}
              <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />

              {/* Botão Enviar */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="mt-2 w-full bg-[#FFD814] hover:bg-[#F7CA00] text-[#0F1111] font-bold py-2.5 rounded-full flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  "Enviando..."
                ) : (
                  <>
                    <Send className="w-4 h-4" />
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