import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import Logo from "./Logo";
import { optimizeImage } from "../../utils/image";

// A title such as "Snipe the craving. Take a Bite." is shown on two lines, with the last part in the brand colour,
// exactly like the default hero. A title without a full stop is shown as it is.
const splitTitle = (title = "") => {
  const match = title.trim().match(/^(.+?[.!?])\s+(\S.*)$/);
  return match ? { first: match[1], rest: match[2] } : { first: title.trim(), rest: "" };
};

const mod = (n, m) => ((n % m) + m) % m;

// The number of steps (negative = backwards) that reaches banner "to" the shortest way round.
const shortestStep = (from, to, total) => {
  const forward = mod(to - from, total);
  return forward > total / 2 ? forward - total : forward;
};

// Shows the active banners from the admin panel. Without banners, a brand hero is shown.
export default function HeroSlider({ banners = [], tagline }) {
  // pos only ever counts up or down. Slide number k shows banner k modulo the banner count, so going from the last
  // banner to the first keeps sliding in the same direction instead of rushing back across the screen.
  const [{ pos, prev }, setMove] = useState({ pos: 0, prev: 0 });
  const total = banners.length;
  const go = (next) => setMove((m) => ({ prev: m.pos, pos: typeof next === "function" ? next(m.pos) : next }));

  useEffect(() => {
    if (total < 2) return undefined;
    const timer = setTimeout(() => setMove((m) => ({ prev: m.pos, pos: m.pos + 1 })), 5000);
    return () => clearTimeout(timer);
  }, [total, pos]);

  if (banners.length === 0) {
    const { first, rest } = splitTitle(tagline || "Snipe the craving. Take a Bite.");
    return (
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-24 -top-24 h-112 w-md rounded-full bg-brand/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent/15 blur-3xl" />
        <div className="container-page relative grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
          <div className="space-y-6 text-center md:text-left">
            <p className="eyebrow animate-fade-up">Fresh. Fast. Fired up.</p>
            <h1 className="animate-fade-up text-5xl font-extrabold leading-[1.05] text-choco [animation-delay:120ms] md:text-6xl lg:text-7xl">
              {first}
              {rest && <><br /><span className="gradient-text">{rest}</span></>}
            </h1>
            <p className="mx-auto max-w-lg animate-fade-up text-lg text-gray-600 [animation-delay:240ms] md:mx-0">
              Restaurant-quality food, cooked fresh when you order. Choose delivery, pickup or dine-in and follow your order live.
            </p>
            <div className="flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:360ms] md:justify-start">
              <Link to="/menu" className="btn-primary px-8 py-3 text-base">Order now</Link>
              <Link to="/reservation" className="btn-dark px-8 py-3 text-base">Book a table</Link>
            </div>
          </div>
          <div className="relative mx-auto flex w-full max-w-md items-center justify-center">
            <div className="absolute inset-6 rounded-full bg-brand/20 blur-2xl" />
            <Logo className="animate-float relative w-72 max-w-full drop-shadow-2xl md:w-96" />
          </div>
        </div>
      </section>
    );
  }

  const active = mod(pos, total);
  const shown = [...new Set([prev, pos - 1, pos, pos + 1])].sort((x, y) => x - y);
  const orderButton = "btn-primary px-8 py-3 text-base";

  return (
    <section className="relative isolate overflow-hidden bg-choco" aria-roledescription="carousel" aria-label="Offers">
      {/* Every slide sits in the same grid cell and is moved sideways, so the banner is as tall as its tallest slide. */}
      <div className="grid">
        {shown.map((k) => {
          const banner = banners[mod(k, total)];
          const link = banner.link || "/menu";
          const external = /^https?:\/\//i.test(link);
          const { first, rest } = splitTitle(banner.title);
          return (
            <div
              key={k}
              inert={k !== pos ? true : undefined}
              className="relative col-start-1 row-start-1 transition-transform duration-700 ease-in-out will-change-transform motion-reduce:transition-none"
              style={{ transform: `translateX(${(k - pos) * 100}%)` }}
            >
              <img src={optimizeImage(banner.image.url)} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-center" decoding="async" onError={(e) => { e.currentTarget.style.visibility = "hidden"; }} />
              <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/80 via-black/50 to-black/10" />
              <div className="container-page flex min-h-104 items-center py-14 md:min-h-128 md:py-24">
                {/* Same layout as the default hero: small line, big title, subtitle and the two buttons. */}
                <div className="max-w-2xl space-y-6 text-center text-white md:text-left">
                  <p className="eyebrow">Fresh. Fast. Fired up.</p>
                  <h1 className="wrap-break-word text-4xl font-extrabold leading-[1.05] drop-shadow sm:text-5xl md:text-6xl lg:text-7xl">
                    {first}
                    {rest && <><br /><span className="gradient-text">{rest}</span></>}
                  </h1>
                  {banner.subtitle && <p className="mx-auto max-w-lg text-lg text-white/90 drop-shadow md:mx-0">{banner.subtitle}</p>}
                  <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                    {external
                      ? <a href={link} target="_blank" rel="noopener noreferrer" className={orderButton}>Order now</a>
                      : <Link to={link} className={orderButton}>Order now</Link>}
                    <Link to="/reservation" className="inline-flex cursor-pointer items-center justify-center rounded-full border border-white/50 bg-white/10 px-8 py-3 text-base font-semibold text-white backdrop-blur transition duration-300 hover:bg-white hover:text-gray-900 active:scale-[0.97]">Book a table</Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {total > 1 && (
        <>
          <button type="button" className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-900 hover:bg-white sm:block" onClick={() => go(pos - 1)} aria-label="Previous banner">
            <FiChevronLeft />
          </button>
          <button type="button" className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-2 text-gray-900 hover:bg-white sm:block" onClick={() => go(pos + 1)} aria-label="Next banner">
            <FiChevronRight />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((banner, i) => (
              <button key={banner._id} type="button" onClick={() => go(pos + shortestStep(active, i, total))} aria-label={`Go to banner ${i + 1}`} aria-current={i === active} className={`h-2.5 rounded-full transition-all ${i === active ? "w-6 bg-white" : "w-2.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
