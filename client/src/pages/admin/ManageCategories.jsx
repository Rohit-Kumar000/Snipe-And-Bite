import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import {
  fetchAllCategories, createCategory, updateCategory, deleteCategory,
} from "../../features/category/categorySlice";
import FoodImage from "../../components/common/FoodImage";
import Loader from "../../components/common/Loader";
import Modal from "../../components/common/Modal";
import Toggle from "../../components/admin/Toggle";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Seo from "../../components/common/Seo";
import ImageDropzone from "../../components/common/ImageDropzone";

export default function ManageCategories() {
  const dispatch = useDispatch();
  const { all, loading } = useSelector((state) => state.category);

  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = existing
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  useEffect(() => {
    dispatch(fetchAllCategories());
  }, [dispatch]);

  const openForm = (category = {}) => {
    setEditing(category);
    setName(category.name || "");
    setIsActive(category.isActive ?? true);
    setFile(null);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    formData.append("name", name);
    formData.append("isActive", isActive);
    if (file) formData.append("image", file);

    setSaving(true);
    try {
      if (editing._id) await dispatch(updateCategory({ id: editing._id, formData })).unwrap();
      else await dispatch(createCategory(formData)).unwrap();
      toast.success("Category saved");
      setEditing(null);
      dispatch(fetchAllCategories());
    } catch (message) {
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await dispatch(deleteCategory(toDelete._id)).unwrap();
      toast.success("Category deleted");
      setToDelete(null);
      dispatch(fetchAllCategories());
    } catch (message) {
      toast.error(message);
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Categories" />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-choco">Categories</h1>
        <button type="button" className="btn-primary" onClick={() => openForm()}><FiPlus /> Add category</button>
      </div>

      {loading && all.length === 0 ? (
        <Loader />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Category</th><th>Products</th><th>Visible</th><th className="text-right">Actions</th></tr></thead>
            <tbody>
              {all.length === 0 && (
                <tr><td colSpan={4} className="py-10 text-center text-gray-500">No categories yet. Add one to start building the menu.</td></tr>
              )}
              {all.map((category) => (
                <tr key={category._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <FoodImage src={category.image?.url} alt={category.name} className="h-11 w-11 shrink-0 rounded-full" />
                      <span className="font-semibold text-choco">{category.name}</span>
                    </div>
                  </td>
                  <td className="text-sm font-semibold">{category.itemCount ?? 0}</td>
                  <td>
                    <Toggle
                      checked={category.isActive}
                      label="Visible"
                      onChange={async (value) => {
                        const formData = new FormData();
                        formData.append("isActive", value);
                        try {
                          await dispatch(updateCategory({ id: category._id, formData })).unwrap();
                          dispatch(fetchAllCategories());
                        } catch (message) {
                          toast.error(message);
                        }
                      }}
                    />
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button type="button" className="btn-ghost btn-sm" onClick={() => openForm(category)}><FiEdit2 /> Edit</button>
                      <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(category)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?._id ? "Edit category" : "Add category"} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required />
          </div>
          <div>
            <label className="label" htmlFor="image">Image (optional)</label>
            <ImageDropzone file={file} onChange={setFile} currentImage={editing?._id ? editing.image?.url : ""} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
            <span className="text-sm font-medium">Visible to customers</span>
            <Toggle checked={isActive} onChange={setIsActive} label="Visible" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this category?"
        message={`"${toDelete?.name}" will be deleted. Categories that still have menu items cannot be deleted.`}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
