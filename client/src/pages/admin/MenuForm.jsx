import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiPlus, FiX,} from "react-icons/fi";
import { fetchMenuItem, createMenuItem, updateMenuItem } from "../../features/menu/menuSlice";
import api, { getErrorMessage } from "../../services/api";
import { fetchAllCategories, fetchCategories } from "../../features/category/categorySlice";
import { toLocalInputValue } from "../../utils/formatDate";
import Loader from "../../components/common/Loader";
import Toggle from "../../components/admin/Toggle";
import Seo from "../../components/common/Seo";
import ImageDropzone from "../../components/common/ImageDropzone";

const EMPTY = {
  name: "",
  description: "",
  price: "",
  category: "",
  isVeg: true,
  isAvailable: true,
  isBestseller: false,
  addOns: [],
  dealPrice: "",
  dealEndsAt: "",
  ingredients: "",
};

export default function MenuForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const categories = useSelector((state) => state.category.all);
  const { current, currentLoading } = useSelector((state) => state.menu);

  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [gallery, setGallery] = useState([]);

  useEffect(() => {
    dispatch(fetchAllCategories());
    if (isEdit) dispatch(fetchMenuItem(id));
  }, [dispatch, id, isEdit]);

  // Fill the form once the item has loaded.
  useEffect(() => {
    if (!isEdit || !current || current._id !== id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm({
      name: current.name,
      description: current.description || "",
      price: current.price,
      category: current.category?._id || "",
      isVeg: current.isVeg,
      isAvailable: current.isAvailable,
      isBestseller: current.isBestseller,
      addOns: current.addOns.map((a) => ({ name: a.name, price: a.price })),
      dealPrice: current.dealPrice ?? "",
      dealEndsAt: toLocalInputValue(current.dealEndsAt),
      ingredients: (current.ingredients || []).join(", "),
    });
    setGallery(current.gallery || []);
    setPreview(current.image?.url || "");
  }, [current, id, isEdit]);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleFile = (selected) => {
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const addGallery = async (event) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(picked.type)) return toast.error("Choose a JPG, PNG or WEBP image");
    if (picked.size > 5 * 1024 * 1024) return toast.error("Image must be smaller than 5 MB");
    const body = new FormData();
    body.append("image", picked);
    try { const { data } = await api.post(`/menu/${id}/gallery`, body); setGallery(data.gallery); toast.success("Photo added"); } catch (error) { toast.error(getErrorMessage(error)); }
    return undefined;
  };
  const dropGallery = async (index) => {
    try { const { data } = await api.delete(`/menu/${id}/gallery/${index}`); setGallery(data.gallery); } catch (error) { toast.error(getErrorMessage(error)); }
  };

  const updateAddOn = (index, key, value) =>
    setForm((f) => ({ ...f, addOns: f.addOns.map((a, i) => (i === index ? { ...a, [key]: value } : a)) }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isEdit && !file) return toast.error("Please choose an image for the item");

    const addOns = form.addOns
      .filter((a) => a.name.trim())
      .map((a) => ({ name: a.name.trim(), price: Number(a.price) || 0 }));

    const formData = new FormData();
    formData.append("name", form.name);
    formData.append("description", form.description);
    formData.append("price", form.price);
    formData.append("category", form.category);
    formData.append("isVeg", form.isVeg);
    formData.append("isAvailable", form.isAvailable);
    formData.append("isBestseller", form.isBestseller);
    formData.append("addOns", JSON.stringify(addOns));
    formData.append("ingredients", form.ingredients);
    formData.append("dealPrice", form.dealPrice === "" ? "" : form.dealPrice);
    formData.append("dealEndsAt", form.dealEndsAt ? new Date(form.dealEndsAt).toISOString() : "");
    if (file) formData.append("image", file);

    setSaving(true);
    try {
      if (isEdit) await dispatch(updateMenuItem({ id, formData })).unwrap();
      else await dispatch(createMenuItem(formData)).unwrap();
      dispatch(fetchCategories()); // the category count goes up or moves to the new category
      toast.success(isEdit ? "Item updated" : "Item created");
      navigate("/admin/menu");
    } catch (message) {
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && (currentLoading || !current || current._id !== id)) return <Loader fullPage />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Seo title={isEdit ? "Edit item" : "Add item"} />
      <div>
        <Link to="/admin/menu" className="text-sm text-gray-500 hover:text-brand">&larr; Menu items</Link>
        <h1 className="text-2xl font-bold text-choco">{isEdit ? "Edit menu item" : "Add menu item"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={form.name} onChange={set("name")} maxLength={80} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">Description</label>
            <textarea id="description" rows={3} maxLength={500} className="input" value={form.description} onChange={set("description")} />
          </div>
          <div>
            <label className="label" htmlFor="price">Price (Rs.)</label>
            <input id="price" type="number" min={1} step="0.01" className="input" value={form.price} onChange={set("price")} required />
          </div>
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" className="input" value={form.category} onChange={set("category")} required>
              <option value="">Select a category</option>
              {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            {categories.length === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                No categories yet. <Link to="/admin/categories" className="font-semibold underline">Create one first</Link>.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium">Vegetarian</span>
            <Toggle checked={form.isVeg} onChange={(value) => setForm((f) => ({ ...f, isVeg: value }))} label="Vegetarian" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium">Available</span>
            <Toggle checked={form.isAvailable} onChange={(value) => setForm((f) => ({ ...f, isAvailable: value }))} label="Available" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 sm:col-span-2">
            <span className="text-sm font-medium">Show as bestseller</span>
            <Toggle checked={form.isBestseller} onChange={(value) => setForm((f) => ({ ...f, isBestseller: value }))} label="Bestseller" />
          </div>
        </section>

        <section className="card space-y-3 p-8">
          <h2 className="font-semibold text-choco">Photo</h2>
          <div className="flex items-center gap-4">
            <div>
              <ImageDropzone file={file} onChange={handleFile} currentImage={isEdit ? preview : ""} />
              <p className="mt-1 text-xs text-gray-500">JPG, PNG or WEBP, up to 3 MB.</p>
            </div>
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-choco">Add-ons (optional)</h2>
            <button type="button" className="btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, addOns: [...f.addOns, { name: "", price: "" }] }))}>
              <FiPlus /> Add
            </button>
          </div>
          {form.addOns.length === 0 && <p className="text-sm text-gray-500">Example: Extra cheese, Extra sauce.</p>}
          {form.addOns.map((addOn, index) => (
            <div key={index} className="flex gap-2">
              <input className="input" placeholder="Add-on name" value={addOn.name} onChange={(e) => updateAddOn(index, "name", e.target.value)} maxLength={40} />
              <input className="input w-32" type="number" min={0} placeholder="Price" value={addOn.price} onChange={(e) => updateAddOn(index, "price", e.target.value)} />
              <button type="button" className="btn-danger" onClick={() => setForm((f) => ({ ...f, addOns: f.addOns.filter((_, i) => i !== index) }))} aria-label="Remove add-on">
                <FiX />
              </button>
            </div>
          ))}
        </section>

        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h2 className="font-semibold text-choco">Snipe the Deal (optional)</h2>
            <p className="text-xs text-gray-500">A flash price with a countdown. It switches back to the normal price automatically when the time ends. Leave both empty for no deal.</p>
          </div>
          <div>
            <label className="label" htmlFor="dealPrice">Deal price (Rs.)</label>
            <input id="dealPrice" type="number" min={0} step="0.01" className="input" value={form.dealPrice} onChange={set("dealPrice")} />
          </div>
          <div>
            <label className="label" htmlFor="dealEndsAt">Deal ends at</label>
            <input id="dealEndsAt" type="datetime-local" className="input" value={form.dealEndsAt} onChange={set("dealEndsAt")} />
          </div>
        </section>

              <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="ingredients">Ingredients shown to customers</label>
            <textarea id="ingredients" className="input" rows={2} value={form.ingredients} onChange={set("ingredients")} placeholder="Paneer, tomato, cream, butter" />
            <p className="mt-1 text-xs text-gray-500">Separate with commas. This is the list customers read, and is separate from the stock recipe in Product costing.</p>
          </div>
          {isEdit ? (
            <div>
              <p className="label">Extra photos ({gallery.length}/5)</p>
              <div className="flex flex-wrap gap-3">
                {gallery.map((g, i) => (
                  <div key={g.public_id || g.url} className="relative h-20 w-20 overflow-hidden rounded-xl">
                    <img src={g.url} alt="" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => dropGallery(i)} className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white" aria-label="Remove photo">×</button>
                  </div>
                ))}
                {gallery.length < 5 && <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border border-dashed text-2xl text-gray-500 hover:border-brand hover:text-brand" style={{ borderColor: "var(--line-strong)" }}>+<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={addGallery} /></label>}
              </div>
            </div>
          ) : <p className="text-xs text-gray-500">Save the item first, then edit it to add extra photos.</p>}
        </section>

        <div className="flex justify-end gap-3">
          <Link to="/admin/menu" className="btn-ghost">Cancel</Link>
          <button type="submit" className="btn-primary px-8" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create item"}
          </button>
        </div>
      </form>
    </div>
  );
}
