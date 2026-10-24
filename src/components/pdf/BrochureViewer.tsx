import React, { useState } from 'react';
import {
  FileText,
  FileX,
  Download,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export interface BrochureViewerProps {
  brochureUrl?: string;
  fileName?: string;
  title?: string;
  className?: string;
  onDownload?: () => void;
}

export const BrochureViewer: React.FC<BrochureViewerProps> = ({
  brochureUrl,
  fileName = 'Developer_Brochure.pdf',
  title = 'Property Brochure',
  className = '',
  onDownload,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [hasLoadError, setHasLoadError] = useState<boolean>(false);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoom(100);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // Format embed-friendly URL if needed
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    // If it's a SharePoint link (OneDrive for Business/School), ensure embedview action
    if (url.includes('sharepoint.com')) {
      if (url.includes('action=embedview')) return url;
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}action=embedview`;
    }
    // If it's a personal OneDrive URL, ensure embed format
    if (url.includes('onedrive.live.com') && !url.includes('embed')) {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}action=embedview`;
    }
    // If it's a standard PDF URL or blob URL, append toolbar=0 to keep presentation clean
    if ((url.toLowerCase().endsWith('.pdf') || url.startsWith('blob:')) && !url.includes('#')) {
      return `${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
    }
    return url;
  };

  if (!brochureUrl) {
    return (
      <div
        className={`bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full min-h-[420px] ${className}`}
        data-testid="brochure-viewer-empty"
      >
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4 shadow-xs">
          <FileX className="w-8 h-8" />
        </div>
        <h4 className="text-base font-bold text-slate-800 mb-1">No Brochure Available</h4>
        <p className="text-sm text-slate-500 max-w-sm mb-4 leading-relaxed">
          No PDF brochure has been attached to this property submission yet.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Requires developer verification</span>
        </div>
      </div>
    );
  }

  const embedSrc = getEmbedUrl(brochureUrl);

  const content = (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0' : 'h-full min-h-[550px]'
      } ${className}`}
      data-testid="brochure-viewer"
    >
      {/* Viewer Header & Controls */}
      <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shrink-0 border-b border-slate-800">
        {/* Title & File Name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
            <FileText className="w-4 h-4 shrink-0" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-100 truncate">
              {fileName}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Official PDF Spec Sheet
            </div>
          </div>
        </div>

        {/* Center Controls: Zoom */}
        <div className="flex items-center gap-1 bg-slate-800/90 rounded-xl p-1 border border-slate-700 text-slate-300">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoom <= 50}
            className="p-1.5 rounded-lg hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span
            className="px-2 text-xs font-mono font-medium text-slate-200 min-w-[42px] text-center select-none"
            title="Current zoom"
          >
            {zoom}%
          </span>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoom >= 200}
            className="p-1.5 rounded-lg hover:bg-slate-700 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1.5 rounded-lg hover:bg-slate-700 hover:text-white transition-colors border-l border-slate-700 ml-0.5"
            title="Reset zoom to 100%"
            aria-label="Reset zoom"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* Right Actions: Download, External Link, Fullscreen */}
        <div className="flex items-center gap-2">
          {/* Prominent Download Button */}
          <a
            href={brochureUrl}
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95"
            aria-label="Download Brochure"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Brochure</span>
          </a>

          <a
            href={brochureUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title="Open in new tab"
            aria-label="Open in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Embedded PDF View Area */}
      <div className="relative flex-1 w-full bg-slate-100 overflow-auto flex items-start justify-center p-2">
        {hasLoadError ? (
          <div className="m-auto p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
            <FileX className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <h5 className="text-sm font-bold text-slate-800 mb-1">PDF Direct Preview Unavailable</h5>
            <p className="text-xs text-slate-500 mb-4">
              Your browser or security policy restricted embedding this OneDrive link directly in an iframe.
            </p>
            <a
              href={brochureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open in OneDrive Tab</span>
            </a>
          </div>
        ) : (
          <div
            className="w-full h-full transition-transform duration-200 origin-top flex items-stretch justify-center"
            style={{
              transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
              transformOrigin: 'top center',
              minHeight: isFullscreen ? 'calc(100vh - 70px)' : '520px',
            }}
          >
            <iframe
              src={embedSrc}
              title={title}
              onError={() => setHasLoadError(true)}
              className="w-full h-full border-0 rounded-lg bg-white shadow-xs"
              style={{ minHeight: isFullscreen ? 'calc(100vh - 80px)' : '520px' }}
              loading="lazy"
              allow="autoplay"
            />
          </div>
        )}
      </div>

      {/* Footer bar with Admin Trust note */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1 text-emerald-700 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Official Developer Brochure Preview</span>
        </div>
        <div className="text-slate-400">Zoom: {zoom}%</div>
      </div>
    </div>
  );

  return content;
};

export default BrochureViewer;
