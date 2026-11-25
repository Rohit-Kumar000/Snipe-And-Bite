import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import api from "../services/api";
import { timeAgo } from "../utils/formatDate";
import StarRating from "../components/common/StarRating";
import Pagination from "../components/common/Pagination";
import Loader from "../components/common/Loader";
import Reveal from "../components/common/Reveal";
import Seo from "../components/common/Seo";

export default function Reviews() {
  const user = useSelector((state) => state.auth.user);
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState({ loading: true, reviews: [], pages: 1 });
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get("/reviews/summary").then(({ data }) => setSummary(data)).catch(() => setSummary({ total: 0, average: 0, distribution: {} }));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setList((l) => ({ ...l, loading: true }));
    api.get("/reviews/public", { params: { page, limit: 9 } })
      .then(({ data }) => setList({ loading: false, reviews: data.reviews, pages: data.pages }))
      .catch(() => setList({ loading: false, reviews: [], pages: 1 }));
  }, [page]);

  return (
    <div>
      <Seo title="Customer reviews" description="Honest reviews from Snipe&Bite customers who have received their orders." />
      <section className="container-page pb-6 pt-14 text-center">
        <p className="eyebrow">Reviews</p>
        <h1 className="mt-2 text-4xl font-bold text-choco sm:text-5xl">Straight from our <span className="gradient-text">customers</span></h1>
        <p className="mx-auto mt-4 max-w-2xl text-gray-500">
          Only people who have actually received a dish can review it, so every rating on this page comes from a real order.
        </p>
      </section>

      <div className="container-page mt-8 grid gap-8 lg:grid-cols-[320px_1fr]">
        <Reveal>
          <aside className="card sticky top-24 space-y-5 p-6">
            {!summary ? <Loader /> : summary.total === 0 ? (
              <p className="text-sm text-gray-500">No ratings yet. Be the first to share your experience after your first delivered order.</p>
            ) : (
              <>
                <div className="text-center">
                  <p className="font-display text-6xl font-bold text-brand">{summary.average}</p>
                  <div className="mt-1 flex justify-center"><StarRating value={summary.average} size={18} /></div>
                  <p className="mt-1 text-xs text-gray-500">{summary.total} {summary.total === 1 ? "rating" : "ratings"}</p>
                </div>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = summary.distribution[star] || 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-3">{star}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
                          <div className="h-full rounded-full bg-brand transition-all duration-1000" style={{ width: `${(count / summary.total) * 100}%` }} />
                        </div>
                        <span className="w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
            <div className="rounded-xl p-4 text-sm text-gray-600" style={{ background: "var(--surface-2)" }}>
              <p className="font-semibold text-choco">Want to leave a review?</p>
              <p className="mt-1 text-xs">Open any delivered dish from your orders and rate it.</p>
              <Link to={user ? "/orders" : "/login"} className="btn-primary btn-sm mt-3">{user ? "Go to my orders" : "Login to review"}</Link>
            </div>
          </aside>
        </Reveal>

        <div>
          {list.loading ? <Loader /> : list.reviews.length === 0 ? (
            <div className="card p-10 text-center text-sm text-gray-500">No written reviews yet.</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {list.reviews.map((review, i) => (
                <Reveal key={review._id} delay={(i % 2) * 80}>
                  <figure className="card card-hover h-full space-y-3 p-6">
                    <StarRating value={review.rating} size={15} />
                    <blockquote className="text-sm leading-relaxed text-gray-600">&ldquo;{review.comment}&rdquo;</blockquote>
                    <figcaption className="text-xs text-gray-500">
                      <span className="font-semibold text-choco">{review.author}</span>{review.dish && <> on {review.dish}</>} - {timeAgo(review.createdAt)}
                    </figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          )}
          <Pagination page={page} pages={list.pages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
