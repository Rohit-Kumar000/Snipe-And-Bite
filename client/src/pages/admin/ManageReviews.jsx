import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiTrash2 } from "react-icons/fi";
import { fetchAllReviews, deleteReview } from "../../features/reviews/reviewSlice";
import { timeAgo } from "../../utils/formatDate";
import StarRating from "../../components/common/StarRating";
import Pagination from "../../components/common/Pagination";
import Loader from "../../components/common/Loader";
import ConfirmDialog from "../../components/admin/ConfirmDialog";
import Seo from "../../components/common/Seo";

export default function ManageReviews() {
  const dispatch = useDispatch();
  const { all, allPages, allLoading } = useSelector((state) => state.reviews);
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(() => dispatch(fetchAllReviews({ page, limit: 15 })), [dispatch, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    try {
      await dispatch(deleteReview(toDelete._id)).unwrap();
      toast.success("Review deleted");
      setToDelete(null);
      load();
    } catch (message) {
      toast.error(message);
    }
  };

  return (
    <div className="space-y-5">
      <Seo title="Reviews" />
      <div>
        <h1 className="text-2xl font-bold text-choco">Reviews</h1>
        <p className="text-sm text-gray-500">Remove only reviews that are abusive or spam.</p>
      </div>

      {allLoading && all.length === 0 ? (
        <Loader />
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Dish</th><th>Customer</th><th>Rating</th><th>Comment</th><th>When</th><th className="text-right">Action</th></tr></thead>
            <tbody>
              {all.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-gray-500">No reviews yet.</td></tr>}
              {all.map((r) => (
                <tr key={r._id}>
                  <td className="font-semibold text-choco">{r.menuItem?.name || "Deleted item"}</td>
                  <td>
                    <p>{r.user?.name || "Deleted user"}</p>
                    <p className="text-xs text-gray-500">{r.user?.email}</p>
                  </td>
                  <td><StarRating value={r.rating} size={13} /></td>
                  <td className="max-w-64 text-gray-600">{r.comment || "-"}</td>
                  <td className="text-xs text-gray-500">{timeAgo(r.createdAt)}</td>
                  <td className="text-right">
                    <button type="button" className="btn-danger btn-sm" onClick={() => setToDelete(r)}><FiTrash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination page={page} pages={allPages} onChange={setPage} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete this review?"
        message="The review will be removed and the dish rating will be recalculated."
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
