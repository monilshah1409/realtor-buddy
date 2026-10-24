import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  MapPin,
  Calendar,
  Bed,
  Bath,
  Maximize2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Clock,
  Sparkles,
  Layers,
  FileCheck,
} from 'lucide-react';
import type { Property } from '../../types';
import { mockProperties } from '../../data/mockProperties';
import { BrochureViewer } from '../../components/pdf/BrochureViewer';

export interface AdminApprovalsProps {
  pendingProperties?: Property[];
  onApprove?: (id: string) => void | Promise<void>;
  onReject?: (id: string, reason?: string) => void | Promise<void>;
}

export const AdminApprovals: React.FC<AdminApprovalsProps> = ({
  pendingProperties,
  onApprove,
  onReject,
}) => {
  // Filter for properties needing verification (private status)
  const initialItems = (pendingProperties ?? []).filter((p) => p.status === 'private');

  const [queue, setQueue] = useState<Property[]>(initialItems);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialItems.length > 0 ? initialItems[0].id : null
  );

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);

  // Sync state if prop changes
  useEffect(() => {
    if (pendingProperties) {
      const filtered = pendingProperties.filter((p) => p.status === 'private');
      setQueue(filtered);
      if (filtered.length > 0) {
        setSelectedId((current) =>
          current && filtered.some((p) => p.id === current) ? current : filtered[0].id
        );
      } else {
        setSelectedId(null);
      }
    }
  }, [pendingProperties]);

  const selectedProperty = queue.find((p) => p.id === selectedId) || queue[0] || null;

  const handleApprove = async () => {
    if (!selectedProperty) return;
    setIsSubmitting(true);
    try {
      await onApprove?.(selectedProperty.id);
      // Remove from queue
      const nextQueue = queue.filter((p) => p.id !== selectedProperty.id);
      setQueue(nextQueue);
      if (nextQueue.length > 0) {
        setSelectedId(nextQueue[0].id);
      } else {
        setSelectedId(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!selectedProperty) return;
    setIsSubmitting(true);
    try {
      await onReject?.(selectedProperty.id, rejectReason.trim() || undefined);
      // Remove from queue
      const nextQueue = queue.filter((p) => p.id !== selectedProperty.id);
      setQueue(nextQueue);
      if (nextQueue.length > 0) {
        setSelectedId(nextQueue[0].id);
      } else {
        setSelectedId(null);
      }
      setIsRejectModalOpen(false);
      setRejectReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col">
      {/* Header with Admin Verification Branding */}
      <header className="bg-white border-b border-stone-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-950 text-amber-300 rounded-xl border border-amber-500/30 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-serif font-bold text-slate-900 tracking-tight">
                  Admin Verification & Approval Dashboard
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-900 border border-amber-200/80">
                  {queue.length} Pending
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                Monil & Edwin Platform Gatekeeper • Dubai Prime Properties
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-100 text-stone-700 text-xs font-semibold border border-stone-200/80">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Brochure Side-by-Side Review Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {queue.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs max-w-2xl mx-auto my-12">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 mb-2">
              All Caught Up! No Pending Approvals
            </h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6 leading-relaxed">
              Every property submission submitted by realtors has been reviewed and verified. Verified listings are live across the global marketplace.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <span>Admin Queue Status: Clear</span>
            </div>
          </div>
        ) : selectedProperty ? (
          <div className="space-y-6">
            {/* Horizontal Pending Queue Carousel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>Submissions Awaiting Verification ({queue.length})</span>
                </h2>
                <span className="text-[11px] text-slate-400">
                  Select a card to inspect side-by-side
                </span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {queue.map((prop) => {
                  const isSelected = prop.id === selectedProperty.id;
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      data-testid={`approval-item-${prop.id}`}
                      onClick={() => {
                        setSelectedId(prop.id);
                        setSelectedPhotoIndex(0);
                      }}
                      className={`text-left shrink-0 w-72 p-3 rounded-2xl border transition-all duration-200 relative ${
                        isSelected
                          ? 'bg-emerald-50/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-bold text-slate-900 line-clamp-1">
                          {prop.developer_name} • {prop.locality}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 shrink-0">
                          Pending
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-medium truncate max-w-[140px] text-slate-500">
                          {prop.developer_name}
                        </span>
                        <span className="font-bold text-slate-900">
                          AED {(prop.price_aed / 1_000_000).toFixed(2)}M
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{prop.locality}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Screen Layout: Left Specs Inspection | Right In-Page PDF Brochure */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Pane: Detailed Inspection & Approval Actions */}
              <div className="lg:col-span-6 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Property Photos Banner / Strip */}
                  {selectedProperty.photos && selectedProperty.photos.length > 0 && (
                    <div className="relative aspect-[16/9] w-full bg-slate-900 overflow-hidden">
                      <img
                        src={selectedProperty.photos[selectedPhotoIndex] || selectedProperty.photos[0]}
                        alt={selectedProperty.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

                      {/* Photo Thumbnail Indicators */}
                      {selectedProperty.photos.length > 1 && (
                        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-1.5 overflow-x-auto pb-1">
                          {selectedProperty.photos.map((photo, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setSelectedPhotoIndex(idx)}
                              className={`w-12 h-9 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                                selectedPhotoIndex === idx
                                  ? 'border-emerald-400 ring-2 ring-emerald-400/30'
                                  : 'border-white/40 opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img src={photo} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/90 text-white backdrop-blur-md shadow-sm">
                          Pending Admin Verification
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Property Info Details */}
                  <div className="p-5 space-y-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight mb-1">
                        {selectedProperty.title}
                      </h2>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{selectedProperty.locality}</span>
                        {selectedProperty.sub_community && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-slate-500">{selectedProperty.sub_community}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Developer & Wholesale Price Highlight Card */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Master Developer
                        </div>
                        <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          <span>{selectedProperty.developer_name}</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Agent Wholesale Price
                        </div>
                        <div className="text-lg font-black text-emerald-700 tracking-tight mt-0.5">
                          AED {selectedProperty.price_aed.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Specifications Grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                        <Bed className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          {selectedProperty.bedrooms === 0 ? 'Studio' : `${selectedProperty.bedrooms} Bed`}
                        </span>
                        <span className="text-[10px] text-slate-400">Bedrooms</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                        <Bath className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          {selectedProperty.bathrooms} Bath
                        </span>
                        <span className="text-[10px] text-slate-400">Bathrooms</span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col items-center justify-center text-center">
                        <Maximize2 className="w-4 h-4 text-slate-400 mb-1" />
                        <span className="text-xs font-bold text-slate-800">
                          {selectedProperty.area_sqft.toLocaleString()} sqft
                        </span>
                        <span className="text-[10px] text-slate-400">Total Area</span>
                      </div>
                    </div>

                    {/* Timeline & Submitter Metadata */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Handover Status</span>
                        </div>
                        <div className="font-bold text-slate-800 capitalize">
                          {selectedProperty.handover_status.replace('_', ' ')}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Date: {selectedProperty.handover_date}
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                        <div className="text-slate-400 flex items-center gap-1 mb-1 font-medium">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Submitted By</span>
                        </div>
                        <div className="font-mono font-semibold text-slate-800 text-[11px] truncate" title={selectedProperty.created_by}>
                          {selectedProperty.created_by}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(selectedProperty.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedProperty.description && (
                      <div className="pt-2 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Listing Description
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                          {selectedProperty.description}
                        </p>
                      </div>
                    )}

                    {/* Verification Checklist Note */}
                    <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Monil & Edwin Verification Rules</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 leading-relaxed">
                        Cross-reference developer name, official payment milestones, and wholesale pricing on the PDF brochure to the right before granting Global listing status.
                      </p>
                    </div>

                    {/* Action Buttons: Approve as Global & Request Changes / Reject */}
                    <div className="pt-4 border-t border-slate-200 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleApprove}
                        disabled={isSubmitting}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md active:scale-[0.99]"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Approve as Global</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsRejectModalOpen(true)}
                        disabled={isSubmitting}
                        className="inline-flex items-center justify-center gap-2 py-3 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 disabled:opacity-50 font-bold text-sm rounded-xl transition-all"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Request Changes / Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Pane: In-page Interactive Brochure Viewer */}
              <div className="lg:col-span-6 lg:sticky lg:top-20 space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                    <span>Official Developer PDF Spec Sheet</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Interactive PDF Inspector
                  </span>
                </div>

                <BrochureViewer
                  brochureUrl={selectedProperty.brochure_onedrive_url}
                  fileName={selectedProperty.brochure_file_name}
                  title={selectedProperty.title}
                  className="h-[680px]"
                />
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* Reject / Request Changes Modal Dialog */}
      {isRejectModalOpen && selectedProperty && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-rose-100 text-rose-700 rounded-2xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Request Changes or Reject Property
                </h3>
                <p className="text-xs text-slate-500 truncate max-w-xs">
                  {selectedProperty.title}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Provide feedback for the submitting agent so they can correct the listing details or re-upload the official developer PDF brochure.
            </p>

            <textarea
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection / requested changes (e.g., incorrect price, missing floor plans, developer mismatch)..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectReason('');
                }}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={isSubmitting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApprovals;
