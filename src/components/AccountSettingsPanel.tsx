"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Upload, User, X } from "lucide-react";
import {
  accountBodyClass,
  accountPrimaryButtonClass,
  accountSecondaryButtonClass,
  accountSectionClass,
  accountTertiaryLinkClass,
} from "@/components/account/accountUi";

type AccountSettingsPanelProps = {
  user: {
    displayName: string;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    isEmailVerified: boolean;
  };
};

const CROP_SIZE = 512;

export default function AccountSettingsPanel({ user }: AccountSettingsPanelProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);

  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropNaturalSize, setCropNaturalSize] = useState({ width: 0, height: 0 });
  const [cropError, setCropError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(user.displayName);
    setUsername(user.username ?? "");
    setEmail(user.email);
    setAvatarUrl(user.avatarUrl ?? "");
  }, [user.displayName, user.email, user.username, user.avatarUrl]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCropError("Escolha uma imagem válida.");
      return;
    }

    setCropError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : null;
      if (!source) {
        setCropError("Não foi possível ler a imagem.");
        return;
      }
      setCropSource(source);
      setCropZoom(1);
      setCropX(0);
      setCropY(0);
      setCropNaturalSize({ width: 0, height: 0 });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function closeCrop() {
    setCropSource(null);
    setCropError(null);
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
    setCropNaturalSize({ width: 0, height: 0 });
  }

  function applyCrop() {
    const image = cropImageRef.current;
    if (!cropSource || !image || !cropNaturalSize.width || !cropNaturalSize.height) {
      setCropError("Não foi possível preparar o recorte.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = CROP_SIZE;
    canvas.height = CROP_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCropError("Não foi possível preparar o recorte.");
      return;
    }

    const baseScale = Math.max(CROP_SIZE / cropNaturalSize.width, CROP_SIZE / cropNaturalSize.height);
    const drawWidth = cropNaturalSize.width * baseScale * cropZoom;
    const drawHeight = cropNaturalSize.height * baseScale * cropZoom;
    const offsetX = (CROP_SIZE - drawWidth) / 2 + cropX;
    const offsetY = (CROP_SIZE - drawHeight) / 2 + cropY;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    setAvatarUrl(canvas.toDataURL("image/png"));
    closeCrop();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          email,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Não foi possível salvar as alterações.");
        return;
      }

      setMessage("Alterações salvas com sucesso.");
      router.refresh();
    } catch (submitError) {
      console.error("account_settings_save_failed", submitError);
      setError("Não foi possível salvar as alterações.");
    } finally {
      setIsPending(false);
    }
  }

  const avatarPreview = avatarUrl.trim() || null;

  return (
    <section className={`${accountSectionClass} p-4 sm:p-5 md:p-6`}>
      <div className="flex items-start gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6] text-[#2162A1]">
          <User className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold leading-tight text-[#0F1111]">Minha conta</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#667085]">
            Gerencie suas informações públicas e identidade da conta.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-[13px] font-bold text-[#0F1111]">Nome</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] outline-none transition focus:border-[#2162A1]"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-[13px] font-bold text-[#0F1111]">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] outline-none transition focus:border-[#2162A1]"
            />
          </label>
        </div>

        <div className="space-y-3">
          <label className="space-y-1.5">
            <span className="text-[13px] font-bold text-[#0F1111]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-9 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] outline-none transition focus:border-[#2162A1]"
            />
          </label>

          <div className="space-y-2">
            <span className="text-[13px] font-bold text-[#0F1111]">Foto de perfil</span>
            <div className="flex items-center gap-3 rounded-[6px] border border-[#D9DEE3] bg-white px-3 py-2.5">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#D9DEE3] bg-[#F3F4F6]">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Foto atual de perfil" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-5 w-5 text-[#667085]" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="inline-flex h-8 items-center rounded-[6px] border border-[#D9DEE3] bg-white px-3 text-[13px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                  aria-label="Carregar foto"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Carregar foto
                </button>
                {avatarPreview ? (
                  <button type="button" onClick={() => setAvatarUrl("")} className={accountTertiaryLinkClass}>
                    Remover
                  </button>
                ) : null}
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </div>
        </div>

        {message ? (
          <div className="rounded-[8px] border border-[#B7E3C0] bg-[#F0FAF4] px-4 py-3 text-[13px] font-medium text-[#1E6B3A]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#B42318]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={isPending} className={accountPrimaryButtonClass}>
            {isPending ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDisplayName(user.displayName);
              setUsername(user.username ?? "");
              setEmail(user.email);
              setAvatarUrl(user.avatarUrl ?? "");
              setMessage(null);
              setError(null);
            }}
            className={accountSecondaryButtonClass}
          >
            Cancelar
          </button>
        </div>
      </form>

      {cropSource ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4 py-6">
          <div className="w-full max-w-2xl overflow-hidden rounded-[8px] border border-[#D5D9D9] bg-white shadow-[0_24px_60px_rgba(15,17,17,0.18)]">
            <div className="flex items-center justify-between border-b border-[#EAECF0] px-4 py-3 sm:px-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2162A1]">Foto de perfil</p>
                <h2 className="mt-1 text-[16px] font-bold text-[#0F1111]">Ajustar enquadramento</h2>
              </div>
              <button
                type="button"
                onClick={closeCrop}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D5D9D9] bg-white text-[#0F1111] transition hover:bg-[#F8FAFA]"
                aria-label="Fechar recorte"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-3">
                <div className="overflow-hidden rounded-[8px] border border-[#D5D9D9] bg-[#F3F4F6]">
                  <div className="relative aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      ref={cropImageRef}
                      src={cropSource}
                      alt="Recorte da foto"
                      onLoad={(event) => {
                        setCropNaturalSize({
                          width: event.currentTarget.naturalWidth,
                          height: event.currentTarget.naturalHeight,
                        });
                      }}
                      className="absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{
                        width: cropNaturalSize.width ? `${cropNaturalSize.width * cropZoom * Math.max(CROP_SIZE / cropNaturalSize.width, CROP_SIZE / cropNaturalSize.height)}px` : "auto",
                        height: cropNaturalSize.height ? `${cropNaturalSize.height * cropZoom * Math.max(CROP_SIZE / cropNaturalSize.width, CROP_SIZE / cropNaturalSize.height)}px` : "auto",
                        transform: `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px))`,
                      }}
                    />
                  </div>
                </div>
                <p className={accountBodyClass}>Use os controles para aproximar, afastar e reposicionar a imagem.</p>
              </div>

              <div className="space-y-4">
                <label className="block space-y-2">
                  <span className="text-[13px] font-bold text-[#0F1111]">Zoom</span>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={cropZoom}
                    onChange={(event) => setCropZoom(Number(event.target.value))}
                    className="h-2 w-full accent-[#2162A1]"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[13px] font-bold text-[#0F1111]">Posição horizontal</span>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    value={cropX}
                    onChange={(event) => setCropX(Number(event.target.value))}
                    className="h-2 w-full accent-[#2162A1]"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-[13px] font-bold text-[#0F1111]">Posição vertical</span>
                  <input
                    type="range"
                    min={-120}
                    max={120}
                    value={cropY}
                    onChange={(event) => setCropY(Number(event.target.value))}
                    className="h-2 w-full accent-[#2162A1]"
                  />
                </label>

                <div className="rounded-[8px] border border-[#EAECF0] bg-[#FCFCFD] p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full border border-[#D5D9D9] bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cropSource}
                        alt="Prévia da foto"
                        className="h-full w-full object-cover"
                        style={{
                          transform: `scale(${cropZoom * 0.3}) translate(${cropX * 0.2}px, ${cropY * 0.2}px)`,
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-[#0F1111]">Prévia</p>
                      <p className="text-[12px] text-[#667085]">O recorte final será salvo como imagem do perfil.</p>
                    </div>
                  </div>
                </div>

                {cropError ? (
                  <div className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] font-medium text-[#B42318]">
                    {cropError}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#EAECF0] px-4 py-3 sm:px-5">
              <button type="button" onClick={closeCrop} className={accountSecondaryButtonClass}>
                Cancelar
              </button>
              <button type="button" onClick={applyCrop} className={accountPrimaryButtonClass}>
                <Check className="mr-2 h-4 w-4" />
                Aplicar foto
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
