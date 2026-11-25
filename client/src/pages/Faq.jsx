import { useState } from "react";
import { Link } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
import Reveal from "../components/common/Reveal";
import Seo from "../components/common/Seo";
import { FAQ_GROUPS } from "../utils/faqData";

function Item({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--line)" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-4 py-4 text-left">
        <span className="font-medium text-choco">{question}</span>
        <FiChevronDown className={`shrink-0 text-brand transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]"}`}>
        <p className="overflow-hidden text-sm leading-relaxed text-gray-600">{answer}</p>
      </div>
    </div>
  );
}

export default function Faq() {
  return (
    <div>
      <Seo title="FAQ" description="Answers about ordering, payments, delivery and your Snipe&Bite account." />
      <section className="container-page pb-6 pt-14 text-center">
        <p className="eyebrow">Help centre</p>
        <h1 className="mt-2 text-4xl font-bold text-choco sm:text-5xl">Frequently asked <span className="gradient-text">questions</span></h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-500">Quick answers to the things people ask most. Still stuck? <Link to="/contact" className="font-semibold text-brand hover:underline">Send us a message</Link>.</p>
      </section>
      <div className="container-page mt-8 grid max-w-4xl gap-8">
        {FAQ_GROUPS.map((group, i) => (
          <Reveal key={group.title} delay={i * 60}>
            <div className="card p-6">
              <h2 className="mb-2 text-2xl font-bold text-choco">{group.title}</h2>
              {group.items.map(([q, a]) => <Item key={q} question={q} answer={a} />)}
            </div>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
