import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  createReservation, fetchMyReservations, cancelReservation,
} from "../features/reservation/reservationSlice";
import { formatClock, formatDate } from "../utils/formatDate";
import StatusBadge from "../components/common/StatusBadge";
import Loader from "../components/common/Loader";
import Seo from "../components/common/Seo";

export default function Reservation() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const settings = useSelector((state) => state.settings.data);
  const { mine, mineLoading } = useSelector((state) => state.reservation);

  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone || "",
    date: "",
    time: "",
    guests: 2,
    note: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dispatch(fetchMyReservations());
  }, [dispatch]);

  const field = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));
  const today = format(new Date(), "yyyy-MM-dd");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!/^[6-9]\d{9}$/.test(form.phone)) return toast.error("Enter a valid 10 digit mobile number");
    setSaving(true);
    try {
      await dispatch(createReservation({ ...form, guests: Number(form.guests) })).unwrap();
      toast.success("Reservation request sent. We will confirm it shortly.");
      setForm((f) => ({ ...f, date: "", time: "", note: "" }));
      dispatch(fetchMyReservations());
    } catch (message) {
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (id) => {
    try {
      await dispatch(cancelReservation(id)).unwrap();
      toast.success("Reservation cancelled");
      dispatch(fetchMyReservations());
    } catch (message) {
      toast.error(message);
    }
  };

  return (
    <div className="container-page py-8">
      <Seo title="Book a table" description="Reserve a table at Snipe&Bite." />
      <h1 className="mb-1 text-3xl font-bold text-choco">Book a table</h1>
      {settings?.openTime && (
        <p className="mb-6 text-sm text-gray-500">
          Open daily from {formatClock(settings.openTime)} to {formatClock(settings.closeTime)}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSubmit} className="card space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" value={form.name} onChange={field("name")} required />
            </div>
            <div>
              <label className="label" htmlFor="phone">Mobile number</label>
              <input id="phone" className="input" inputMode="numeric" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} required />
            </div>
            <div>
              <label className="label" htmlFor="date">Date</label>
              <input id="date" type="date" min={today} className="input" value={form.date} onChange={field("date")} required />
            </div>
            <div>
              <label className="label" htmlFor="time">Time</label>
              <input id="time" type="time" className="input" value={form.time} onChange={field("time")} required />
            </div>
            <div>
              <label className="label" htmlFor="guests">Guests</label>
              <input id="guests" type="number" min={1} max={20} className="input" value={form.guests} onChange={field("guests")} required />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="note">Special request (optional)</label>
            <textarea id="note" rows={3} maxLength={300} className="input" value={form.note} onChange={field("note")} />
          </div>
          <button type="submit" className="btn-primary w-full py-3" disabled={saving}>
            {saving ? "Sending..." : "Request reservation"}
          </button>
        </form>

        <section>
          <h2 className="mb-3 text-xl font-semibold text-choco">My reservations</h2>
          {mineLoading && mine.length === 0 ? (
            <Loader />
          ) : mine.length === 0 ? (
            <p className="card p-5 text-sm text-gray-500">You have no reservations yet.</p>
          ) : (
            <div className="space-y-3">
              {mine.map((reservation) => (
                <div key={reservation._id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-choco">
                      {formatDate(reservation.dateTime)} at {formatClock(reservation.time)}
                    </p>
                    <p className="text-sm text-gray-500">{reservation.guests} guests</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge kind="reservation" value={reservation.status} />
                    {["pending", "confirmed"].includes(reservation.status) && (
                      <button type="button" className="btn-danger btn-sm" onClick={() => handleCancel(reservation._id)}>
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
