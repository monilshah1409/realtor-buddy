import React from 'react';
import { MessageSquarePlus } from 'lucide-react';

export interface FeedbackButtonProps {
  onClick: () => void;
  className?: string;
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="global-feedback-button"
      className={`fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-xl hover:shadow-2xl border border-slate-700/80 backdrop-blur-md text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 group ${className}`}
      aria-label="Open Feedback and Complaint Modal"
      title="Feedback & Complaints (mswebdevelopments.uae@gmail.com)"
    >
      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
        <MessageSquarePlus className="w-3.5 h-3.5" />
      </div>
      <span className="hidden sm:inline">Feedback / Support</span>
      <span className="sm:hidden">Help</span>
    </button>
  );
};

export default FeedbackButton;
