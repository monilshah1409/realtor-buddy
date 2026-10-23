import React, { useState } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  Monitor,
  ShieldAlert,
  LogOut,
  Clock,
  CheckCircle,
} from 'lucide-react';
import type { UserDeviceSession } from '../../services/sessionService';

export interface DeviceLimitModalProps {
  isOpen: boolean;
  activeSessions: UserDeviceSession[];
  onDisconnectDevice: (sessionId: string) => Promise<void> | void;
  className?: string;
}

export function getDeviceIcon(deviceName: string, os: string) {
  const lower = `${deviceName} ${os}`.toLowerCase();
  if (lower.includes('iphone') || lower.includes('phone') || lower.includes('android')) {
    return <Smartphone className="w-5 h-5" />;
  }
  if (lower.includes('ipad') || lower.includes('tablet')) {
    return <Tablet className="w-5 h-5" />;
  }
  if (lower.includes('macbook') || lower.includes('laptop')) {
    return <Laptop className="w-5 h-5" />;
  }
  return <Monitor className="w-5 h-5" />;
}

export function formatTimeAgo(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Active just now';
    if (diffMins < 60) return `Active ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Active ${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `Active ${diffDays}d ago`;
  } catch {
    return 'Active recently';
  }
}

export const DeviceLimitModal: React.FC<DeviceLimitModalProps> = ({
  isOpen,
  activeSessions,
  onDisconnectDevice,
  className = '',
}) => {
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDisconnect = async (sessionId: string) => {
    setDisconnectingId(sessionId);
    try {
      await onDisconnectDevice(sessionId);
      setSuccessMessage('Device disconnected! Connecting this device...');
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div
      data-testid="device-limit-modal"
      className={`fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 ${className}`}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="device-limit-title"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white p-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/30 text-white mb-1">
                Account Security Lock
              </span>
              <h2 id="device-limit-title" className="text-lg font-black text-white leading-tight">
                Device Limit Reached (3 of 3 Active)
              </h2>
            </div>
          </div>
          <p className="mt-3 text-xs text-amber-50 leading-relaxed">
            Your Realtor Buddy subscription allows up to <strong>3 active devices simultaneously</strong>. To sign in on this device, please select which of your active sessions below to disconnect.
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {successMessage && (
            <div
              className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2"
              data-testid="disconnect-success-banner"
            >
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Currently Connected Devices ({activeSessions.length} / 3)
            </h3>

            {activeSessions.map((session) => {
              const isDisconnecting = disconnectingId === session.id;
              return (
                <div
                  key={session.id}
                  data-testid={`session-item-${session.id}`}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs">
                      {getDeviceIcon(session.device_name, session.os)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {session.device_name}
                        </span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span>{session.browser}</span>
                        <span>•</span>
                        <span>{session.os}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formatTimeAgo(session.last_active_at)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isDisconnecting}
                    onClick={() => handleDisconnect(session.id)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all disabled:opacity-50 active:scale-95"
                    aria-label={`Disconnect ${session.device_name}`}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{isDisconnecting ? 'Disconnecting...' : 'Disconnect'}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Need custom brokerage multi-seat licenses? Contact Monil & Edwin via WhatsApp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceLimitModal;
