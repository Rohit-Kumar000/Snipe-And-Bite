import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2, FiX } from "react-icons/fi";
import api from "../../services/api";
import { fetchCombos, createCombo, updateCombo, deleteCombo } from "../../features/menu/menuSlice";
import { formatPrice } from "../../utils/formatPrice";
import FoodImage from "../../components/common/FoodImage";
import Modal from "../../components/common/Modal";
import Toggle from "../../components/admin/Toggle";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Seo from "../../components/common/Seo";
import ImageDropzone from "../../components/common/ImageDropzone";

const EMPTY = { name: "", description: "", price: "", isAvailable: true, items: [] };

export default function ManageCombos() {
  const dispatch = useDispatch();
  const combos = useSelector((state) => state.menu.combos);

  const [menuItems, setMenuItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => dispatch(fetchCombos()), [dispatch]);

  useEffect(() => {
    load();
    api.get("/menu", { params: { limit: 100, sort: "newest" } }).then(({ data }) => setMenuItems(data.items));
  }, [load]);

  const openForm = (combo = null) => {
    setEditing(combo || {});
    setFile(null);
    setForm(
      combo
        ? {
            name: combo.name,
            description: combo.description || "",
            price: combo.price,
            isAvailable: combo.isAvailable,
            items: combo.items.map((i) => ({ menuItem: i.menuItem?._id || "", qty: i.qty })),
          }
        : { ...EMPTY, items: [{ menuItem: "", qty: 1 }] }
    );
  };

  const updateRow = (index, key, value) =>
    setForm((f) => ({ ...f, items: f.items.map((row, i) => (i === index ? { ...row, [key]: value } : row)) }));

  const separateTotal = form.items.reduce((sum, row) => {
    const item = menuItems.find((m) => m._id === row.menuItem);
    return sum + (item ? item.price * (Number(row.qty) || 0) : 0);
  }, 0);

  const handleSave = async (event) => {
    event.preventDefault();
    const rows = form.items.filter((row) => row.menuItem);
    if (rows.length === 0) return toast.error("Add at least one menu item to the combo");
    if (!editing._id && !file) return toast.error("Please choose an image for the combo");

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("price", form.price);
    formData.append("isAvailable", form.isAvailable);
    formData.append("items", JSON.stringify(rows.map((r) => ({ menuItem: r.menuItem, qty: Number(r.qty) || 1 }))));
    if (file) formData.append("image", file);

    setSaving(true);
    try {
      if (editing._id) await dispatch(updateCombo({ id: editing._id, formData })).unwrap();
      else await dispatch(createCombo(formData)).unwrap();
      toast.success("Combo saved");
      setEditing(null);
      load();
    } catch (message) {
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteCombo(toDelete._id)).unwrap();
      toast.success("Combo deleted");
      setToDelete(null);
      load();
    } catch (message) {
      toast.error(message);
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Combos" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-choco">Bite Box combos</h1>
          <p className="text-sm text-gray-500">Bundle menu items at a special price.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => openForm()}><FiPlus /> Add combo</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Combo</th><th>Includes</th><th>Price</th><th>Available</th><th className="text-right">Actions</th></tr></thead>
          <tbody>
            {combos.length === 0 && (
              <tr><td colSpan={5} className="py-10 text-center text-gray-500">No combos yet.</td></tr>
            )}
            {combos.map((combo) => (
              <tr key={combo._id}>
                <td>
                  <div className="flex items-center gap-3">
                    <FoodImage src={combo.image?.url} alt={combo.name} className="h-12 w-12 shrink-0 rounded-xl" />
                    <span className="font-semibold text-choco">{combo.name}</span>
                  </div>
                </td>
                <td className="text-xs text-gray-600">{combo.items.map((i) => `${i.qty} x ${i.menuItem?.name}`).join(", ")}</td>
                <td>
                  {formatPrice(combo.price)}
                  <span className="ml-1 text-xs text-gray-400 line-through">{formatPrice(combo.originalPrice)}</span>
                </td>
                <td>
                  <Toggle
                    checked={combo.isAvailable}
                    label="Available"
                    onChange={async (value) => {
                      const formData = new FormData();
                      formData.append("isAvailable", value);
                      try {
                        await dispatch(updateCombo({ id: combo._id, formData })).unwrap();
                        load();
                      } catch (message) {
                        toast.error(message);
                      }
                    }}
                  />
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => openForm(combo)}><FiEdit2 /> Edit</button>
                    <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(combo)}><FiTrash2 /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? "Edit combo" : "Add combo"} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} maxLength={80} required />
            </div>
            <div>
              <label className="label" htmlFor="price">Combo price (Rs.)</label>
              <input id="price" type="number" min={1} step="0.01" className="input" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} required />
              {separateTotal > 0 && <p className="mt-1 text-xs text-gray-500">Items bought separately: {formatPrice(separateTotal)}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="description">Description</label>
              <input id="description" className="input" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={500} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="label mb-0">Items in this combo</span>
              <button type="button" className="btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { menuItem: "", qty: 1 }] }))}>
                <FiPlus /> Add item
              </button>
            </div>
            {form.items.map((row, index) => (
              <div key={index} className="flex gap-2">
                <select className="input" value={row.menuItem} onChange={(e) => updateRow(index, "menuItem", e.target.value)}>
                  <option value="">Select a menu item</option>
                  {menuItems.map((m) => <option key={m._id} value={m._id}>{m.name} ({formatPrice(m.price)})</option>)}
                </select>
                <input type="number" min={1} max={10} className="input w-24" value={row.qty} onChange={(e) => updateRow(index, "qty", e.target.value)} />
                <button type="button" className="btn-danger" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== index) }))} aria-label="Remove item">
                  <FiX />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className="label" htmlFor="image">Image {editing?._id ? "(leave empty to keep the current one)" : ""}</label>
            <ImageDropzone file={file} onChange={setFile} currentImage={editing?._id ? editing.image?.url : ""} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium">Available</span>
            <Toggle checked={form.isAvailable} onChange={(value) => setForm((f) => ({ ...f, isAvailable: value }))} label="Available" />
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save combo"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this combo?"
        message={`"${toDelete?.name}" will be removed permanently.`}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
