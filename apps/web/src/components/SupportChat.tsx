import { FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthProvider";

type ChatMsg = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  isAdmin: boolean;
  senderName: string;
};

type ThreadPreview = {
  id: string;
  userName: string;
  userPhone: string;
  unread: boolean;
  lastMessage: { body: string; createdAt: string; isAdmin: boolean } | null;
};

export function SupportChat() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const isAdmin = Boolean(user?.roles.includes("ADMIN"));
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const locale = i18n.language.startsWith("ky") ? "ky" : "ru";

  function scrollBottom() {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }

  async function refreshUnread() {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const res = await api.chatUnread();
      setUnread(res.unread);
    } catch {
      /* ignore */
    }
  }

  async function loadUserThread() {
    const res = await api.chatThread();
    setMessages(res.messages);
    setActiveTitle(t("chat.supportTitle"));
    scrollBottom();
    void refreshUnread();
  }

  async function loadAdminThreads() {
    const res = await api.chatAdminThreads();
    setThreads(res.threads);
    void refreshUnread();
  }

  async function loadAdminThread(id: string) {
    const res = await api.chatAdminThread(id);
    setActiveThreadId(id);
    setActiveTitle(res.thread.userName);
    setMessages(res.messages);
    scrollBottom();
    void loadAdminThreads();
  }

  useEffect(() => {
    void refreshUnread();
    const id = window.setInterval(() => void refreshUnread(), open ? 8000 : 25000);
    return () => window.clearInterval(id);
  }, [user?.id, open]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;

    async function tick() {
      try {
        if (isAdmin) {
          if (activeThreadId) {
            const res = await api.chatAdminThread(activeThreadId);
            if (!cancelled) {
              setMessages(res.messages);
              setActiveTitle(res.thread.userName);
            }
          } else {
            const res = await api.chatAdminThreads();
            if (!cancelled) setThreads(res.threads);
          }
        } else {
          const res = await api.chatThread();
          if (!cancelled) setMessages(res.messages);
        }
      } catch {
        /* ignore */
      }
    }

    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [open, user?.id, isAdmin, activeThreadId]);

  useEffect(() => {
    if (open) scrollBottom();
  }, [messages.length, open]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || !text.trim() || sending) return;
    setSending(true);
    setError("");
    const body = text.trim();
    try {
      if (isAdmin) {
        if (!activeThreadId) return;
        const res = await api.chatAdminSend(activeThreadId, body);
        setMessages((prev) => [...prev, res.message]);
      } else {
        const res = await api.chatSend(body);
        setMessages((prev) => [...prev, res.message]);
      }
      setText("");
      scrollBottom();
      void refreshUnread();
    } catch {
      setError(t("chat.sendError"));
    } finally {
      setSending(false);
    }
  }

  function toggle() {
    setOpen((v) => !v);
    setError("");
    if (!open && user && isAdmin) {
      setActiveThreadId(null);
      void loadAdminThreads();
    }
    if (!open && user && !isAdmin) {
      void loadUserThread();
    }
  }

  function formatTime(iso: string) {
    try {
      return new Date(iso).toLocaleString(locale === "ky" ? "ky-KG" : "ru-RU", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  return (
    <div className={`support-chat ${open ? "is-open" : ""}`}>
      {open && (
        <div className="support-chat-panel" role="dialog" aria-label={t("chat.title")}>
          <div className="support-chat-head">
            {isAdmin && activeThreadId ? (
              <button
                type="button"
                className="support-chat-back"
                onClick={() => {
                  setActiveThreadId(null);
                  setMessages([]);
                  void loadAdminThreads();
                }}
              >
                ←
              </button>
            ) : null}
            <div className="support-chat-head-text">
              <strong>{activeThreadId || !isAdmin ? activeTitle || t("chat.title") : t("chat.inbox")}</strong>
              <span>{isAdmin ? t("chat.inboxHint") : t("chat.userHint")}</span>
            </div>
            <button type="button" className="support-chat-close" onClick={() => setOpen(false)} aria-label="close">
              ✕
            </button>
          </div>

          {!user ? (
            <div className="support-chat-guest">
              <p>{t("chat.loginNeeded")}</p>
              <Link to="/login" className="nav-cta" onClick={() => setOpen(false)}>
                {t("nav.login")}
              </Link>
            </div>
          ) : isAdmin && !activeThreadId ? (
            <div className="support-chat-threads" ref={listRef}>
              {threads.length === 0 ? (
                <p className="support-chat-empty">{t("chat.emptyInbox")}</p>
              ) : (
                threads.map((th) => (
                  <button
                    key={th.id}
                    type="button"
                    className={`support-chat-thread ${th.unread ? "is-unread" : ""}`}
                    onClick={() => void loadAdminThread(th.id)}
                  >
                    <span className="support-chat-thread-name">
                      {th.userName}
                      {th.unread ? <i /> : null}
                    </span>
                    <span className="support-chat-thread-preview">
                      {th.lastMessage?.body || t("chat.noMessages")}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              <div className="support-chat-messages" ref={listRef}>
                {messages.length === 0 ? (
                  <p className="support-chat-empty">{t("chat.emptyThread")}</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`support-chat-bubble ${m.senderId === user.id ? "is-mine" : "is-theirs"}`}
                    >
                      <div className="support-chat-bubble-meta">
                        {m.senderName} · {formatTime(m.createdAt)}
                      </div>
                      <div className="support-chat-bubble-body">{m.body}</div>
                    </div>
                  ))
                )}
              </div>
              <form className="support-chat-form" onSubmit={(e) => void onSubmit(e)}>
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={t("chat.placeholder")}
                  maxLength={2000}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || !text.trim()}>
                  {t("chat.send")}
                </button>
              </form>
              {error ? <p className="support-chat-error">{error}</p> : null}
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="support-chat-fab"
        onClick={toggle}
        aria-expanded={open}
        aria-label={t("chat.title")}
      >
        <span className="support-chat-fab-icon" aria-hidden>
          {open ? (
            "✕"
          ) : (
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 18.5V7.8A2.8 2.8 0 0 1 7.8 5h8.4A2.8 2.8 0 0 1 19 7.8v6.4a2.8 2.8 0 0 1-2.8 2.8H9.2L5 18.5Z" />
              <path d="M9 10h6M9 13h4" strokeLinecap="round" />
            </svg>
          )}
        </span>
        {!open && unread > 0 ? <em className="support-chat-badge">{unread > 9 ? "9+" : unread}</em> : null}
      </button>
    </div>
  );
}
