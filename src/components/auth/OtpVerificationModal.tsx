import React, { useState, useEffect, useRef } from 'react';
import {
  KeyRound,
  Mail,
  Clock,
  AlertCircle,
  X,
  ArrowRight,
  Pencil,
  RotateCcw,
} from 'lucide-react';

export interface OtpVerificationModalProps {
  isOpen: boolean;
  email: string;
  onVerify: (code: string) => Promise<{ success: boolean; verified?: boolean; error?: string }>;
  onResend: () => Promise<{ success: boolean; error?: string }>;
  onChangeEmail?: (newEmail: string) => Promise<{ success: boolean; error?: string }>;
  onClose: () => void;
}

export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  email,
  onVerify,
  onResend,
  onChangeEmail,
  onClose,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(60);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [displayEmail, setDisplayEmail] = useState(email);
  const [newEmailInput, setNewEmailInput] = useState(email);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync prop changes
  useEffect(() => {
    setDisplayEmail(email);
    setNewEmailInput(email);
  }, [email]);

  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setCooldown(60);
      setError(null);
      setIsEditingEmail(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 50);
    }
  }, [isOpen]);

  // 60-Second Cooldown Timer
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;

    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, cooldown]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    const nextDigits = [...digits];

    if (!clean) {
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // Grab the last digit entered
    const digit = clean[clean.length - 1];
    nextDigits[index] = digit;
    setDigits(nextDigits);

    // Auto-advance to next slot
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const nextDigits = [...digits];
        nextDigits[index - 1] = '';
        setDigits(nextDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const cleaned = pastedData.replace(/\D/g, '').slice(0, 6);

    if (cleaned.length > 0) {
      const nextDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        nextDigits[i] = cleaned[i] || '';
      }
      setDigits(nextDigits);

      const focusIdx = Math.min(cleaned.length, 5);
      inputRefs.current[focusIdx]?.focus();
    }
  };

  const handleVerifyClick = async () => {
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await onVerify(fullCode);
      if (!result.success || result.verified === false) {
        setError(result.error || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendClick = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await onResend();
      if (result.success) {
        setDigits(['', '', '', '', '', '']);
        setCooldown(60);
        inputRefs.current[0]?.focus();
      } else {
        setError(result.error || 'Failed to resend code');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend verification code');
    } finally {
      setIsResending(false);
    }
  };

  const handleUpdateEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newEmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!onChangeEmail) return;

    setIsUpdatingEmail(true);
    setError(null);

    try {
      const result = await onChangeEmail(cleanEmail);
      if (result.success) {
        setDisplayEmail(cleanEmail);
        setIsEditingEmail(false);
        setDigits(['', '', '', '', '', '']);
        setCooldown(60);
        inputRefs.current[0]?.focus();
      } else {
        setError(result.error || 'Failed to update email');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[#090D15]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-[#121824] border border-[#D4AF37]/40 shadow-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-stone-100 max-w-md w-full relative overflow-hidden">
        {/* Subtle Radial Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-5 right-5 p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Content */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-3 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10">
            <KeyRound className="w-6 h-6 text-[#D4AF37]" />
          </div>

          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
            PRE-REGISTRATION GATEWAY
          </span>

          <h2 className="font-serif text-2xl font-semibold text-stone-100 tracking-tight mt-2">
            Verification Code
          </h2>

          <p className="text-xs text-stone-400 mt-1">
            Please enter the 6 digits sent to
          </p>

          {!isEditingEmail ? (
            <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <span className="text-xs font-mono font-medium text-stone-200 bg-stone-900/80 px-2.5 py-1 rounded-lg border border-stone-800">
                {displayEmail}
              </span>
              {onChangeEmail && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingEmail(true);
                    setNewEmailInput(displayEmail);
                    setError(null);
                  }}
                  className="text-[11px] font-medium text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                  <span>Change Email</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleUpdateEmailSubmit} className="mt-3">
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="Enter new email"
                  required
                  className="flex-1 px-3 py-1.5 bg-stone-900/90 border border-stone-700 rounded-lg text-xs text-stone-100 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
                <button
                  type="submit"
                  disabled={isUpdatingEmail}
                  className="px-3 py-1.5 bg-[#D4AF37] hover:bg-amber-400 text-stone-950 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingEmail ? 'Updating...' : 'Update & Send OTP'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingEmail(false)}
                  className="px-2 py-1.5 text-xs text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 6 Digit Input Slots */}
        <div className="flex justify-between gap-2 sm:gap-2.5 my-6">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-xl sm:text-2xl font-bold bg-stone-900/90 border border-stone-700 rounded-xl text-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all"
              disabled={isVerifying}
            />
          ))}
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Expiration Info */}
        <div className="flex items-center justify-between text-[11px] text-stone-400 mb-5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-500" />
            <span>Code expires in 10:00</span>
          </div>
          <span className="text-stone-500">6 digits</span>
        </div>

        {/* Action Button: Verify */}
        <button
          type="button"
          onClick={handleVerifyClick}
          disabled={isVerifying || digits.join('').length !== 6}
          className="w-full py-3 px-4 rounded-xl font-medium text-sm text-stone-950 bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] hover:from-amber-400 hover:to-amber-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isVerifying ? (
            <div className="w-5 h-5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Verify & Complete Registration</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        {/* 60s Resend Cooldown Footer */}
        <div className="mt-4 pt-4 border-t border-stone-800 text-center flex items-center justify-center gap-2 text-xs text-stone-400">
          <span>Didn't receive the email?</span>
          <button
            type="button"
            onClick={handleResendClick}
            disabled={cooldown > 0 || isResending}
            className={`font-semibold transition-colors flex items-center gap-1.5 ${
              cooldown > 0
                ? 'text-stone-500 cursor-not-allowed'
                : 'text-[#D4AF37] hover:text-amber-300 hover:underline cursor-pointer'
            }`}
          >
            {isResending && (
              <div className="w-3 h-3 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
            )}
            {cooldown > 0
              ? `Resend in 0:${cooldown < 10 ? '0' : ''}${cooldown}`
              : 'Resend OTP'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
