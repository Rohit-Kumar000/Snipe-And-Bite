import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiCopy, FiTag } from "react-icons/fi";
import { fetchDeals, fetchCombos } from "../features/menu/menuSlice";
import { fetchPublicCoupons } from "../features/coupon/couponSlice";
import { formatPrice } from "../utils/formatPrice";
import { formatDate } from "../utils/formatDate";
import FoodCard from "../components/common/FoodCard";
import ComboCard from "../components/common/ComboCard";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

const describeCoupon = (coupon) => {
  const base =
    coupon.discountType === "percent"
      ? `${coupon.discountValue}% off${coupon.maxDiscount > 0 ? ` up to ${formatPrice(coupon.maxDiscount)}` : ""}`
      : `${formatPrice(coupon.discountValue)} off`;
  return coupon.minOrder > 0 ? `${base} on orders above ${formatPrice(coupon.minOrder)}` : base;
};

export default function Offers() {
  const dispatch = useDispatch();
  const { deals, combos } = useSelector((state) => state.menu);
  const coupons = useSelector((state) => state.coupon.publicList);

  useEffect(() => {
    dispatch(fetchDeals());
    dispatch(fetchCombos());
    dispatch(fetchPublicCoupons());
  }, [dispatch]);

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Code ${code} copied`);
    } catch {
      toast.error("Could not copy the code");
    }
  };

  const nothing = deals.length === 0 && combos.length === 0 && coupons.length === 0;

  return (
    <div className="container-page space-y-12 py-8">
      <Seo title="Offers" description="Flash deals, combos and coupon codes from Snipe&Bite." />
      <div>
        <h1 className="text-3xl font-bold text-choco">Offers</h1>
        <p className="text-sm text-gray-500">Deals, combos and coupon codes you can use right now.</p>
      </div>

      {nothing && (
        <EmptyState
          icon={<FiTag />}
          title="No offers right now"
          text="New deals are added regularly. Please check again soon."
          actionLabel="Browse menu"
          actionTo="/menu"
        />
      )}

      {coupons.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold text-choco">Coupon codes</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {coupons.map((coupon) => (
              <div key={coupon.code} className="card flex items-center justify-between gap-3 border-dashed border-brand/40 p-4">
                <div className="min-w-0">
                  <p className="font-mono text-xl font-extrabold tracking-wider text-brand">{coupon.code}</p>
                  <p className="text-sm text-choco">{describeCoupon(coupon)}</p>
                  {coupon.description && <p className="text-xs text-gray-500">{coupon.description}</p>}
                  <p className="mt-1 text-xs text-gray-400">Valid till {formatDate(coupon.expiryDate)}</p>
                </div>
                <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => copyCode(coupon.code)}>
                  <FiCopy /> Copy
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {deals.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold text-choco">Snipe the Deal</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {deals.map((item) => <FoodCard key={item._id} item={item} />)}
          </div>
        </section>
      )}

      {combos.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold text-choco">Bite Box combos</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {combos.map((combo) => <ComboCard key={combo._id} combo={combo} />)}
          </div>
        </section>
      )}
    </div>
  );
}
