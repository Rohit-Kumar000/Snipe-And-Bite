import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Seo from "../components/common/Seo";
import { formatPrice } from "../utils/formatPrice";

const formatClock = (value) => {
  const [h, m] = String(value || "").split(":").map(Number);
  if (Number.isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

// Delivery charges, minimum order, free delivery limit, service area and hours are read from the
// restaurant's own settings, so this page always matches what checkout charges.
export default function ShippingPolicy() {
  const s = useSelector((state) => state.settings.data);
  const name = s?.restaurantName || "Snipe&Bite";
  const pincodes = s?.servicePincodes || [];

  const sections = [
    ["Delivery, pickup and dine-in", `${name} offers home delivery, pickup and dine-in. You choose the order type at checkout. Pickup and dine-in orders carry no delivery charge.`],
    ["Where we deliver", pincodes.length ? `We currently deliver to these pincodes: ${pincodes.join(", ")}. Checkout tells you straight away if your address is outside this area.` : "Checkout checks your address and tells you if it cannot be served."],
    ["Delivery charges", s?.deliveryCharge != null ? `Delivery costs ${formatPrice(s.deliveryCharge)} per order.${s.freeDeliveryAbove > 0 ? ` Delivery is free when your order is ${formatPrice(s.freeDeliveryAbove)} or more.` : ""} The exact amount is always shown in your order summary before you pay.` : "The delivery charge is shown in your order summary before you pay."],
    ["Minimum order", s?.minOrderAmount > 0 ? `The minimum order value is ${formatPrice(s.minOrderAmount)}.` : "There is no minimum order value."],
    ["Ordering hours", s?.openTime && s?.closeTime ? `We take orders between ${formatClock(s.openTime)} and ${formatClock(s.closeTime)}. When the restaurant is closed, checkout is paused.` : "Ordering hours are shown on the contact page."],
    ["Delivery time", "Food is prepared fresh after you order, so timing depends on the kitchen's workload, distance, traffic and weather. Any time shown is an estimate. You can follow your order live from the tracking page."],
    ["Receiving your order", "Please keep your phone reachable and give accurate address details and landmarks. If we cannot reach you at the address, we will try to contact you using the number on the order."],
    ["Problems with delivery", "If an order is late, incomplete or incorrect, contact us with your order number and we will look into it. Refunds for eligible cases follow our terms and refund policy."],
  ];

  return (
    <article className="container-page max-w-4xl py-12 sm:py-16">
      <Seo title="Shipping and delivery policy" description={`Delivery areas, charges and timings for ${name}.`} />
      <header className="mb-10 border-b pb-8" style={{ borderColor: "var(--line)" }}>
        <p className="eyebrow">Delivery</p>
        <h1 className="mt-2 text-4xl font-bold text-choco sm:text-5xl">Shipping &amp; delivery policy</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-gray-500">How and where {name} delivers, what it costs and what to do if something goes wrong.</p>
      </header>
      <div className="space-y-8">
        {sections.map(([title, body]) => (
          <section key={title} className="space-y-2">
            <h2 className="font-sans text-xl font-bold text-choco">{title}</h2>
            <p className="leading-7 text-gray-600">{body}</p>
          </section>
        ))}
      </div>
      <div className="card mt-10 p-5 text-sm leading-6 text-gray-600">Questions about a delivery? <Link className="font-semibold text-brand hover:underline" to="/contact">Contact us</Link> or read the <Link className="font-semibold text-brand hover:underline" to="/terms-refund">terms and refund policy</Link>.</div>
    </article>
  );
}
