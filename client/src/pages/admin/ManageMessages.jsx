import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FiMail, FiPhone, FiTrash2 } from "react-icons/fi";
import api, { getErrorMessage } from "../../services/api";
import { timeAgo, formatDateTime } from "../../utils/formatDate";
import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Seo from "../../components/common/Seo";
import { useSelector } from "react-redux";

const STATUSES = ["new", "read", "replied", "archived"];
const STATUS_STYLE = { new: "bg-brand/15 text-brand", read: "bg-blue-100 text-blue-700", replied: "bg-green-100 text-green-700", archived: "bg-gray-200 text-gray-700" };

// Inbox for messages sent through the public Contact form (the Customer Support module).
export default function ManageMessages() {
  const role = useSelector((state) => state.auth.user.role);
  const canDelete = ["SUPER_ADMIN", "ADMIN"].includes(role);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data: res } = await api.get("/contact", { params: { status: status || undefined, page, limit: 10 } });
      setData(res);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [status, page]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const setMessageStatus = async (id, next) => {
    try {
      await api.patch(`/contact/${id}`, { status: next });
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/contact/${toDelete._id}`);
      toast.success("Message deleted");
      setToDelete(null);
      load();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Customer support" />
      <div>
        <h1 className="text-2xl font-bold text-choco">Customer support</h1>
        <p className="text-sm text-gray-500">Messages from the website contact form. Reply by email or phone, then mark them as replied.</p>
      </div>

      {data && !data.emailConfigured && (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-800">
          Email is not configured on the server, so new messages are saved here but not emailed to the owner. Add EMAIL_USER and EMAIL_PASS to enable email alerts.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {["", ...STATUSES].map((s) => (
          <button key={s || "all"} type="button" onClick={() => { setStatus(s); setPage(1); }} className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${status === s ? "bg-brand text-white" : "btn-dark"}`}>
            {s || "All"} {s && data?.counts?.[s] ? `(${data.counts[s]})` : ""}
          </button>
        ))}
      </div>

      {!data ? <Loader /> : data.messages.length === 0 ? (
        <div className="card p-10 text-center text-sm text-gray-500">No messages yet. They will appear here as soon as someone uses the contact form.</div>
      ) : (
        <div className="space-y-4">
          {data.messages.map((m) => (
            <article key={m._id} className="card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-sans text-base font-semibold text-choco">{m.subject}</h3>
                  <p className="text-xs text-gray-500" title={formatDateTime(m.createdAt)}>{m.name} - {timeAgo(m.createdAt)}</p>
                </div>
                <span className={`badge capitalize ${STATUS_STYLE[m.status]}`}>{m.status}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{m.message}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <a className="btn-dark btn-sm" href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`}><FiMail /> {m.email}</a>
                {m.phone && <a className="btn-dark btn-sm" href={`tel:${m.phone}`}><FiPhone /> {m.phone}</a>}
                <select className="input w-auto! py-1.5! text-xs" value={m.status} onChange={(e) => setMessageStatus(m._id, e.target.value)}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                {canDelete && <button type="button" className="btn-danger btn-sm ml-auto" onClick={() => setToDelete(m)}><FiTrash2 /></button>}
              </div>
              {m.handledBy && <p className="text-xs text-gray-400">Last handled by {m.handledBy.name}</p>}
            </article>
          ))}
        </div>
      )}
      <Pagination page={page} pages={data?.pages || 1} onChange={setPage} />
      <ConfirmDialog open={Boolean(toDelete)} title="Delete this message?" message="This removes the message permanently. The deletion is recorded in the activity log." onConfirm={remove} onClose={() => setToDelete(null)} />
    </div>
  );
}
