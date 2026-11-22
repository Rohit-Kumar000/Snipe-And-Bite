import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api";
import { timeAgo } from "../../utils/formatDate";
import StarRating from "./StarRating";
import Reveal from "./Reveal";

// Real customer reviews and the real rating summary. Nothing is shown until reviews exist.
export default function ReviewsShowcase({ limit = 3, showSummary = true, title = "What our customers say" }) {
  const [state, setState] = useState({ loading: true, summary: null, reviews: [] });

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/reviews/summary"),
      api.get("/reviews/public", { params: { limit, minRating: 4 } }),
    ])
      .then(([summary, reviews]) => active && setState({ loading: false, summary: summary.data, reviews: reviews.data.reviews }))
      .catch(() => active && setState({ loading: false, summary: null, reviews: [] }));
    return () => { active = false; };
  }, [limit]);

  if (state.loading || !state.summary || state.summary.total === 0) return null;
  const { summary, reviews } = state;

  return (
    <section className="container-page mt-24">
      <Reveal className="mb-10 text-center">
        <p className="eyebrow">Reviews</p>
        <h2 className="section-title mt-2">{title}</h2>
        {showSummary && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-gray-500">
            <StarRating value={summary.average} size={16} />
            <span className="font-semibold text-choco">{summary.average}</span> from {summary.total} verified {summary.total === 1 ? "review" : "reviews"}
          </p>
        )}
      </Reveal>
      <div className="grid gap-5 md:grid-cols-3">
        {reviews.map((review, index) => (
          <Reveal key={review._id} delay={index * 100}>
            <figure className="card card-hover h-full space-y-3 p-6">
              <StarRating value={review.rating} size={15} />
              <blockquote className="text-sm leading-relaxed text-gray-600">&ldquo;{review.comment}&rdquo;</blockquote>
              <figcaption className="text-xs text-gray-500">
                <span className="font-semibold text-choco">{review.author}</span>
                {review.dish && <> on {review.dish}</>} - {timeAgo(review.createdAt)}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
      <div className="mt-8 text-center"><Link to="/reviews" className="btn-dark">Read all reviews</Link></div>
    </section>
  );
}
