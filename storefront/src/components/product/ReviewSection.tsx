"use client";

import { useState, useEffect } from "react";
import { useMutation, gql } from "@apollo/client";
import Link from "next/link";

const CREATE_REVIEW = gql`
  mutation CreateReview($input: CreateReviewInput!) {
    createReview(input: $input) {
      id
      rating
      text
      verifiedPurchase
    }
  }
`;

interface Review {
  id: string;
  rating: number;
  text?: string;
  verifiedPurchase: boolean;
  createdAt: string;
  buyer: { name: string };
}

interface ReviewSectionProps {
  productId: string;
  reviews: Review[];
  avgRating: number;
}

export function ReviewSection({
  productId,
  reviews,
  avgRating,
}: ReviewSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("cartplex_token"));
  }, []);

  const [createReview, { loading }] = useMutation(CREATE_REVIEW, {
    context: {
      headers: {
        Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("cartplex_token") : ""}`,
      },
    },
    onCompleted: () => {
      setSubmitted(true);
      setShowForm(false);
    },
    onError: (err) => {
      console.error("Review error:", err.message);
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await createReview({
      variables: { input: { productId, rating, text } },
    });
  }

  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    rating: r,
    count: reviews.filter((rev) => rev.rating === r).length,
  }));

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold mb-1">Customer Reviews</h2>
          {reviews.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`text-xl ${star <= Math.round(avgRating) ? "text-yellow-400" : "text-gray-200"}`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-gray-600 text-sm">
                {Number(avgRating).toFixed(1)} out of 5 · {reviews.length}{" "}
                review{reviews.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {!submitted &&
          (isLoggedIn ? (
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm font-medium border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-400 transition-colors"
            >
              Write a review
            </button>
          ) : (
            <Link
              href="/account/login"
              className="text-sm font-medium border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-400 transition-colors"
            >
              Sign in to review
            </Link>
          ))}
      </div>

      {/* Rating breakdown */}
      {reviews.length > 0 && (
        <div className="mb-8 space-y-2 max-w-xs">
          {ratingCounts.map(({ rating: r, count }) => (
            <div key={r} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-4">{r}</span>
              <span className="text-yellow-400 text-sm">★</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{
                    width: reviews.length
                      ? `${(count / reviews.length) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <span className="text-sm text-gray-400 w-4">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Review form */}
      {showForm && isLoggedIn && (
        <form
          onSubmit={handleSubmit}
          className="bg-gray-50 rounded-xl p-6 mb-8"
        >
          <h3 className="font-medium mb-4">Your review</h3>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-2xl transition-colors"
                >
                  <span
                    className={
                      star <= (hoverRating || rating)
                        ? "text-yellow-400"
                        : "text-gray-300"
                    }
                  >
                    ★
                  </span>
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share your experience..."
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
          />
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-gray-900 text-white text-sm font-medium px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit review"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 px-4 py-2 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {submitted && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 text-sm text-green-700">
          ✓ Your review has been submitted. Thank you!
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No reviews yet. Be the first to review this product.
        </p>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border-b border-gray-100 pb-6 last:border-0"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {review.buyer.name}
                    </span>
                    {review.verifiedPurchase && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Verified purchase
                      </span>
                    )}
                  </div>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`text-sm ${star <= review.rating ? "text-yellow-400" : "text-gray-200"}`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              {review.text && (
                <p className="text-sm text-gray-600 leading-relaxed mt-2">
                  {review.text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
