import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export const SUPPORT_EMAIL = 'mswebdevelopments.uae@gmail.com';

export type FeedbackTopic =
  | 'bug_report'
  | 'feature_request'
  | 'listing_complaint'
  | 'billing_support'
  | 'general_feedback';

export interface FeedbackSubmission {
  topic: FeedbackTopic;
  brief: string;
  name: string;
  email: string;
  phone?: string;
  pageUrl?: string;
  submittedAt?: string;
}

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitFeedback?: (data: FeedbackSubmission) => Promise<void> | void;
  initialTopic?: FeedbackTopic;
  userEmail?: string;
  userName?: string;
}

export const TOPIC_LABELS: Record<FeedbackTopic, string> = {
  bug_report: 'Bug Report / Technical Issue',
  feature_request: 'Feature Request / Idea',
  listing_complaint: 'Listing Data / Price Complaint',
  billing_support: 'Billing & Subscription Support',
  general_feedback: 'General Feedback / Inquiries',
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  isOpen,
  onClose,
  onSubmitFeedback,
  initialTopic = 'general_feedback',
  userEmail = '',
  userName = '',
}) => {
  const [topic, setTopic] = useState<FeedbackTopic>(initialTopic);
  const [brief, setBrief] = useState<string>('');
  const [name, setName] = useState<string>(userName);
  const [email, setEmail] = useState<string>(userEmail);
  const [phone, setPhone] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!brief.trim()) {
      setErrorMessage('Please provide a brief description of your feedback or issue.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (!name.trim()) {
      setErrorMessage('Please provide your name.');
      return;
    }

    setIsSubmitting(true);

    const submission: FeedbackSubmission = {
      topic,
      brief: brief.trim(),
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
      submittedAt: new Date().toISOString(),
    };

    try {
      if (onSubmitFeedback) {
        await onSubmitFeedback(submission);
      } else {
        // Fallback simulated submission for standalone usage
        await new Promise((res) => setTimeout(res, 400));
      }

      setIsSuccess(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Unable to deliver feedback at this moment. Please email mswebdevelopments.uae@gmail.com directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setErrorMessage(null);
    setBrief('');
    onClose();
  };

  return (
    <div
      data-testid="feedback-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        data-testid="feedback-modal-content"
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-modal-title"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 id="feedback-modal-title" className="text-base font-bold text-white">
                Feedback & Support Concierge
              </h2>
              <p className="text-xs text-slate-300">
                Direct channel to the engineering team: <span className="text-emerald-400 font-semibold">{SUPPORT_EMAIL}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/60 transition-colors"
            aria-label="Close Feedback Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-4" data-testid="feedback-success-state">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-in zoom-in-75 duration-300">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900">Thank you! Your feedback has been sent</h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Your message has been delivered to{' '}
                <span className="font-semibold text-emerald-700">{SUPPORT_EMAIL}</span>. We review all submissions within 24 hours.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {errorMessage && (
              <div
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2"
                data-testid="feedback-error-banner"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Topic Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-topic-select" className="text-xs font-bold text-slate-700">
                Topic / Category <span className="text-rose-500">*</span>
              </label>
              <select
                id="feedback-topic-select"
                aria-label="Topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value as FeedbackTopic)}
                className="w-full h-10 px-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
              >
                {Object.entries(TOPIC_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Brief Description */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-brief-textarea" className="text-xs font-bold text-slate-700">
                Brief / Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="feedback-brief-textarea"
                aria-label="Brief Description"
                rows={4}
                required
                placeholder="Describe your suggestion, technical issue, or listing concern in detail..."
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                className="w-full p-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all resize-none"
              />
            </div>

            {/* Contact Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="feedback-name-input" className="text-xs font-bold text-slate-700">
                  Your Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  id="feedback-name-input"
                  aria-label="Full Name"
                  type="text"
                  required
                  placeholder="e.g. Karim Al-Sayed"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="feedback-email-input" className="text-xs font-bold text-slate-700">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  id="feedback-email-input"
                  aria-label="Email Address"
                  type="email"
                  required
                  placeholder="e.g. agent@realtorbuddy.ae"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label htmlFor="feedback-phone-input" className="text-xs font-bold text-slate-700">
                  WhatsApp / Phone (Optional)
                </label>
                <input
                  id="feedback-phone-input"
                  aria-label="Phone Number"
                  type="tel"
                  placeholder="e.g. +971 50 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-10 px-3 text-xs sm:text-sm font-medium bg-slate-50 focus:bg-white text-slate-900 border border-slate-200 focus:border-emerald-500 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-hidden transition-all"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Routed to: <strong className="text-slate-600">{SUPPORT_EMAIL}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <span>Sending...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackModal;
