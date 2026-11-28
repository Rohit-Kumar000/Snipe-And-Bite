import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { fetchAllReservations, updateReservationStatus } from "../../features/reservation/reservationSlice";
import { formatDate, formatClock } from "../../utils/formatDate";
import StatusBadge from "../../components/common/StatusBadge";
import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import Seo from "../../components/common/Seo";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

export default function ManageReservations() {
  const dispatch = useDispatch();
  const { all, allPages, allLoading } = useSelector((state) => state.reservation);
  const [status, setStatus] = useState("");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(
    () => dispatch(fetchAllReservations({ status, date, page, limit: 15 })),
    [dispatch, status, date, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  const change = async (id, value) => {
    try {
      await dispatch(updateReservationStatus({ id, status: value })).unwrap();
      toast.success("Reservation updated");
      load();
    } catch (message) {
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Reservations" />
      <h1 className="text-2xl font-bold text-choco">Reservations</h1>

      <div className="grid gap-3 sm:grid-cols-[14rem_14rem]">
        <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <input type="date" className="input" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
      </div>

      {allLoading && all.length === 0 ? (
        <Loader />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>When</th><th>Guest</th><th>Guests</th><th>Note</th><th>Status</th><th>Change status</th></tr></thead>
            <tbody>
              {all.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-500">No reservations found.</td></tr>}
              {all.map((r) => (
                <tr key={r._id}>
                  <td>
                    <p className="font-semibold text-choco">{formatDate(r.dateTime)}</p>
                    <p className="text-xs text-gray-500">{formatClock(r.time)}</p>
                  </td>
                  <td>
                    <p className="font-medium">{r.name}</p>
                    <a href={`tel:${r.phone}`} className="text-xs text-brand hover:underline">{r.phone}</a>
                  </td>
                  <td>{r.guests}</td>
                  <td className="max-w-48 truncate text-xs text-gray-600" title={r.note}>{r.note || "-"}</td>
                  <td><StatusBadge kind="reservation" value={r.status} /></td>
                  <td>
                    <select className="input py-1.5" value={r.status} onChange={(e) => change(r._id, e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={allPages} onChange={setPage} />
    </div>
  );
}
