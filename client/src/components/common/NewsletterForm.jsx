import { useState } from "react";
import toast from "react-hot-toast";
import { FiSend } from "react-icons/fi";
import api, { getErrorMessage } from "../../services/api";

// Home page newsletter signup. The hidden "website" field is a honeypot for bots.
export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [trap, setTrap] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post("/newsletter", { email, website: trap });
      setDone(true);
      setEmail("");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (done) return <p className="rounded-2xl px-6 py-4 text-center font-semibold" style={{ background: "var(--surface-2)" }} role="status">Thank you. You are on the list.</p>;
  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-md flex-col gap-3 sm:flex-row" noValidate>
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input id="newsletter-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" autoComplete="email" className="input flex-1 !rounded-full !px-5" />
      <input type="text" name="website" value={trap} onChange={(e) => setTrap(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <button className="btn-primary" disabled={busy}><FiSend /> {busy ? "Subscribing..." : "Subscribe"}</button>
    </form>
  );
}
