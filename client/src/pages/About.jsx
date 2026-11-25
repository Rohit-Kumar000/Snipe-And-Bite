import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiHeart, FiClock, FiShield, FiTruck, FiShoppingBag, FiCoffee, FiStar, FiSmartphone } from "react-icons/fi";
import Logo from "../components/common/Logo";
import Reveal from "../components/common/Reveal";
import ReviewsShowcase from "../components/common/ReviewsShowcase";
import Seo from "../components/common/Seo";

const VALUES = [
  { icon: FiHeart, title: "Made with care", text: "Every order is cooked fresh in our kitchen once you place it. Nothing waits under a lamp." },
  { icon: FiClock, title: "Respect for your time", text: "A few taps to order, live tracking from kitchen to door, and honest status updates all the way." },
  { icon: FiShield, title: "Safe, simple payments", text: "Pay online securely or pay with cash on arrival. Refunds follow a clear, written policy." },
  { icon: FiStar, title: "Honest reviews", text: "Only customers who received a dish can rate it, so the ratings you read come from real orders." },
];

const SERVICES = [
  { icon: FiTruck, title: "Home delivery", text: "Hot food brought to your door within our service area." },
  { icon: FiShoppingBag, title: "Pickup", text: "Order ahead and collect it when it is ready. No waiting in line." },
  { icon: FiCoffee, title: "Dine-in", text: "Reserve a table, order from your seat and enjoy it fresh from the kitchen." },
  { icon: FiSmartphone, title: "Order from anywhere", text: "A fast site that works on your phone, tablet or laptop." },
];

const STEPS = [
  ["You choose", "Browse the menu, pick your dishes and any add-ons."],
  ["We confirm", "The restaurant accepts your order and the clock starts."],
  ["The kitchen cooks", "Your food is prepared fresh, never in advance."],
  ["It reaches you", "Delivered, picked up or served at your table."],
];

export default function About() {
  const settings = useSelector((state) => state.settings.data);
  const name = settings?.restaurantName || "Snipe&Bite";

  return (
    <div>
      <Seo title="About us" description="Learn more about Snipe&Bite and how we cook, deliver and serve." />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-20">
          <div className="space-y-5">
            <p className="eyebrow animate-fade-up">Our story</p>
            <h1 className="animate-fade-up text-4xl font-extrabold leading-tight text-choco [animation-delay:100ms] sm:text-5xl">
              Great food should be <span className="gradient-text">a few taps away</span>
            </h1>
            <p className="animate-fade-up text-gray-600 [animation-delay:200ms]">
              {name} is a food ordering hub built around one idea: when a craving hits, getting great food should take a few taps, not a few phone calls.
            </p>
            <p className="animate-fade-up text-gray-600 [animation-delay:300ms]">
              Browse the menu, customise your dish, and choose delivery, pickup or dine-in. Track every order from the kitchen to your door, save your favourite addresses, reorder in one tap and collect loyalty points on every delivered order.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link to="/menu" className="btn-primary px-8 py-3">Explore the menu</Link>
              <Link to="/contact" className="btn-dark px-8 py-3">Get in touch</Link>
            </div>
          </div>
          <div className="relative flex justify-center"><div className="absolute inset-10 rounded-full bg-brand/20 blur-2xl" /><Logo alt={name} className="animate-float relative w-full max-w-sm drop-shadow-2xl" /></div>
        </div>
      </section>

      <section className="container-page mt-16">
        <Reveal className="mb-10 text-center"><p className="eyebrow">What we stand for</p><h2 className="section-title mt-2">Our promises</h2></Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="card card-hover h-full p-6">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/15 text-brand"><Icon size={26} /></div>
                <h3 className="text-xl font-bold text-choco">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-24">
        <Reveal className="mb-10 text-center"><p className="eyebrow">Your way</p><h2 className="section-title mt-2">Three ways to enjoy your meal</h2></Reveal>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, text }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="card card-hover h-full p-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/15 text-brand"><Icon size={28} /></div>
                <h3 className="text-lg font-bold text-choco">{title}</h3>
                <p className="mt-2 text-sm text-gray-500">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page mt-24">
        <Reveal className="mb-12 text-center"><p className="eyebrow">From order to table</p><h2 className="section-title mt-2">How every order is handled</h2></Reveal>
        <div className="relative grid gap-6 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent md:block" />
          {STEPS.map(([title, text], i) => (
            <Reveal key={title} delay={i * 120} className="relative text-center">
              <div className="relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand font-display text-xl font-bold text-white shadow-lg">{i + 1}</div>
              <h3 className="font-bold text-choco">{title}</h3>
              <p className="mt-1 text-sm text-gray-500">{text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <ReviewsShowcase title="Loved by people who ordered" />

      <section className="container-page mt-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl p-10 text-center sm:p-14" style={{ background: "linear-gradient(135deg, #ffa94d, #ff7a00 55%, #e56a00)" }}>
            <h2 className="text-3xl font-bold text-white sm:text-4xl">Ready for your next bite?</h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">Your first order is only a few taps away.</p>
            <Link to="/menu" className="mt-6 inline-flex rounded-full bg-[#1f1d2b] px-9 py-3 font-semibold text-white transition hover:scale-105">Order now</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
