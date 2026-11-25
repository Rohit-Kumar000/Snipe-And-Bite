import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiArrowRight, FiShoppingBag, FiTruck, FiSmile, FiCoffee, FiClock, FiShield, FiStar, FiMapPin, FiCalendar, FiGift } from "react-icons/fi";
import { fetchBanners, fetchDeals, fetchBestsellers, fetchCombos } from "../features/menu/menuSlice";
import { fetchCategories } from "../features/category/categorySlice";
import HeroSlider from "../components/common/HeroSlider";
import FoodCard from "../components/common/FoodCard";
import ComboCard from "../components/common/ComboCard";
import FoodImage from "../components/common/FoodImage";
import CountdownTimer from "../components/common/CountdownTimer";
import Seo from "../components/common/Seo";
import Reveal from "../components/common/Reveal";
import ReviewsShowcase from "../components/common/ReviewsShowcase";
import NewsletterForm from "../components/common/NewsletterForm";
import api from "../services/api";

const SectionHeader = ({ title, subtitle, to, eyebrow }) => (
  <Reveal className="mb-8 flex items-end justify-between gap-4">
    <div>
      {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
      <h2 className="section-title">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </div>
    {to && (
      <Link to={to} className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand hover:underline">
        View all <FiArrowRight />
      </Link>
    )}
  </Reveal>
);

const STEPS = [
  { icon: FiShoppingBag, title: "Choose your food", text: "Browse the menu and add your favourites to the cart." },
  { icon: FiTruck, title: "Delivery, pickup or dine-in", text: "Pick how you want to receive your order and pay online or in cash." },
  { icon: FiCoffee, title: "We cook it fresh", text: "The kitchen starts only after you order, so it reaches you hot." },
  { icon: FiSmile, title: "Track and enjoy", text: "Follow your order live from the kitchen to your table or door." },
];

const FEATURES = [
  { icon: FiClock, title: "Live order tracking", text: "See every step from placed to delivered, with status updates by email." },
  { icon: FiShield, title: "Secure payments", text: "Pay online through a trusted gateway or choose cash on delivery." },
  { icon: FiStar, title: "Real reviews", text: "Ratings come only from customers who received the dish." },
  { icon: FiGift, title: "Loyalty rewards", text: "Earn points on delivered orders and use them on your next one." },
  { icon: FiMapPin, title: "Saved addresses", text: "Keep up to five addresses and check out in seconds." },
  { icon: FiCalendar, title: "Table reservations", text: "Book a table online and walk in to a reserved seat." },
];

const MODES = [
  { icon: FiTruck, title: "Delivery", text: "Hot food at your door." },
  { icon: FiShoppingBag, title: "Pickup", text: "Order ahead, skip the wait." },
  { icon: FiCoffee, title: "Dine-in", text: "Fresh from the kitchen to your table." },
];

export default function Home() {
  const dispatch = useDispatch();
  const { banners, deals, bestsellers, combos } = useSelector((state) => state.menu);
  const categories = useSelector((state) => state.category.list);
  const settings = useSelector((state) => state.settings.data);
  const [arrivals, setArrivals] = useState([]);

  useEffect(() => {
    dispatch(fetchBanners());
    dispatch(fetchCategories());
    dispatch(fetchDeals());
    dispatch(fetchBestsellers());
    dispatch(fetchCombos());
    let alive = true;
    api.get("/menu", { params: { sort: "newest", available: true, limit: 8 } }).then(({ data }) => alive && setArrivals(data.items || [])).catch(() => {});
    return () => { alive = false; };
  }, [dispatch]);

  const nextDealEnd = deals.length > 0 ? deals[0].dealEndsAt : null;

  return (
    <>
      <Seo
        title="Order food online"
        description="Order fresh food online from Snipe&Bite for delivery, pickup or dine-in."
      />
      <HeroSlider banners={banners} tagline={settings?.tagline} />

      {categories.length > 0 && (
        <section className="container-page mt-16">
          <SectionHeader title="Browse by category" to="/menu" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <Link
                key={category._id}
                to={`/menu?category=${category._id}`}
                className="card group flex flex-col items-center gap-3 p-4 text-center transition hover:shadow-md"
              >
                <FoodImage
                  src={category.image?.url}
                  alt={category.name}
                  className="h-20 w-20 rounded-full transition group-hover:scale-105"
                />
                <span className="text-sm font-semibold text-choco">{category.name}</span>
                {typeof category.itemCount === "number" && <span className="text-xs" style={{ color: "var(--muted)" }}>{category.itemCount} {category.itemCount === 1 ? "item" : "items"}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {deals.length > 0 && (
        <section className="container-page mt-14">
          <div className="rounded-3xl p-5 sm:p-8" style={{ background: "linear-gradient(135deg, #ffa94d, #ff7a00 55%, #e56a00)" }}>
            <div className="mb-6 flex flex-col gap-4 text-white sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-extrabold sm:text-3xl">Snipe the Deal</h2>
                <p className="text-sm text-white/85">Flash offers that disappear when the timer hits zero.</p>
              </div>
              <CountdownTimer endsAt={nextDealEnd} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {deals.slice(0, 4).map((item) => (
                <FoodCard key={item._id} item={item} />
              ))}
            </div>
            {deals.length > 4 && (
              <div className="mt-5 text-center">
                <Link to="/offers" className="btn-dark">See all deals</Link>
              </div>
            )}
          </div>
        </section>
      )}

      {bestsellers.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader title="Bestsellers" subtitle="What our customers order the most" to="/menu" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {bestsellers.slice(0, 8).map((item) => (
              <FoodCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}

      {arrivals.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader eyebrow="Just added" title="New arrivals" subtitle="Fresh on the menu" to="/menu?sort=newest" />
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {arrivals.map((item) => <FoodCard key={item._id} item={item} />)}
          </div>
        </section>
      )}

      {combos.length > 0 && (
        <section className="container-page mt-14">
          <SectionHeader title="Bite Box combos" subtitle="More food, better price" to="/offers" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {combos.slice(0, 4).map((combo) => (
              <ComboCard key={combo._id} combo={combo} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page mt-24">
        <SectionHeader eyebrow="Your way" title="Delivery, pickup or dine-in" subtitle="One menu, three ways to enjoy it" />
        <div className="grid gap-5 sm:grid-cols-3">
          {MODES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 100}>
              <Link to="/menu" className="card card-hover group flex h-full items-center gap-5 p-6">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand transition group-hover:bg-brand group-hover:text-white"><Icon size={28} /></span>
                <span><span className="block font-display text-xl font-bold text-choco">{title}</span><span className="text-sm text-gray-500">{text}</span></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-24">
        <SectionHeader eyebrow="Simple" title="How it works" />
        <div className="relative grid gap-5 md:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, text }, index) => (
            <Reveal key={title} delay={index * 100}>
              <div className="card card-hover h-full p-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-brand/15 text-brand"><Icon size={26} /></div>
                <p className="text-xs font-bold uppercase tracking-widest text-accent">Step {index + 1}</p>
                <h3 className="mt-1 text-lg font-bold text-choco">{title}</h3>
                <p className="mt-1 text-sm text-gray-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-24">
        <SectionHeader eyebrow={`Why ${settings?.restaurantName || "Snipe&Bite"}`} title="Everything for a better meal" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={(i % 3) * 90}>
              <div className="card card-hover flex h-full gap-4 p-6">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand"><Icon size={22} /></span>
                <div><h3 className="font-sans text-base font-bold text-choco">{title}</h3><p className="mt-1 text-sm text-gray-500">{text}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <ReviewsShowcase />

      <section className="container-page mt-24">
        <Reveal>
          <div className="grid items-center gap-6 overflow-hidden rounded-3xl p-8 sm:p-12 md:grid-cols-2" style={{ background: "linear-gradient(135deg, #ffa94d, #ff7a00 55%, #e56a00)" }}>
            <div className="text-white">
              <h2 className="text-3xl font-bold sm:text-4xl">Planning a get-together?</h2>
              <p className="mt-3 text-white/85">Reserve a table online, or write to us about party orders and special requests.</p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link to="/reservation" className="rounded-full bg-choco px-8 py-3 font-semibold text-white transition hover:scale-105">Book a table</Link>
              <Link to="/contact" className="rounded-full bg-white/20 px-8 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/30">Contact us</Link>
            </div>
          </div>
        </Reveal>
      </section>
      <section className="container-page mt-24" aria-labelledby="newsletter-title">
        <Reveal>
          <div className="rounded-3xl px-6 py-12 text-center sm:px-12" style={{ background: "var(--surface-2)" }}>
            <p className="eyebrow">Stay in the loop</p>
            <h2 id="newsletter-title" className="section-title mt-1">Offers and new dishes, in your inbox</h2>
            <p className="mx-auto mb-6 mt-2 max-w-md text-sm text-gray-500">Subscribe to hear about new menu items and offers. No spam, and you can leave any time.</p>
            <NewsletterForm />
          </div>
        </Reveal>
      </section>
    </>
  );
}
