"use client";

import Link from "next/link";
import {
  Heart,
  MessageCircle,
  Pencil,
  Send,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type ProductCommentItem = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  parentId: string | null;
  likeCount: number;
  likedByMe: boolean;
  canEdit: boolean;
  canDelete: boolean;
  user: {
    id: string;
    displayName: string;
    username?: string | null;
    avatarUrl?: string | null;
  };
  replies: ProductCommentItem[];
};

type LoadCommentsResponse = {
  ok?: boolean;
  comments?: ProductCommentItem[];
  currentUserId?: string | null;
};

const UNVERIFIED_ACCOUNT_MESSAGE =
  "Para ativarmos a sua conta na Amazonpicks, precisamos que você confirme o seu endereço de email.";

function formatRelativeTime(value: string) {
  const date = new Date(value);
  const diffSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));

  if (diffSeconds < 60) return "agora";
  if (diffSeconds < 3600) {
    const minutes = Math.floor(diffSeconds / 60);
    return `${minutes} min atrás`;
  }
  if (diffSeconds < 86400) {
    const hours = Math.floor(diffSeconds / 3600);
    return `${hours} hora${hours === 1 ? "" : "s"} atrás`;
  }
  if (diffSeconds < 604800) {
    const days = Math.floor(diffSeconds / 86400);
    return `${days} dia${days === 1 ? "" : "s"} atrás`;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function countComments(items: ProductCommentItem[]): number {
  return items.reduce((total, item) => total + 1 + countComments(item.replies), 0);
}

function formatCommentCountLabel(count: number) {
  return `${count} ${count === 1 ? "comentário" : "comentários"}`;
}

function UserAvatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover" />;
  }

  return <UserCircle2 className="h-10 w-10 text-[#98A2B3]" />;
}

