import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  fetchAllBanners, createBanner, updateBanner, deleteBanner,
} from "../../features/admin/adminSlice";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Toggle from "../../components/admin/Toggle";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Seo from "../../components/common/Seo";
import { optimizeImage } from "../../utils/image";
import ImageDropzone from "../../components/common/ImageDropzone";

const EMPTY = { title: "", subtitle: "", link: "/menu", order: 0, isActive: true };

export default function ManageBanners() {
  const dispatch = useDispatch();
  const { banners, bannersLoading } = useSelector((state) => state.admin);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchAllBanners());
  }, [dispatch]);

  const openForm = (banner = null) => {
    setEditing(banner || {});
    setFile(null);
    setForm(
      banner
        ? { title: banner.title, subtitle: banner.subtitle || "", link: banner.link || "/menu", order: banner.order, isActive: banner.isActive }
        : EMPTY
    );
  };

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const handleSave = async (event) => {
    event.preventDefault();
    if (!editing._id && !file) return toast.error("Please choose a banner image");

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.append(key, value));
    if (file) formData.append("image", file);

    setSaving(true);
    try {
      if (editing._id) await dispatch(updateBanner({ id: editing._id, formData })).unwrap();
      else await dispatch(createBanner(formData)).unwrap();
      toast.success("Banner saved");
      setEditing(null);
      dispatch(fetchAllBanners());
    } catch (message) {
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteBanner(toDelete._id)).unwrap();
      toast.success("Banner deleted");
      setToDelete(null);
      dispatch(fetchAllBanners());
    } catch (message) {
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Banners" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-choco">Home page banners</h1>
          <p className="text-sm text-gray-500">Wide images (for example 1600 x 600) work best. Keep the main subject in the middle so it stays visible on phones. Active banners rotate on the home page.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => openForm()}><FiPlus /> Add banner</button>
      </div>

      {bannersLoading && banners.length === 0 ? (
        <Loader />
      ) : banners.length === 0 ? (
        <p className="card p-6 text-sm text-gray-500">No banners yet. Without banners, the home page shows the default brand hero.</p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner) => (
            <div key={banner._id} className="card overflow-hidden">
              <img src={optimizeImage(banner.image.url)} alt={banner.title} className="aspect-8/3 w-full object-cover object-center" decoding="async" />
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-choco">{banner.title}</p>
                    {banner.subtitle && <p className="truncate text-xs text-gray-500">{banner.subtitle}</p>}
                    <p className="text-xs text-gray-400">Link: {banner.link} &middot; Order: {banner.order}</p>
                  </div>
                  <Toggle
                    checked={banner.isActive}
                    label="Active"
                    onChange={async (value) => {
                      const formData = new FormData();
                      formData.append("isActive", value);
                      try {
                        await dispatch(updateBanner({ id: banner._id, formData })).unwrap();
                        dispatch(fetchAllBanners());
                      } catch (message) {
                        toast.error(message);
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => openForm(banner)}><FiEdit2 /> Edit</button>
                  <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(banner)}><FiTrash2 /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? "Edit banner" : "Add banner"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" className="input" value={form.title} onChange={set("title")} maxLength={80} required />
          </div>
          <div>
            <label className="label" htmlFor="subtitle">Subtitle (optional)</label>
            <input id="subtitle" className="input" value={form.subtitle} onChange={set("subtitle")} maxLength={160} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="link">Button link</label>
              <input id="link" className="input" value={form.link} onChange={set("link")} placeholder="/menu" />
            </div>
            <div>
              <label className="label" htmlFor="order">Display order</label>
              <input id="order" type="number" className="input" value={form.order} onChange={set("order")} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="image">Image {editing?._id ? "(leave empty to keep the current one)" : ""}</label>
            <ImageDropzone file={file} onChange={setFile} currentImage={editing?._id ? editing.image?.url : ""} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium">Active</span>
            <Toggle checked={form.isActive} onChange={(value) => setForm((f) => ({ ...f, isActive: value }))} label="Active" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save banner"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this banner?"
        message={`"${toDelete?.title}" will be removed from the home page.`}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
