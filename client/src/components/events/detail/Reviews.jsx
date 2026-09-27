import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, X } from 'lucide-react';
import { useGetEventReviewsQuery, useCreateReviewMutation } from '../../../features/reviews/reviewsApi';
import { useAuth } from '../../../hooks/useAuth';
import { formatDate } from '../../../utils/formatDate';
import toast from 'react-hot-toast';

export default function Reviews({ eventId, eventRating }) {
  const { isAuth } = useAuth();
  const { data: reviewsData, isLoading } = useGetEventReviewsQuery(eventId);
  const [createReview, { isLoading: isSubmitting }] = useCreateReviewMutation();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [title, setTitle] = useState('');

  const reviews = Array.isArray(reviewsData) ? reviewsData : reviewsData?.reviews || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('Please write a review');
      return;
    }
    try {
      await createReview({ eventId, rating, title: title.trim(), comment: comment.trim() }).unwrap();
      toast.success('Review submitted!');
      setShowForm(false);
      setComment('');
      setTitle('');
      setRating(5);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to submit review');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-amber-400" />
          </div>
          <h2 className="font-display font-bold text-xl text-white">Reviews</h2>
        </div>
        {isAuth && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 rounded-xl bg-primary-600/20 border border-primary-600/30 text-primary-300 text-sm font-medium hover:bg-primary-600/30 transition-all"
          >
            Write a Review
          </button>
        )}
      </div>

      {eventRating && (
        <div className="glass-sm p-4 mb-4 flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-display font-bold text-white">{(eventRating.average || 0).toFixed(1)}</p>
            <div className="flex gap-0.5 my-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(eventRating.average || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
              ))}
            </div>
            <p className="text-xs text-slate-500">{eventRating.count || 0} reviews</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-sm p-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="skeleton h-4 w-24 rounded" />
              </div>
              <div className="skeleton h-3 w-full rounded" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="glass-sm p-8 text-center">
          <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, 5).map((review, i) => (
            <motion.div
              key={review._id || i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-sm p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0">
                  {review.user?.avatar ? (
                    <img src={review.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-white">
                      {(review.user?.name || 'U').charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white text-sm">{review.user?.name || 'Anonymous'}</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                      ))}
                    </div>
                    <span className="text-xs text-slate-500">{formatDate(review.createdAt, 'MMM dd, yyyy')}</span>
                  </div>
                  {review.title && <p className="font-medium text-white text-sm mb-1">{review.title}</p>}
                  {review.comment && <p className="text-sm text-slate-400">{review.comment}</p>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-lg text-white">Write a Review</h3>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Rating</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseEnter={() => setHoverRating(s)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setRating(s)}
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            s <= (hoverRating || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Title (optional)</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Sum up your experience"
                    className="input"
                  />
                </div>

                <div>
                  <label className="label">Review *</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience..."
                    rows={4}
                    className="input resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
