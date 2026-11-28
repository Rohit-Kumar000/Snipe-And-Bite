import { useState } from "react";
import toast from "react-hot-toast";
import { FiDownload, FiTrash2 } from "react-icons/fi";
import api, { getErrorMessage } from "../../services/api";
import useFetch from "../../hooks/useFetch";
import { formatDate } from "../../utils/formatDate";
import Pagination from "../../components/common/Pagination";
import Seo from "../../components/common/Seo";
import { PageHeader, TableWrap, th, td, tr, Skeleton, ErrorBox, Empty } from "../../components/admin/ui";

export default function Newsletter() {
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useFetch(() => api.get("/newsletter", { params: { page } }).then((r) => r.data), [page]);

  const exportCsv = async () => {
    try {
      const { data: blob } = await api.get("/newsletter", { params: { format: "csv" }, responseType: "blob" });
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement("a"), { href: url, download: "newsletter-subscribers.csv" });
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(getErrorMessage(e)); }
  };
  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.email}?`)) return;
    try { await api.delete(`/newsletter/${s._id}`); toast.success("Subscriber removed"); reload(); } catch (e) { toast.error(getErrorMessage(e)); }
  };

  return (
    <div className="space-y-5">
      <Seo title="Newsletter" />
      <PageHeader eyebrow="Customers" title="Newsletter subscribers" subtitle={data ? `${data.total} active subscribers` : undefined}>
        <button type="button" className="btn-dark btn-sm" onClick={exportCsv}><FiDownload /> CSV</button>
      </PageHeader>
      {error ? <ErrorBox message={error} onRetry={reload} /> : loading && !data ? <Skeleton /> : data.subscribers.length === 0 ? <Empty title="No subscribers yet" text="People who sign up on the website appear here." /> : (
        <TableWrap>
          <thead><tr><th className={th}>Email</th><th className={th}>Subscribed</th><th className={th}><span className="sr-only">Remove</span></th></tr></thead>
          <tbody>{data.subscribers.map((s) => <tr key={s._id} className={tr} style={{ borderColor: "var(--line)" }}><td className={`${td} font-medium`}>{s.email}</td><td className={td}>{formatDate(s.subscribedAt)}</td><td className={`${td} text-right`}><button type="button" className="btn-ghost btn-sm" onClick={() => remove(s)} aria-label={`Remove ${s.email}`}><FiTrash2 /></button></td></tr>)}</tbody>
        </TableWrap>
      )}
      <Pagination page={data?.page || 1} pages={data?.pages} onChange={setPage} />
    </div>
  );
}
