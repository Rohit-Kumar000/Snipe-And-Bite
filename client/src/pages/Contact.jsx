import { useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FiMapPin, FiPhone, FiMail, FiClock, FiSend, FiCheckCircle } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import api, { getErrorMessage } from "../services/api";
import { formatClock } from "../utils/formatDate";
import { FAQ_GROUPS } from "../utils/faqData";
import Reveal from "../components/common/Reveal";
import Seo from "../components/common/Seo";

const EMPTY = { name: "", email: "", phone: "", subject: "", message: "", website: "" };

export default function Contact() {
  const settings = useSelector((state) => state.settings.data);
  const user = useSelector((state) => state.auth.user);
  const whatsapp = (settings?.whatsappNumber || "").replace(/\D/g, "");
  const [form, setForm] = useState({ ...EMPTY, name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    try {
      await api.post("/contact", form);
      setSent(true);
      setForm({ ...EMPTY });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const rows = [
    settings?.address && { icon: FiMapPin, label: "Visit us", value: settings.address },
    settings?.phone && { icon: FiPhone, label: "Call us", value: settings.phone, href: `tel:${settings.phone}` },
    settings?.email && { icon: FiMail, label: "Email us", value: settings.email, href: `mailto:${settings.email}` },
    whatsapp && { icon: FaWhatsapp, label: "WhatsApp", value: `+${whatsapp}`, href: `https://wa.me/${whatsapp}` },
    settings?.openTime && { icon: FiClock, label: "Opening hours", value: `${formatClock(settings.openTime)} to ${formatClock(settings.closeTime)}, every day` },
  ].filter(Boolean);

  const mapUrl = settings?.address ? `https://www.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed` : "";

  return (
    <div>
      <Seo title="Contact us" description="Send a message to Snipe&Bite or find our contact details." />

      <section className="container-page pb-4 pt-14 text-center">
        <p className="eyebrow">Contact</p>
        <h1 className="mt-2 text-4xl font-bold text-choco sm:text-5xl">Let&apos;s <span className="gradient-text">talk food</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-500">
          Questions, feedback, party orders or a problem with an order? Send us a message and we will get back to you.
        </p>
      </section>

      <div className="container-page mt-10 grid gap-8 lg:grid-cols-5">
        <Reveal className="lg:col-span-3">
          <div className="card p-6 sm:p-8">
            {sent ? (
              <div className="animate-fade-up space-y-4 py-10 text-center">
                <FiCheckCircle className="mx-auto text-green-500" size={56} />
                <h2 className="text-2xl font-bold text-choco">Message received</h2>
                <p className="mx-auto max-w-md text-sm text-gray-600">Thank you for writing to us. Your message has reached the team and we will reply to the email you gave.</p>
                <button type="button" className="btn-dark" onClick={() => setSent(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                <h2 className="text-2xl font-bold text-choco sm:col-span-2">Send us a message</h2>
                <div><label className="label" htmlFor="c-name">Your name</label><input id="c-name" className="input" value={form.name} onChange={set("name")} required minLength={2} maxLength={80} autoComplete="name" /></div>
                <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" type="email" className="input" value={form.email} onChange={set("email")} required autoComplete="email" /></div>
                <div><label className="label" htmlFor="c-phone">Mobile (optional)</label><input id="c-phone" className="input" inputMode="numeric" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))} autoComplete="tel" /></div>
                <div><label className="label" htmlFor="c-subject">Subject</label><input id="c-subject" className="input" value={form.subject} onChange={set("subject")} required minLength={3} maxLength={120} /></div>
                <div className="sm:col-span-2">
                  <label className="label" htmlFor="c-message">Message</label>
                  <textarea id="c-message" className="input min-h-36 resize-y" value={form.message} onChange={set("message")} required minLength={10} maxLength={2000} />
                  <p className="mt-1 text-right text-xs text-gray-400">{form.message.length}/2000</p>
                </div>
                {/* Hidden field for bots. Real visitors never see or fill it. */}
                <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" name="website" value={form.website} onChange={set("website")} />
                <div className="sm:col-span-2">
                  <button type="submit" className="btn-primary w-full py-3 sm:w-auto sm:px-10" disabled={sending}>
                    <FiSend /> {sending ? "Sending..." : "Send message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Reveal>

        <Reveal delay={120} className="space-y-4 lg:col-span-2">
          {rows.length === 0 ? (
            <div className="card p-6 text-sm text-gray-600">
              Our phone and address will appear here soon. You can use the form, <Link to="/menu" className="font-semibold text-brand hover:underline">browse the menu</Link> or <Link to="/reservation" className="font-semibold text-brand hover:underline">book a table</Link>.
            </div>
          ) : rows.map(({ icon: Icon, label, value, href }) => (
            <div key={label} className="card card-hover flex items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand"><Icon size={20} /></div>
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
                {href ? <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="break-words font-semibold text-choco hover:text-brand">{value}</a> : <p className="font-semibold text-choco">{value}</p>}
              </div>
            </div>
          ))}
        </Reveal>
      </div>

      {mapUrl && (
        <Reveal className="container-page mt-10">
          <div className="card overflow-hidden">
            <iframe title="Restaurant location" src={mapUrl} className="h-80 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </Reveal>
      )}

      <section className="container-page mt-20 max-w-4xl">
        <Reveal className="mb-6 text-center">
          <p className="eyebrow">Quick answers</p>
          <h2 className="section-title mt-2">Before you write</h2>
        </Reveal>
        <Reveal className="card p-2 sm:p-4">
          {FAQ_GROUPS.flatMap((g) => g.items).slice(0, 5).map(([q, a]) => (
            <details key={q} className="group px-3 py-3" style={{ borderBottom: "1px solid var(--line)" }}>
              <summary className="cursor-pointer list-none font-medium text-choco marker:hidden">{q}</summary>
              <p className="mt-2 text-sm text-gray-600">{a}</p>
            </details>
          ))}
          <p className="p-3 text-center text-sm"><Link to="/faq" className="font-semibold text-brand hover:underline">See all questions</Link></p>
        </Reveal>
      </section>
    </div>
  );
}