export function ProductCommentsSheet({
  productId,
  productName,
  triggerLabel,
  triggerClassName,
  initialCount = 0,
  onCountChange,
  initialOpen = false,
  hideTrigger = false,
  inline = false,
}: {
  productId: string;
  productName: string;
  triggerLabel?: string;
  triggerClassName?: string;
  initialCount?: number;
  onCountChange?: (count: number) => void;
  initialOpen?: boolean;
  hideTrigger?: boolean;
  inline?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen || inline);
  const [comments, setComments] = useState<ProductCommentItem[]>([]);
  const [commentCount, setCommentCount] = useState(initialCount);
  const [, setCurrentUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [showLoginAlert, setShowLoginAlert] = useState(false);
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "submitting" | "unauthorized" | "verificationRequired" | "error"
  >("idle");

  const replyingTo = useMemo(() => {
    if (!replyParentId) return null;
    const queue = [...comments];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.id === replyParentId) return current;
      queue.push(...current.replies);
    }
    return null;
  }, [comments, replyParentId]);

  const resolvedTriggerLabel = triggerLabel ?? formatCommentCountLabel(commentCount);

  function handleUnauthorizedState() {
    setStatus("unauthorized");
    setShowLoginAlert(true);
  }

  function handleVerificationRequiredState() {
    setStatus("verificationRequired");
    setShowVerificationAlert(true);
  }

  async function loadComments() {
    try {
      setStatus("loading");
      const response = await fetch(`/api/products/${productId}/comments`, { cache: "no-store" });
      const data = (await response.json()) as LoadCommentsResponse;

      if (!response.ok || !data.ok) {
        throw new Error("comments_load_failed");
      }

      const nextComments = data.comments ?? [];
      const nextCount = countComments(nextComments);
      setComments(nextComments);
      setCommentCount(nextCount);
      onCountChange?.(nextCount);
      setCurrentUserId(data.currentUserId ?? null);
      setStatus("idle");
    } catch (error) {
      console.error("comments_load_failed", error);
      setStatus("error");
    }
  }

  useEffect(() => {
    setCommentCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    if (initialOpen || inline) {
      setOpen(true);
    }
  }, [initialOpen, inline]);

  useEffect(() => {
    if (!open) return;
    void loadComments();
  }, [open, productId]);

  async function submitComment() {
    if (!draft.trim()) return;

    try {
      setStatus("submitting");

      if (editingCommentId) {
        const response = await fetch(`/api/products/comments/${editingCommentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: draft }),
        });
        const data = (await response.json()) as { ok?: boolean; error?: string };

        if (response.status === 401 || data.error === "unauthorized") {
          handleUnauthorizedState();
          return;
        }
        if (response.status === 403 || data.error === "email_verification_required") {
          handleVerificationRequiredState();
          return;
        }

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "comment_update_failed");
        }
      } else {
        const response = await fetch(`/api/products/${productId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            body: draft,
            parentId: replyParentId,
          }),
        });
        const data = (await response.json()) as { ok?: boolean; error?: string };

        if (response.status === 401 || data.error === "unauthorized") {
          handleUnauthorizedState();
          return;
        }
        if (response.status === 403 || data.error === "email_verification_required") {
          handleVerificationRequiredState();
          return;
        }

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "comment_create_failed");
        }
      }

      setDraft("");
      setReplyParentId(null);
      setEditingCommentId(null);
      await loadComments();
    } catch (error) {
      console.error("comment_submit_failed", error);
      setStatus("error");
    }
  }

  async function toggleLike(commentId: string, likedByMe: boolean) {
    const response = await fetch(`/api/products/comments/${commentId}/like`, {
      method: likedByMe ? "DELETE" : "POST",
    });

    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (response.status === 401 || data.error === "unauthorized") {
      handleUnauthorizedState();
      return;
    }
    if (response.status === 403 || data.error === "email_verification_required") {
      handleVerificationRequiredState();
      return;
    }

    if (!response.ok || !data.ok) {
      setStatus("error");
      return;
    }

    await loadComments();
  }

  async function deleteComment(commentId: string) {
    const response = await fetch(`/api/products/comments/${commentId}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };

    if (response.status === 403 || data.error === "email_verification_required") {
      handleVerificationRequiredState();
      return;
    }

    if (!response.ok || !data.ok) {
      setStatus("error");
      return;
    }

    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setDraft("");
    }
    if (replyParentId === commentId) {
      setReplyParentId(null);
    }

    await loadComments();
  }

  function startReply(comment: ProductCommentItem) {
    setReplyParentId(comment.id);
    setEditingCommentId(null);
    setDraft("");
  }

  function startEdit(comment: ProductCommentItem) {
    setEditingCommentId(comment.id);
    setReplyParentId(null);
    setDraft(comment.body);
  }

  function renderComment(comment: ProductCommentItem, depth = 0): React.ReactNode {
    return (
      <div key={comment.id} className={depth > 0 ? "ml-5 border-l border-[#E4E7EC] pl-4" : ""}>
        <div className="rounded-2xl border border-[#EAECF0] bg-white p-4">
          <div className="flex items-start gap-3">
            <UserAvatar displayName={comment.user.displayName} avatarUrl={comment.user.avatarUrl} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-black text-[#344054]">{comment.user.displayName}</span>
                {comment.user.username ? (
                  <span className="font-medium text-[#667085]">@{comment.user.username}</span>
                ) : null}
                <span className="text-[#667085]">{formatRelativeTime(comment.createdAt)}</span>
                {comment.isEdited ? (
                  <span className="text-xs font-medium text-[#98A2B3]">(editado)</span>
                ) : null}
              </div>

              <p className="mt-2 whitespace-pre-line text-[15px] leading-6 text-[#101828]">
                {comment.body}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <button
                  type="button"
                  onClick={() => void toggleLike(comment.id, comment.likedByMe)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 transition ${
                    comment.likedByMe
                      ? "border-[#FECACA] bg-[#FEF2F2] text-[#B42318]"
                      : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F9FAFB]"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${comment.likedByMe ? "fill-current" : ""}`} />
                  + {comment.likeCount}
                </button>

                <button
                  type="button"
                  onClick={() => startReply(comment)}
                  className="font-semibold text-[#2162A1] hover:text-[#174e87]"
                >
                  responder
                </button>

                {comment.canEdit ? (
                  <button
                    type="button"
                    onClick={() => startEdit(comment)}
                    className="inline-flex items-center gap-1 font-semibold text-[#667085] hover:text-[#344054]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    editar
                  </button>
                ) : null}

                {comment.canDelete ? (
                  <button
                    type="button"
                    onClick={() => void deleteComment(comment.id)}
                    className="inline-flex items-center gap-1 font-semibold text-[#B42318] hover:text-[#912018]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    excluir
                  </button>
                ) : null}
              </div>

              {comment.replies.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {comment.replies.map((reply) => renderComment(reply, depth + 1))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const commentsBody = (
    <>
      <div className={inline ? "border-b border-gray-100 pb-5" : "flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4"}>
        <div>
          <h3 className={`${inline ? "text-2xl" : "text-lg"} font-black text-[#0F1111]`}>Comentários</h3>
          <p className="mt-1 text-sm text-[#565959]">
            {inline
              ? "Participe da conversa sobre este produto, responda outros usuários e acompanhe as interações."
              : productName}
          </p>
        </div>

        {!inline ? (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col-reverse">
      <div className={inline ? "bg-white py-5" : "border-b border-gray-100 bg-[#F8FAFA] px-5 py-4"}>
        <div className="rounded-2xl border border-[#D0D5DD] bg-white p-4">
          <div className="flex items-start gap-3">
            <UserCircle2 className="h-10 w-10 text-[#98A2B3]" />
            <div className="flex-1">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                rows={3}
                placeholder="Digite o seu comentário."
                className="w-full rounded-xl bg-[#F2F4F7] px-4 py-3 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-[#B9E6FE]"
              />

              {replyingTo ? (
                <p className="mt-2 text-xs font-semibold text-[#2162A1]">
                  Respondendo {replyingTo.user.displayName}
                  {replyingTo.user.username ? ` @${replyingTo.user.username}` : ""}.{" "}
                  <button type="button" onClick={() => setReplyParentId(null)} className="underline">
                    cancelar
                  </button>
                </p>
              ) : null}

              {editingCommentId ? (
                <p className="mt-2 text-xs font-semibold text-[#667085]">
                  Editando comentário.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCommentId(null);
                      setDraft("");
                    }}
                    className="underline"
                  >
                    cancelar
                  </button>
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDraft("");
                    setReplyParentId(null);
                    setEditingCommentId(null);
                  }}
                  className="text-sm font-semibold text-[#2162A1] hover:text-[#174e87]"
                >
                  cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void submitComment()}
                  disabled={status === "submitting"}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0284C7] disabled:opacity-70"
                >
                  <Send className="h-4 w-4" />
                  {editingCommentId ? "salvar" : "comentar"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {status === "unauthorized" && !showLoginAlert ? (
          <p className="mt-3 text-sm text-[#565959]">
            Para comentar, entre na sua conta.{" "}
            <Link href="/entrar" className="font-semibold text-[#2162A1] hover:text-[#174e87]">
              Entrar agora
            </Link>
          </p>
        ) : null}

        {status === "error" ? (
          <p className="mt-3 text-sm font-medium text-[#B42318]">
            Não foi possível concluir essa ação agora.
          </p>
        ) : null}
      </div>

      <div className={inline ? "py-1" : "flex-1 overflow-y-auto px-5 py-4"}>
        {status === "loading" ? (
          <p className="text-sm text-[#565959]">Carregando comentários...</p>
        ) : comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-8 text-center text-sm text-[#565959]">
            Ainda não há comentários para este produto.
          </div>
        ) : (
          <div className="space-y-4">{comments.map((comment) => renderComment(comment))}</div>
        )}
      </div>
      </div>
    </>
  );

  return (
    <>
      {!hideTrigger ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA] ${
            triggerClassName ?? ""
          }`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          {resolvedTriggerLabel}
        </button>
      ) : null}

      {open && !inline ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {commentsBody}
          </div>
        </div>
      ) : null}

      {open && inline ? (
        <div className="rounded-3xl border border-[#EAECF0] bg-white p-6 shadow-sm">{commentsBody}</div>
      ) : null}

      {open && showLoginAlert ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4"
          onClick={() => setShowLoginAlert(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-lg font-black text-[#0F1111]">Atenção!</h4>
            <p className="mt-3 text-sm leading-6 text-[#565959]">
              Você precisa estar logado para interagir com outros usuários.
            </p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLoginAlert(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#2162A1] hover:text-[#174e87]"
              >
                Fechar
              </button>
              <Link
                href="/entrar"
                className="inline-flex items-center rounded-xl bg-[#0EA5E9] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0284C7]"
              >
                Entrar agora
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {open && showVerificationAlert ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 px-4"
          onClick={() => setShowVerificationAlert(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-lg font-black text-[#0F1111]">Confirmação pendente</h4>
            <p className="mt-3 text-sm leading-6 text-[#565959]">{UNVERIFIED_ACCOUNT_MESSAGE}</p>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowVerificationAlert(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#2162A1] hover:text-[#174e87]"
              >
                Fechar
              </button>
              <Link
                href="/minha-conta"
                className="inline-flex items-center rounded-xl bg-[#0EA5E9] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#0284C7]"
              >
                Ir para minha conta
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default ProductCommentsSheet;
