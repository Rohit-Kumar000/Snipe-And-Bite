import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { format } from "date-fns";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  fetchCoupons, createCoupon, updateCoupon, deleteCoupon,
} from "../../features/coupon/couponSlice";
import { formatPrice } from "../../utils/formatPrice";
import { formatDate } from "../../utils/formatDate";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Toggle from "../../components/admin/Toggle";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Seo from "../../components/common/Seo";

const EMPTY = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "",
  maxDiscount: 0,
  minOrder: 0,
  expiryDate: "",
  usageLimit: 0,
  perUserLimit: 1,
  isActive: true,
};

export default function ManageCoupons() {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((state) => state.coupon);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchCoupons());
  }, [dispatch]);

  const openForm = (coupon = null) => {
    setEditing(coupon || {});
    setForm(coupon ? { ...coupon, expiryDate: format(new Date(coupon.expiryDate), "yyyy-MM-dd") } : EMPTY);
  };

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSave = async (event) => {
    event.preventDefault();
    // The coupon stays valid through the whole expiry day (end of day, Indian Standard Time).
    const body = {
      code: form.code.trim().toUpperCase(),
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscount: Number(form.maxDiscount) || 0,
      minOrder: Number(form.minOrder) || 0,
      expiryDate: new Date(`${form.expiryDate}T23:59:59+05:30`).toISOString(),
      usageLimit: Number(form.usageLimit) || 0,
      perUserLimit: Number(form.perUserLimit) || 0,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editing._id) await dispatch(updateCoupon({ id: editing._id, body })).unwrap();
      else await dispatch(createCoupon(body)).unwrap();
      toast.success("Coupon saved");
      setEditing(null);
      dispatch(fetchCoupons());
    } catch (message) {
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteCoupon(toDelete._id)).unwrap();
      toast.success("Coupon deleted");
      setToDelete(null);
      dispatch(fetchCoupons());
    } catch (message) {
      toast.error(message);
    }
  };

  const describe = (c) =>
    c.discountType === "percent"
      ? `${c.discountValue}%${c.maxDiscount > 0 ? ` (max ${formatPrice(c.maxDiscount)})` : ""}`
      : formatPrice(c.discountValue);

  return (
    <div className="space-y-5">
      <Seo title="Coupons" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-choco">Coupons</h1>
        <button type="button" className="btn-primary" onClick={() => openForm()}><FiPlus /> Add coupon</button>
      </div>

      {loading && list.length === 0 ? (
        <Loader />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Used</th><th>Expires</th><th>Active</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {list.length === 0 && <tr><td colSpan={7} className="py-10 text-center text-gray-500">No coupons yet.</td></tr>}
              {list.map((coupon) => {
                const expired = new Date(coupon.expiryDate) < new Date();
                return (
                  <tr key={coupon._id}>
                    <td>
                      <p className="font-mono font-bold text-brand">{coupon.code}</p>
                      {coupon.description && <p className="text-xs text-gray-500">{coupon.description}</p>}
                    </td>
                    <td>{describe(coupon)}</td>
                    <td>{coupon.minOrder > 0 ? formatPrice(coupon.minOrder) : "None"}</td>
                    <td>{coupon.usedCount}{coupon.usageLimit > 0 ? ` / ${coupon.usageLimit}` : ""}</td>
                    <td>
                      {formatDate(coupon.expiryDate)}
                      {expired && <span className="badge ml-1 bg-red-100 text-red-700">Expired</span>}
                    </td>
                    <td>
                      <Toggle
                        checked={coupon.isActive}
                        label="Active"
                        onChange={async (value) => {
                          try {
                            await dispatch(updateCoupon({ id: coupon._id, body: { isActive: value } })).unwrap();
                            dispatch(fetchCoupons());
                          } catch (message) {
                            toast.error(message);
                          }
                        }}
                      />
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-ghost btn-sm" onClick={() => openForm(coupon)}><FiEdit2 /> Edit</button>
                        <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(coupon)}><FiTrash2 /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? "Edit coupon" : "Add coupon"} size="lg">
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="code">Code</label>
            <input id="code" className="input uppercase" value={form.code} onChange={set("code")} maxLength={20} required />
          </div>
          <div>
            <label className="label" htmlFor="expiryDate">Valid until</label>
            <input id="expiryDate" type="date" className="input" value={form.expiryDate} onChange={set("expiryDate")} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description (shown to customers)</label>
            <input id="description" className="input" value={form.description} onChange={set("description")} maxLength={150} />
          </div>
          <div>
            <label className="label" htmlFor="discountType">Discount type</label>
            <select id="discountType" className="input" value={form.discountType} onChange={set("discountType")}>
              <option value="percent">Percentage</option>
              <option value="flat">Flat amount (Rs.)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="discountValue">Discount value</label>
            <input id="discountValue" type="number" min={1} max={form.discountType === "percent" ? 100 : undefined} className="input" value={form.discountValue} onChange={set("discountValue")} required />
          </div>
          {form.discountType === "percent" && (
            <div>
              <label className="label" htmlFor="maxDiscount">Maximum discount (Rs., 0 = no limit)</label>
              <input id="maxDiscount" type="number" min={0} className="input" value={form.maxDiscount} onChange={set("maxDiscount")} />
            </div>
          )}
          <div>
            <label className="label" htmlFor="minOrder">Minimum order (Rs.)</label>
            <input id="minOrder" type="number" min={0} className="input" value={form.minOrder} onChange={set("minOrder")} />
          </div>
          <div>
            <label className="label" htmlFor="usageLimit">Total usage limit (0 = unlimited)</label>
            <input id="usageLimit" type="number" min={0} className="input" value={form.usageLimit} onChange={set("usageLimit")} />
          </div>
          <div>
            <label className="label" htmlFor="perUserLimit">Uses per customer (0 = unlimited)</label>
            <input id="perUserLimit" type="number" min={0} className="input" value={form.perUserLimit} onChange={set("perUserLimit")} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-medium">Active</span>
            <Toggle checked={form.isActive} onChange={(value) => setForm((f) => ({ ...f, isActive: value }))} label="Active" />
          </div>
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save coupon"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this coupon?"
        message={`Coupon ${toDelete?.code} will be deleted. Past orders keep their discount.`}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
