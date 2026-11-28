import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiEdit2, FiPlus, FiTrash2 } from "react-icons/fi";
import { fetchMenu, deleteMenuItem, toggleAvailability } from "../../features/menu/menuSlice";
import { fetchCategories } from "../../features/category/categorySlice";
import { formatPrice } from "../../utils/formatPrice";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import FoodImage from "../../components/common/FoodImage";
import VegMark from "../../components/common/VegMark";
import Loader from "../../components/common/Loader";
import Toggle from "../../components/admin/Toggle";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Seo from "../../components/common/Seo";

export default function ManageMenu() {
  const dispatch = useDispatch();
  const { items, loading, page, pages, total } = useSelector((state) => state.menu);
  const categories = useSelector((state) => state.category.list);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    () => dispatch(fetchMenu({ search, category, page: currentPage, limit: 10, sort: "newest" })),
    [dispatch, search, category, currentPage]
  );

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (item) => {
    try {
      await dispatch(toggleAvailability(item._id)).unwrap();
      toast.success(`${item.name} marked as ${item.isAvailable ? "sold out" : "available"}`);
      load();
      dispatch(fetchCategories()); // keeps the category counts on the website in step
    } catch (message) {
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteMenuItem(toDelete._id)).unwrap();
      toast.success("Item deleted");
      setToDelete(null);
      load();
      dispatch(fetchCategories()); // the category count drops by one
    } catch (message) {
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Menu items" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-choco">Menu items</h1>
          <p className="text-sm text-gray-500">{total} items</p>
        </div>
        <Link to="/admin/menu/new" className="btn-primary"><FiPlus /> Add item</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <SearchBar value={search} onSearch={(value) => { setSearch(value); setCurrentPage(1); }} placeholder="Search items..." />
        <select className="input" value={category} onChange={(e) => { setCategory(e.target.value); setCurrentPage(1); }}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
      </div>

      {loading && items.length === 0 ? (
        <Loader />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th><th>Category</th><th>Price</th><th>Available</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-gray-500">No items found. Add your first menu item.</td></tr>
              )}
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <FoodImage src={item.image?.url} alt={item.name} className="h-12 w-12 shrink-0 rounded-xl" />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 font-semibold text-choco"><VegMark isVeg={item.isVeg} /> {item.name}</p>
                        <p className="flex gap-1 text-xs">
                          {item.isBestseller && <span className="badge bg-accent/15 text-accent">Bestseller</span>}
                          {item.isDealActive && <span className="badge bg-brand/10 text-brand">Deal</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>{item.category?.name}</td>
                  <td>
                    {formatPrice(item.currentPrice)}
                    {item.isDealActive && <span className="ml-1 text-xs text-gray-400 line-through">{formatPrice(item.price)}</span>}
                  </td>
                  <td><Toggle checked={item.isAvailable} onChange={() => handleToggle(item)} label="Available" /></td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/menu/${item._id}/edit`} className="btn-ghost btn-sm"><FiEdit2 /> Edit</Link>
                      <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(item)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} pages={pages} onChange={setCurrentPage} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this item?"
        message={`"${toDelete?.name}" will be removed from the menu permanently.`}
        busy={deleting}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
