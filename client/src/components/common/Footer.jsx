import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiMapPin, FiPhone, FiMail, FiClock, FiArrowUpRight } from "react-icons/fi";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import Logo from "./Logo";
import { formatClock } from "../../utils/formatDate";

const col = "mb-4 text-xs font-bold uppercase tracking-[0.2em] text-brand";
const linkCls = "inline-flex items-center gap-1 transition hover:translate-x-1 hover:text-white";

export default function Footer() {
  const settings = useSelector((state) => state.settings.data);

  return (
    <footer className="always-dark relative mt-24 overflow-hidden" style={{ borderTop: "1px solid rgb(255 255 255 / 0.08)" }}>
      <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-160 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl" />

      <div className="container-page relative">
        <div className="flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center" style={{ borderBottom: "1px solid rgb(255 255 255 / 0.08)" }}>
          <div>
            <h3 className="text-3xl font-bold text-white sm:text-4xl">Hungry? <span className="gradient-text">Snipe the craving.</span></h3>
            <p className="mt-2 text-sm text-white/60">Fresh food, cooked to order, at your door in a few taps.</p>
          </div>
          <Link to="/menu" className="btn-primary px-8 py-3 text-base">Order now <FiArrowUpRight /></Link>
        </div>

        <div className="grid gap-10 py-12 text-sm text-white/70 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="inline-flex items-center rounded-2xl px-2 py-2"><Logo variant="dark" className="h-16 w-auto sm:h-20" /></div>
            <p>{settings?.tagline || "Snipe the craving. Take a Bite."}</p>
            <div className="flex gap-2" aria-label="Social media links">
              {[["facebook", FaFacebookF, "Facebook"], ["instagram", FaInstagram, "Instagram"], ["linkedin", FaLinkedinIn, "LinkedIn"]].map(([key, Icon, label]) => settings?.socialLinks?.[key] && <a key={key} href={settings.socialLinks[key]} target="_blank" rel="noreferrer" aria-label={label} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/75 transition hover:-translate-y-1 hover:border-brand hover:bg-brand hover:text-white"><Icon size={16} /></a>)}
            </div>
          </div>

          <div>
            <h4 className={col}>Explore</h4>
            <ul className="space-y-2.5">
              <li><Link to="/menu" className={linkCls}>Menu</Link></li>
              <li><Link to="/offers" className={linkCls}>Offers</Link></li>
              <li><Link to="/contact" className={linkCls}>Contact us</Link></li>
              <li><Link to="/reservation" className={linkCls}>Book a table</Link></li>
              <li><Link to="/orders" className={linkCls}>Track order</Link></li>
            </ul>
          </div>

          <div>
            <h4 className={col}>Company</h4>
            <ul className="space-y-2.5">
              <li><Link to="/about" className={linkCls}>About us</Link></li>
              <li><Link to="/faq" className={linkCls}>FAQ</Link></li>
              <li><Link to="/privacy-policy" className={linkCls}>Privacy policy</Link></li>
              <li><Link to="/terms-refund" className={linkCls}>Terms and refund policy</Link></li>
              <li><Link to="/shipping-policy" className={linkCls}>Shipping and delivery</Link></li>
            </ul>
          </div>

          <div>
            <h4 className={col}>Visit us</h4>
            <ul className="space-y-2.5">
              {settings?.address && <li className="flex gap-2"><FiMapPin className="mt-0.5 shrink-0 text-brand" /> {settings.address}</li>}
              {settings?.phone && <li className="flex gap-2"><FiPhone className="mt-0.5 shrink-0 text-brand" /><a href={`tel:${settings.phone}`} className="hover:text-white">{settings.phone}</a></li>}
              {settings?.email && <li className="flex gap-2"><FiMail className="mt-0.5 shrink-0 text-brand" /><a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a></li>}
              {settings?.openTime && <li className="flex gap-2"><FiClock className="mt-0.5 shrink-0 text-brand" />{formatClock(settings.openTime)} to {formatClock(settings.closeTime)}</li>}
              {!settings?.address && !settings?.phone && !settings?.email && (
                <li className="text-white/50">Contact details are set in the admin panel. <Link to="/contact" className="text-brand hover:underline">Send us a message</Link>.</li>
              )}
            </ul>
          </div>
        </div>

        <div className="relative py-5 text-center text-xs text-white/50" style={{ borderTop: "1px solid rgb(255 255 255 / 0.08)" }}>
          <p>
            &copy; {new Date().getFullYear()} {settings?.restaurantName || "Snipe&Bite"}. All rights reserved.
            {settings?.gstNumber && <span> GSTIN: {settings.gstNumber}</span>}
          </p>
          <p className="mt-2 sm:absolute sm:right-0 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2">
            Author: Rohit Kumar
          </p>
        </div>
      </div>
    </footer>
  );
}
