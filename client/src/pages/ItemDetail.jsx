import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiMinus, FiPlus, FiShoppingCart, FiZap, FiHeart } from "react-icons/fi";
import api from "../services/api";
import { setWishlistItem } from "../features/auth/authSlice";
import FoodCard from "../components/common/FoodCard";
import { fetchMenuItem } from "../features/menu/menuSlice";
import { addToCart } from "../features/cart/cartSlice";
import { fetchItemReviews, addReview } from "../features/reviews/reviewSlice";
import { formatPrice } from "../utils/formatPrice";
import { timeAgo } from "../utils/formatDate";
import FoodImage from "../components/common/FoodImage";
import VegMark from "../components/common/VegMark";
import StarRating from "../components/common/StarRating";
import CountdownTimer from "../components/common/CountdownTimer";
import Loader from "../components/common/Loader";
import EmptyState from "../components/common/EmptyState";
import Pagination from "../components/common/Pagination";
import Seo from "../components/common/Seo";

export default function ItemDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { current: item, currentLoading, currentError } = useSelector((state) => state.menu);
  const { itemReviews, itemPages, itemTotal, itemLoading } = useSelector((state) => state.reviews);
  const user = useSelector((state) => state.auth.user);

  const [qty, setQty] = useState(1);
  const [selectedAddOns, setSelectedAddOns] = useState([]);
  const [reviewPage, setReviewPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [related, setRelated] = useState([]);
  const [saved, setSaved] = useState(false);

  // Related dishes come from the same category, never the dish being viewed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveImage(0);
    const categoryId = item?.category?._id;
    if (!categoryId || item?._id !== id) { setRelated([]); return undefined; }
    let alive = true;
    api.get("/menu", { params: { category: categoryId, available: true, limit: 5 } })
      .then(({ data }) => alive && setRelated((data.items || []).filter((entry) => entry._id !== id).slice(0, 4)))
      .catch(() => alive && setRelated([]));
    return () => { alive = false; };
  }, [item?._id, item?.category?._id, id]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSaved(Boolean(user?.wishlist?.some((itemId) => String(itemId) === String(id)))); }, [user?.wishlist, id]);

  useEffect(() => {
    dispatch(fetchMenuItem(id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQty(1);
    setSelectedAddOns([]);
    setReviewPage(1);
  }, [dispatch, id]);

  useEffect(() => {
    dispatch(fetchItemReviews({ id, page: reviewPage }));
  }, [dispatch, id, reviewPage]);

  if (currentLoading) return <Loader fullPage />;
  if (currentError || !item) {
    return <EmptyState title="Dish not found" text={currentError} actionLabel="Back to menu" actionTo="/menu" />;
  }

  const addOnTotal = item.addOns
    .filter((a) => selectedAddOns.includes(a.name))
    .reduce((sum, a) => sum + a.price, 0);
  const unit = item.currentPrice + addOnTotal;

  const toggleSaved = async () => {
    if (!user) { toast("Sign in to save dishes to your wishlist"); return; }
    try {
      const { data } = await api.put(`/users/wishlist/${item._id}`);
      setSaved(data.saved);
      dispatch(setWishlistItem({ itemId: item._id, saved: data.saved }));
      toast.success(data.saved ? "Saved to your wishlist" : "Removed from your wishlist");
    } catch { toast.error("Could not update your wishlist"); }
  };

  const images = [item.image?.url, ...(item.gallery || []).map((g) => g.url)].filter(Boolean);

  const toggleAddOn = (name) =>
    setSelectedAddOns((list) => (list.includes(name) ? list.filter((n) => n !== name) : [...list, name]));

  const handleAdd = () => {
    dispatch(
      addToCart({
        type: "menu",
        id: item._id,
        name: item.name,
        image: item.image?.url || "",
        isVeg: item.isVeg,
        price: item.currentPrice,
        addOns: item.addOns.filter((a) => selectedAddOns.includes(a.name)).map((a) => ({ name: a.name, price: a.price })),
        qty,
      })
    );
    toast.success(`${item.name} added to cart`);
  };

  const submitReview = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await dispatch(addReview({ menuItem: item._id, rating, comment })).unwrap();
      toast.success("Thanks for your review");
      setComment("");
      dispatch(fetchMenuItem(id));
      setReviewPage(1);
      dispatch(fetchItemReviews({ id, page: 1 }));
    } catch (message) {
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-8">
      <Seo title={item.name} description={item.description} />

      <div className="grid gap-8 md:grid-cols-2">
        <div>
        <div className="relative overflow-hidden rounded-3xl">
          <FoodImage src={images[activeImage] || item.image?.url} alt={item.name} className="aspect-square w-full" />
          {!item.isAvailable && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-bold text-white">
              Sold out
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product photos">
            {images.map((src, i) => (
              <button key={src} type="button" role="tab" aria-selected={i === activeImage} onClick={() => setActiveImage(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition ${i === activeImage ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"}`}>
                <img src={src} alt={`${item.name} photo ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
        </div>

        <div className="space-y-5">
          <div>
            <p className="text-sm text-gray-500">
              <Link to="/menu" className="hover:text-brand">Menu</Link>
              {item.category && <> / <Link to={`/menu?category=${item.category._id}`} className="hover:text-brand">{item.category.name}</Link></>}
            </p>
            <div className="mt-2 flex items-start gap-2">
              <span className="mt-2"><VegMark isVeg={item.isVeg} /></span>
              <h1 className="text-3xl font-bold text-choco">{item.name}</h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {item.numReviews > 0 ? (
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <StarRating value={item.avgRating} /> {item.avgRating} ({item.numReviews} reviews)
                </span>
              ) : (
                <span className="text-sm text-gray-400">No reviews yet</span>
              )}
              {item.isBestseller && <span className="badge bg-accent text-white">Bestseller</span>}
            </div>
          </div>

          {item.description && <p className="text-gray-600">{item.description}</p>}
          {item.ingredients?.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--muted-strong)" }}>Ingredients</h2>
              <ul className="flex flex-wrap gap-2">{item.ingredients.map((name) => <li key={name} className="rounded-full px-3 py-1 text-sm" style={{ background: "var(--surface-2)" }}>{name}</li>)}</ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-3xl font-extrabold">{formatPrice(item.currentPrice)}</span>
            {item.isDealActive && (
              <>
                <span className="text-lg text-gray-400 line-through">{formatPrice(item.price)}</span>
                <span className="badge bg-brand text-white">
                  <FiZap /> Ends in <CountdownTimer endsAt={item.dealEndsAt} compact />
                </span>
              </>
            )}
          </div>

          {item.addOns.length > 0 && (
            <div>
              <h3 className="mb-2 font-semibold text-choco">Add-ons</h3>
              <div className="space-y-2">
                {item.addOns.map((addOn) => (
                  <label key={addOn.name} className="flex cursor-pointer items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-brand">
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedAddOns.includes(addOn.name)}
                        onChange={() => toggleAddOn(addOn.name)}
                        className="h-4 w-4 accent-brand"
                      />
                      {addOn.name}
                    </span>
                    <span className="text-sm text-gray-600">+ {formatPrice(addOn.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <div className="inline-flex items-center rounded-full border border-gray-300 bg-white">
              <button type="button" className="p-3 hover:text-brand" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity">
                <FiMinus />
              </button>
              <span className="min-w-10 text-center font-semibold">{qty}</span>
              <button type="button" className="p-3 hover:text-brand" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Increase quantity">
                <FiPlus />
              </button>
            </div>
            <button type="button" className="btn-primary flex-1 py-3 text-base" disabled={!item.isAvailable} onClick={handleAdd}>
              <FiShoppingCart /> Add to cart - {formatPrice(unit * qty)}
            </button>
            <button type="button" onClick={toggleSaved} aria-pressed={saved} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} className="flex h-12 w-12 items-center justify-center rounded-full border text-brand transition hover:scale-105 hover:bg-brand/10" style={{ borderColor: "var(--line-strong)" }}>
              <FiHeart size={20} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-5 text-2xl font-bold text-choco">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{related.map((entry) => <FoodCard key={entry._id} item={entry} />)}</div>
        </section>
      )}

      <section className="mt-14 max-w-3xl" id="reviews">
        <h2 className="mb-4 text-2xl font-bold text-choco">Customer reviews ({itemTotal})</h2>

        {user ? (
          <form onSubmit={submitReview} className="card mb-6 space-y-3 p-5">
            <h3 className="font-semibold text-choco">Rate this dish</h3>
            <p className="text-xs text-gray-500">You can review a dish after it has been delivered to you in an order.</p>
            <StarRating value={rating} onChange={setRating} size={24} />
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Tell others what you liked (optional)"
              className="input"
            />
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit review"}
            </button>
          </form>
        ) : (
          <p className="card mb-6 p-5 text-sm text-gray-600">
            <Link to="/login" state={{ from: `/menu/${id}` }} className="font-semibold text-brand hover:underline">Login</Link>{" "}
            to write a review.
          </p>
        )}

        {itemLoading ? (
          <Loader />
        ) : itemReviews.length === 0 ? (
          <p className="text-sm text-gray-500">Be the first to review this dish.</p>
        ) : (
          <div className="space-y-4">
            {itemReviews.map((review) => (
              <div key={review._id} className="card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-choco">{review.user?.name || "Customer"}</span>
                  <span className="text-xs text-gray-400">{timeAgo(review.createdAt)}</span>
                </div>
                <StarRating value={review.rating} size={14} />
                {review.comment && <p className="mt-2 text-sm text-gray-600">{review.comment}</p>}
              </div>
            ))}
            <Pagination page={reviewPage} pages={itemPages} onChange={setReviewPage} />
          </div>
        )}
      </section>
    </div>
  );
}
