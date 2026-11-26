import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiTruck, FiShoppingBag, FiCoffee, FiTag, FiX } from "react-icons/fi";
import api, { getErrorMessage } from "../services/api";
import { clearCart, setCoupon, clearCoupon, toApiItems, selectCartSubtotal } from "../features/cart/cartSlice";
import { placeOrder } from "../features/orders/orderSlice";
import { applyCoupon } from "../features/coupon/couponSlice";
import { addAddress, loadUser } from "../features/auth/authSlice";
import { fetchPaymentConfig } from "../features/settings/settingsSlice";
import { payForOrder } from "../utils/razorpay";
import { formatPrice } from "../utils/formatPrice";
import useDebounce from "../hooks/useDebounce";
import EmptyState from "../components/common/EmptyState";
import Seo from "../components/common/Seo";

const ORDER_TYPES = [
  { value: "delivery", label: "Delivery", icon: FiTruck },
  { value: "pickup", label: "Pickup", icon: FiShoppingBag },
  { value: "dine-in", label: "Dine-in", icon: FiCoffee },
];

const EMPTY_ADDRESS = { label: "Home", line1: "", landmark: "", city: "", state: "", pincode: "" };

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const { items, couponCode } = useSelector((state) => state.cart);
  const subtotal = useSelector(selectCartSubtotal);
  const settings = useSelector((state) => state.settings.data);
  const paymentEnabled = useSelector((state) => state.settings.paymentEnabled);

  const defaultAddress = user.addresses.find((a) => a.isDefault) || user.addresses[0];

  const [orderType, setOrderType] = useState("delivery");
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [contactName, setContactName] = useState(user.name);
  const [contactPhone, setContactPhone] = useState(user.phone || "");
  const [addressId, setAddressId] = useState(defaultAddress ? defaultAddress._id : "new");
  const [newAddress, setNewAddress] = useState(EMPTY_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(true);
  const [tableNumber, setTableNumber] = useState("");
  const [note, setNote] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [redeemInput, setRedeemInput] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState("");
  const [placing, setPlacing] = useState(false);

  const redeemPoints = useDebounce(Number(redeemInput) || 0, 500);
  const closed = settings && !settings.isOpen;

  useEffect(() => {
    dispatch(fetchPaymentConfig());
  }, [dispatch]);

  // Ask the server for the real bill whenever something that affects the price changes.
  useEffect(() => {
    if (items.length === 0) return undefined;
    let cancelled = false;

    api
      .post("/orders/quote", { items: toApiItems(items), orderType, couponCode, redeemPoints })
      .then(({ data }) => {
        if (cancelled) return;
        setQuote(data.quote);
        setQuoteError("");
        if (data.quote.couponError) {
          toast.error(data.quote.couponError);
          dispatch(clearCoupon());
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(getErrorMessage(error));
      });

    return () => {
      cancelled = true;
    };
  }, [items, orderType, couponCode, redeemPoints, dispatch]);

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FiShoppingBag />}
        title="Nothing to checkout"
        text="Your cart is empty."
        actionLabel="Browse menu"
        actionTo="/menu"
      />
    );
  }

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    try {
      const result = await dispatch(applyCoupon({ code, items: toApiItems(items) })).unwrap();
      dispatch(setCoupon(result.coupon.code));
      setCouponInput("");
      toast.success(`Coupon applied. You save ${formatPrice(result.discount)}`);
    } catch (message) {
      toast.error(message);
    }
  };

  const updateNewAddress = (field) => (event) =>
    setNewAddress((address) => ({ ...address, [field]: event.target.value }));

  const buildAddress = () => {
    if (addressId !== "new") {
      const saved = user.addresses.find((a) => a._id === addressId);
      return saved
        ? { line1: saved.line1, landmark: saved.landmark, city: saved.city, state: saved.state, pincode: saved.pincode }
        : null;
    }
    return { ...newAddress };
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();

    if (!/^[6-9]\d{9}$/.test(contactPhone)) return toast.error("Enter a valid 10 digit mobile number");
    if (orderType === "dine-in" && !tableNumber.trim()) return toast.error("Enter your table number");

    let address;
    if (orderType === "delivery") {
      address = buildAddress();
      if (!address?.line1?.trim() || !address?.city?.trim() || !/^\d{6}$/.test(address?.pincode || "")) {
        return toast.error("Enter a complete delivery address with a 6 digit pincode");
      }
    }

    setPlacing(true);
    let order;
    try {
      const result = await dispatch(
        placeOrder({
          items: toApiItems(items),
          orderType,
          paymentMethod,
          contactName,
          contactPhone,
          address,
          tableNumber,
          note,
          couponCode,
          redeemPoints,
        })
      ).unwrap();
      order = result.order;
    } catch (message) {
      toast.error(message);
      setPlacing(false);
      return;
    }

    dispatch(clearCart());

    if (orderType === "delivery" && addressId === "new" && saveAddress && user.addresses.length < 5) {
      dispatch(addAddress({ ...newAddress, isDefault: user.addresses.length === 0 }));
    }

    if (paymentMethod === "ONLINE") {
      try {
        const result = await payForOrder(order, user);
        if (result.paid) {
          toast.success("Payment successful");
          dispatch(loadUser());
          navigate(`/order-success/${order._id}`, { replace: true });
        } else {
          toast.error("Payment was not completed. You can pay from the order page.");
          navigate(`/orders/${order._id}`, { replace: true });
        }
      } catch (error) {
        toast.error(getErrorMessage(error));
        navigate(`/orders/${order._id}`, { replace: true });
      }
      return;
    }

    dispatch(loadUser());
    navigate(`/order-success/${order._id}`, { replace: true });
  };

  return (
    <div className="container-page py-8">
      <Seo title="Checkout" />
      <h1 className="mb-6 text-3xl font-bold text-choco">Checkout</h1>

      {closed && (
        <div className="mb-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
          The restaurant is currently closed, so new orders cannot be placed right now.
        </div>
      )}

      <form onSubmit={handlePlaceOrder} className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          {/* Order type */}
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-choco">How would you like your order?</h2>
            <div className="grid grid-cols-3 gap-3">
              {ORDER_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setOrderType(value)}
                  className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-sm font-semibold transition ${
                    orderType === value ? "border-brand bg-brand/5 text-brand" : "border-gray-200 text-choco hover:border-brand/50"
                  }`}
                >
                  <Icon size={22} /> {label}
                </button>
              ))}
            </div>
          </section>

          {/* Contact */}
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold text-choco">Contact details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="contactName">Name</label>
                <input id="contactName" className="input" value={contactName} onChange={(e) => setContactName(e.target.value)} required />
              </div>
              <div>
                <label className="label" htmlFor="contactPhone">Mobile number</label>
                <input
                  id="contactPhone"
                  className="input"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  placeholder="10 digit number"
                  required
                />
              </div>
            </div>
          </section>

          {/* Address or table */}
          {orderType === "delivery" && (
            <section className="card space-y-3 p-5">
              <h2 className="font-semibold text-choco">Delivery address</h2>
              {user.addresses.map((address) => (
                <label
                  key={address._id}
                  className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 text-sm ${
                    addressId === address._id ? "border-brand bg-brand/5" : "border-gray-200"
                  }`}
                >
                  <input type="radio" name="address" className="mt-1 accent-brand" checked={addressId === address._id} onChange={() => setAddressId(address._id)} />
                  <span>
                    <span className="font-semibold">{address.label}</span>
                    <span className="block text-gray-600">
                      {[address.line1, address.landmark, address.city, address.state, address.pincode].filter(Boolean).join(", ")}
                    </span>
                  </span>
                </label>
              ))}
              <label
                className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 text-sm ${
                  addressId === "new" ? "border-brand bg-brand/5" : "border-gray-200"
                }`}
              >
                <input type="radio" name="address" className="mt-1 accent-brand" checked={addressId === "new"} onChange={() => setAddressId("new")} />
                <span className="font-semibold">Use a new address</span>
              </label>

              {addressId === "new" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="line1">Address</label>
                    <input id="line1" className="input" value={newAddress.line1} onChange={updateNewAddress("line1")} placeholder="House no, building, street" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label" htmlFor="landmark">Landmark (optional)</label>
                    <input id="landmark" className="input" value={newAddress.landmark} onChange={updateNewAddress("landmark")} />
                  </div>
                  <div>
                    <label className="label" htmlFor="city">City</label>
                    <input id="city" className="input" value={newAddress.city} onChange={updateNewAddress("city")} />
                  </div>
                  <div>
                    <label className="label" htmlFor="state">State</label>
                    <input id="state" className="input" value={newAddress.state} onChange={updateNewAddress("state")} />
                  </div>
                  <div>
                    <label className="label" htmlFor="pincode">Pincode</label>
                    <input
                      id="pincode"
                      className="input"
                      value={newAddress.pincode}
                      onChange={(e) => setNewAddress((a) => ({ ...a, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                      inputMode="numeric"
                    />
                  </div>
                  <label className="flex items-center gap-2 self-end pb-2 text-sm">
                    <input type="checkbox" className="accent-brand" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                    Save this address
                  </label>
                </div>
              )}

              {settings?.servicePincodes?.length > 0 && (
                <p className="text-xs text-gray-500">We deliver to pincodes: {settings.servicePincodes.join(", ")}</p>
              )}
            </section>
          )}

          {orderType === "dine-in" && (
            <section className="card p-5">
              <label className="label" htmlFor="table">Table number</label>
              <input id="table" className="input max-w-xs" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} maxLength={10} />
            </section>
          )}

          {orderType === "pickup" && (
            <section className="card p-5 text-sm text-gray-600">
              You will collect this order from the restaurant
              {settings?.address ? `: ${settings.address}` : ""}. We will let you know when it is ready.
            </section>
          )}

          {/* Payment */}
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold text-choco">Payment</h2>
            <label className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 text-sm ${paymentMethod === "COD" ? "border-brand bg-brand/5" : "border-gray-200"}`}>
              <input type="radio" name="payment" className="accent-brand" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
              <span className="font-semibold">Pay with cash</span>
              <span className="text-gray-500">(on delivery, pickup or at the table)</span>
            </label>
            {paymentEnabled && (
              <label className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 text-sm ${paymentMethod === "ONLINE" ? "border-brand bg-brand/5" : "border-gray-200"}`}>
                <input type="radio" name="payment" className="accent-brand" checked={paymentMethod === "ONLINE"} onChange={() => setPaymentMethod("ONLINE")} />
                <span className="font-semibold">Pay online</span>
                <span className="text-gray-500">(UPI, cards, net banking)</span>
              </label>
            )}
          </section>

          <section className="card p-5">
            <label className="label" htmlFor="note">Cooking instructions (optional)</label>
            <textarea id="note" className="input" rows={2} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: less spicy" />
          </section>
        </div>

        {/* Bill */}
        <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold text-choco">Order summary</h2>

          <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
            {items.map((item) => (
              <li key={item.key} className="flex justify-between gap-3">
                <span className="text-gray-700">
                  {item.qty} x {item.name}
                  {item.addOns.length > 0 && <span className="block text-xs text-gray-400">+ {item.addOns.map((a) => a.name).join(", ")}</span>}
                </span>
              </li>
            ))}
          </ul>

          {/* Coupon */}
          <div className="border-t border-black/5 pt-4">
            {couponCode ? (
              <div className="flex items-center justify-between rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
                <span className="flex items-center gap-2 font-semibold"><FiTag /> {couponCode} applied</span>
                <button type="button" onClick={() => dispatch(clearCoupon())} aria-label="Remove coupon"><FiX /></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input className="input uppercase" placeholder="Coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
                <button type="button" className="btn-dark" onClick={handleApplyCoupon}>Apply</button>
              </div>
            )}
          </div>

          {/* Loyalty points */}
          {user.loyaltyPoints > 0 && (
            <div>
              <label className="label" htmlFor="points">Use loyalty points (you have {user.loyaltyPoints})</label>
              <input
                id="points"
                className="input"
                inputMode="numeric"
                value={redeemInput}
                onChange={(e) => setRedeemInput(e.target.value.replace(/\D/g, ""))}
                placeholder="1 point = Rs. 1"
              />
              <p className="mt-1 text-xs text-gray-500">Points can cover up to half of the bill.</p>
            </div>
          )}

          {/* Totals */}
          <div className="space-y-2 border-t border-black/5 pt-4 text-sm">
            {quote ? (
              <>
                <Row label="Items total" value={formatPrice(quote.itemsTotal)} />
                {quote.discount > 0 && <Row label="Coupon discount" value={`- ${formatPrice(quote.discount)}`} green />}
                {quote.pointsRedeemed > 0 && <Row label="Loyalty points" value={`- ${formatPrice(quote.pointsRedeemed)}`} green />}
                <Row label={`Tax (${settings?.taxPercent ?? 0}%)`} value={formatPrice(quote.tax)} />
                {orderType === "delivery" && (
                  <Row label="Delivery charge" value={quote.deliveryCharge > 0 ? formatPrice(quote.deliveryCharge) : "Free"} />
                )}
                <div className="flex justify-between border-t border-black/5 pt-3 text-lg font-bold">
                  <span>To pay</span>
                  <span>{formatPrice(quote.totalAmount)}</span>
                </div>
                {quote.pointsToEarn > 0 && (
                  <p className="text-xs text-leaf">You will earn {quote.pointsToEarn} loyalty points after delivery.</p>
                )}
              </>
            ) : quoteError ? (
              <p className="rounded-xl bg-red-50 p-3 text-red-700">{quoteError}</p>
            ) : (
              <p className="text-gray-500">Calculating your bill...</p>
            )}
            {!quote && !quoteError && <Row label="Subtotal" value={formatPrice(subtotal)} />}
          </div>

          <button type="submit" className="btn-primary w-full py-3 text-base" disabled={placing || !quote || closed}>
            {placing ? "Placing order..." : paymentMethod === "ONLINE" ? "Place order and pay" : "Place order"}
          </button>
          <Link to="/cart" className="btn-ghost w-full">Back to cart</Link>
        </aside>
      </form>
    </div>
  );
}

function Row({ label, value, green = false }) {
  return (
    <div className={`flex justify-between ${green ? "text-leaf" : ""}`}>
      <span className={green ? "" : "text-gray-600"}>{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
