import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FiArrowLeft, FiEye, FiSearch, FiTrash2 } from "react-icons/fi";
import api, { getErrorMessage } from "../../services/api";
import { ROLE_LABELS } from "../../utils/roles";
import { formatDateTime } from "../../utils/formatDate";
import Avatar from "../common/Avatar";
import { Skeleton, Empty } from "./ui";

const clock = (value) => new Date(value).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
const day = (value) => new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

// Read-only oversight of other people's conversations. Only the Super Admin can open this view.
export default function ChatMonitor() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(null);
  const [thread, setThread] = useState({ people: [], messages: [] });
  const [threadLoading, setThreadLoading] = useState(false);

  const deleteConversation = async () => {
    if (!open || !window.confirm(`Delete the entire conversation between ${open.a.name} and ${open.b.name}?`)) return;
    try {
      await api.delete(`/chat/conversations/${open.a._id}/${open.b._id}`);
      setList((current) => current.filter((item) => item.pair !== open.pair));
      setOpen(null);
      setThread({ people: [], messages: [] });
      toast.success("Conversation deleted");
    } catch (error) { toast.error(getErrorMessage(error)); }
  };

  useEffect(() => {
    let alive = true;
    api.get("/chat/monitor")
      .then(({ data }) => alive && setList(data.conversations))
      .catch((error) => toast.error(getErrorMessage(error)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const openConversation = useCallback(async (conversation) => {
    setOpen(conversation);
    setThreadLoading(true);
    try {
      const { data } = await api.get(`/chat/monitor/${conversation.a._id}/${conversation.b._id}`);
      setThread({ people: data.people, messages: data.messages });
    } catch (error) {
      toast.error(getErrorMessage(error));
      setOpen(null);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? list.filter((c) => `${c.a.name} ${c.b.name}`.toLowerCase().includes(q)) : list;
  }, [list, filter]);

  return (
    <div className="card flex h-[calc(100dvh-13rem)] min-h-112 overflow-hidden">
      <aside className={`${open ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col md:w-80`} style={{ borderRight: "1px solid var(--line)" }}>
        <div className="p-3" style={{ borderBottom: "1px solid var(--line)" }}>
          <p className="mb-2 flex items-center gap-2 px-1 text-sm font-semibold"><FiEye className="text-brand" /> Conversations you can view</p>
          <div className="relative"><FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input className="input pl-9" placeholder="Search by name" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Search conversations" /></div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? <div className="p-3"><Skeleton rows={5} /></div> : shown.length === 0 ? <p className="p-6 text-center text-sm text-gray-500">No conversations to show.</p> : shown.map((c) => (
            <button key={c.pair} type="button" onClick={() => openConversation(c)} className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-brand/5 ${open?.pair === c.pair ? "bg-brand/10" : ""}`}>
              <span className="relative flex shrink-0"><Avatar user={c.a} size={38} /><Avatar user={c.b} size={38} className="-ml-3 ring-2 ring-(--surface)" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold">{c.a.name} · {c.b.name}</span><span className="shrink-0 text-[11px] text-gray-500">{day(c.lastMessage.createdAt)}</span></span>
                <span className="block truncate text-xs text-gray-500">{c.lastMessage.deleted ? "Message deleted" : c.lastMessage.text}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className={`${open ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
        {!open ? (
          <div className="m-auto p-6"><Empty title="Select a conversation" text="Open any conversation on the left to read it. This view is read only." /></div>
        ) : (
          <>
            <header className="flex shrink-0 items-center gap-3 px-3 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
              <button type="button" className="rounded-full p-2 hover:bg-black/5 md:hidden" onClick={() => setOpen(null)} aria-label="Back to conversations"><FiArrowLeft /></button>
              <span className="flex shrink-0"><Avatar user={open.a} size={38} /><Avatar user={open.b} size={38} className="-ml-3 ring-2 ring-(--surface)" /></span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{open.a.name} and {open.b.name}</p>
                <p className="truncate text-xs text-gray-500">{ROLE_LABELS[open.a.role]} and {ROLE_LABELS[open.b.role]} · Read only</p>
              </div>
              <button type="button" onClick={deleteConversation} className="ml-auto rounded-full p-2 text-red-400 transition-colors hover:bg-red-500/10" aria-label="Delete conversation" title="Delete conversation"><FiTrash2 /></button>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
              {threadLoading ? <Skeleton rows={4} /> : thread.messages.length === 0 ? <p className="py-10 text-center text-sm text-gray-500">No messages.</p> : thread.messages.map((m) => {
                const left = m.from === open.a._id;
                const sender = left ? open.a : open.b;
                return (
                  <div key={m._id} className={`flex ${left ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%] ${left ? "rounded-bl-sm" : "rounded-br-sm bg-brand text-white"}`} style={left ? { background: "var(--surface-2)" } : undefined}>
                      <p className={`mb-0.5 text-[11px] font-semibold ${left ? "text-brand" : "text-white/90"}`}>{sender.name}</p>
                      {m.deleted ? <p className="italic opacity-70">{m.text ? `Deleted: ${m.text}` : "This message was deleted"}</p> : <p className="whitespace-pre-wrap wrap-break-word">{m.text}</p>}
                      <p className={`mt-1 text-right text-[10px] ${left ? "text-gray-500" : "text-white/80"}`} title={formatDateTime(m.createdAt)}>{clock(m.createdAt)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
