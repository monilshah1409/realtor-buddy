import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  Users,
  X,
  Radio,
  FileText,
  RotateCcw,
  Check,
  ChevronDown,
  Building,
  Flame,
  Zap,
  Smartphone,
  Monitor,
  ShieldCheck,
  KeyRound,
  Receipt,
  FileCheck,
  Megaphone,
  Layers,
} from 'lucide-react';
import type { MarketingCampaign } from '../../types';
import {
  fetchMarketingCampaigns,
  toggleMarketingCampaign,
  sendBroadcastEmail,
  sendEmailViaTemplate,
} from '../../services/marketingService';
import {
  EMAIL_TEMPLATES_CATALOG,
  renderLuxuryTemplateHtml,
  EmailTemplateDefinition,
} from '../../services/emailTemplates';

export interface AdminMarketingProps {
  initialCampaigns?: MarketingCampaign[];
  onToggleCampaign?: (campaignId: string, enabled: boolean) => Promise<boolean>;
  onSendBroadcast?: (payload: {
    audience: string;
    subject: string;
    htmlContent: string;
  }) => Promise<{ success: boolean; dispatchedCount: number }>;
  onSendTestEmail?: (payload: {
    to: string[];
    template: string;
    subject: string;
    data?: Record<string, any>;
  }) => Promise<{ success: boolean; dispatchedCount: number }>;
}

export const AdminMarketing: React.FC<AdminMarketingProps> = ({
  initialCampaigns,
  onToggleCampaign,
  onSendBroadcast,
  onSendTestEmail,
}) => {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>(initialCampaigns || []);
  const [loading, setLoading] = useState<boolean>(!initialCampaigns);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Active Template Preview Modal State
  const [selectedTemplate, setSelectedTemplate] = useState<MarketingCampaign | null>(null);
  const [selectedLibraryTemplate, setSelectedLibraryTemplate] =
    useState<EmailTemplateDefinition | null>(null);
  const [viewportMode, setViewportMode] = useState<'desktop' | 'mobile'>('desktop');
  const [testEmail, setTestEmail] = useState<string>('admin@realtorbuddy.ae');
  const [isSendingTest, setIsSendingTest] = useState<boolean>(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Broadcast Composer State
  const [audience, setAudience] = useState<string>('all');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [togglingCampaignId, setTogglingCampaignId] = useState<string | null>(null);

  const subjectInputRef = useRef<HTMLInputElement>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync initialCampaigns if updated
  useEffect(() => {
    if (initialCampaigns) {
      setCampaigns(initialCampaigns);
    }
  }, [initialCampaigns]);

  // Fetch campaigns on mount if not provided via props
  useEffect(() => {
    let isMounted = true;

    async function loadCampaigns() {
      try {
        const data = await fetchMarketingCampaigns();
        if (isMounted) {
          setCampaigns(data);
        }
      } catch (err) {
        console.error('Failed to load marketing campaigns:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (!initialCampaigns) {
      loadCampaigns();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [initialCampaigns]);

  // Auto-dismiss feedback message after 6 seconds
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => {
      setFeedback(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [feedback]);

  // Handle Campaign Toggle
  const handleToggle = async (campaign: MarketingCampaign) => {
    const nextState = !campaign.is_active;
    setTogglingCampaignId(campaign.id);

    // Optimistic UI update
    setCampaigns((prev) =>
      prev.map((c) => (c.id === campaign.id ? { ...c, is_active: nextState } : c))
    );

    try {
      let success = false;
      if (onToggleCampaign) {
        success = await onToggleCampaign(campaign.id, nextState);
      } else {
        success = await toggleMarketingCampaign(campaign.id, nextState);
      }

      if (success) {
        setFeedback({
          type: 'success',
          message: nextState
            ? `Activated automated trigger: "${campaign.title}"`
            : `Paused automated trigger: "${campaign.title}"`,
        });
      } else {
        throw new Error('Update failed');
      }
    } catch (err) {
      // Revert optimistic update
      setCampaigns((prev) =>
        prev.map((c) => (c.id === campaign.id ? { ...c, is_active: campaign.is_active } : c))
      );
      setFeedback({
        type: 'error',
        message: `Failed to update status for ${campaign.title}`,
      });
    } finally {
      setTogglingCampaignId(null);
    }
  };

  // Variable Insertion into Subject
  const insertVariableIntoSubject = (variableName: string) => {
    const input = subjectInputRef.current;
    if (!input) {
      setSubject((prev) => prev + variableName);
      return;
    }

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const newText = subject.substring(0, start) + variableName + subject.substring(end);
    setSubject(newText);

    setTimeout(() => {
      input.focus();
      const nextPos = start + variableName.length;
      input.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  // Quick HTML tag insertion into Body
  const insertTagIntoBody = (tagStart: string, tagEnd: string = '') => {
    const textarea = bodyTextareaRef.current;
    if (!textarea) {
      setBody((prev) => prev + tagStart + tagEnd);
      return;
    }

    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const selected = body.substring(start, end);
    const replacement = tagStart + (selected || '') + tagEnd;
    const newText = body.substring(0, start) + replacement + body.substring(end);
    setBody(newText);

    setTimeout(() => {
      textarea.focus();
      const nextPos = start + tagStart.length + (selected ? selected.length : 0);
      textarea.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  // Send Broadcast Email
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!subject.trim() || !body.trim()) {
      setFeedback({
        type: 'error',
        message: 'Subject and email body are required before dispatching.',
      });
      return;
    }

    setIsSending(true);

    try {
      let result: { success: boolean; dispatchedCount: number };

      if (onSendBroadcast) {
        result = await onSendBroadcast({
          audience,
          subject: subject.trim(),
          htmlContent: body.trim(),
        });
      } else {
        result = await sendBroadcastEmail({
          audience,
          subject: subject.trim(),
          htmlContent: body.trim(),
        });
      }

      if (result.success) {
        setFeedback({
          type: 'success',
          message: `Broadcast sent to ${result.dispatchedCount} brokers via Resend email dispatcher.`,
        });
        setSubject('');
        setBody('');
      } else {
        throw new Error('Broadcast dispatch reported failure.');
      }
    } catch (err: any) {
      console.error('Error sending broadcast email:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to deliver message via Resend.',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Dispatch Test Email
  const handleSendTestEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const targetRecipient = testEmail.trim() || 'admin@realtorbuddy.ae';
    setIsSendingTest(true);

    try {
      const templateId = selectedLibraryTemplate
        ? selectedLibraryTemplate.id
        : selectedTemplate?.trigger_type || selectedTemplate?.id || 'admin_broadcast';

      const emailSubject = selectedLibraryTemplate
        ? selectedLibraryTemplate.subject
        : selectedTemplate?.subject || 'Test Email Dispatch';

      const dataPayload = selectedLibraryTemplate
        ? selectedLibraryTemplate.sampleData
        : {};

      let result: { success: boolean; dispatchedCount: number };

      if (onSendTestEmail) {
        result = await onSendTestEmail({
          to: [targetRecipient],
          template: templateId,
          subject: emailSubject,
          data: dataPayload,
        });
      } else {
        result = await sendEmailViaTemplate({
          to: [targetRecipient],
          template: templateId,
          subject: emailSubject,
          data: dataPayload,
        });
      }

      if (result.success) {
        setFeedback({
          type: 'success',
          message: `Test email successfully dispatched to ${targetRecipient} via SMTP engine.`,
        });
      } else {
        throw new Error('Failed to dispatch test email');
      }
    } catch (err: any) {
      console.error('Test email dispatch error:', err);
      setFeedback({
        type: 'error',
        message: err.message || `Failed to dispatch test email to ${targetRecipient}.`,
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Preview replacement helpers
  const renderedSubject = useMemo(() => {
    if (!subject) return '';
    return subject
      .replace(/\{\{broker_name\}\}/g, 'Tariq Al-Mansoor')
      .replace(/\{\{expiry_date\}\}/g, 'Tomorrow at 18:00')
      .replace(/\{\{checkout_url\}\}/g, 'https://realtorbuddy.ae/subscribe');
  }, [subject]);

  const renderedBody = useMemo(() => {
    if (!body) return '';
    return body
      .replace(/\{\{broker_name\}\}/g, 'Tariq Al-Mansoor')
      .replace(/\{\{agency_name\}\}/g, 'Apex Luxury Real Estate')
      .replace(/\{\{expiry_date\}\}/g, 'Tomorrow at 18:00')
      .replace(/\{\{checkout_url\}\}/g, 'https://realtorbuddy.ae/subscribe');
  }, [body]);

  // Campaign display metadata helper
  const getCampaignMeta = (campaign: MarketingCampaign) => {
    if (campaign.trigger_type === 'trial_day_3' || campaign.id.includes('day_3')) {
      return {
        badge: 'Day 3 Check-In',
        subtitle: 'VIP Broker Support & High-Yield Inventory',
        timing: 'Triggered 72 hours after trial registration',
        icon: Zap,
        color: 'from-amber-500/20 to-amber-500/5 text-[#D4AF37]',
      };
    }
    if (campaign.trigger_type === 'trial_expiring_24h' || campaign.id.includes('24h')) {
      return {
        badge: '24h Expiration Alert',
        subtitle: 'Secure Your Uninterrupted Access',
        timing: 'Triggered 24 hours prior to trial expiration',
        icon: Clock,
        color: 'from-rose-500/20 to-rose-500/5 text-rose-400',
      };
    }
    return {
      badge: 'Win-Back Promo Offer',
      subtitle: 'Exclusive 20% Off Realtor Buddy License',
      timing: 'Triggered 48 hours post-expiration',
      icon: Flame,
      color: 'from-emerald-500/20 to-emerald-500/5 text-emerald-400',
    };
  };

  // Filter templates by category
  const filteredTemplates = useMemo(() => {
    if (activeCategory === 'all') return EMAIL_TEMPLATES_CATALOG;
    return EMAIL_TEMPLATES_CATALOG.filter((t) => t.category.toLowerCase() === activeCategory.toLowerCase());
  }, [activeCategory]);

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case 'Security':
        return KeyRound;
      case 'Onboarding':
        return Sparkles;
      case 'Lifecycle':
        return Clock;
      case 'Billing':
        return Receipt;
      case 'Operations':
        return FileCheck;
      case 'Broadcast':
        return Megaphone;
      default:
        return Mail;
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans text-slate-800">
      {/* Top Banner / Luxury Dubai Header */}
      <header className="bg-[#090D15] border-b border-[#D4AF37]/25 text-white sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-slate-900 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30 shadow-inner">
              <Mail className="w-5 h-5 text-[#D4AF37]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-serif font-bold tracking-tight text-white">
                  Marketing & Broadcast Concierge
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  SMTP Engine: Nodemailer Direct Transport (Stylofista Architecture - Limit Bypassed)
                </span>
              </div>
              <p className="text-xs text-stone-400 font-medium mt-0.5">
                Monil & Edwin Platform Gatekeeper • Automated Drips & VIP Communications
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 text-stone-300 text-xs font-medium border border-stone-800">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>{EMAIL_TEMPLATES_CATALOG.length} Luxury Templates Ready</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Toast Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-2xl border shadow-lg flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
              feedback.type === 'success'
                ? 'bg-slate-900 text-[#FAF8F5] border-[#D4AF37]/40'
                : 'bg-rose-950 text-rose-100 border-rose-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-1 rounded-full ${
                  feedback.type === 'success'
                    ? 'bg-[#D4AF37]/20 text-[#D4AF37]'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-medium">{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              aria-label="Dismiss feedback"
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SECTION 1: Automated Marketing Lifecycle Drips */}
        <section aria-labelledby="drips-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#D4AF37]" />
                <h2 id="drips-heading" className="text-lg font-serif font-bold text-slate-900">
                  Automated Lifecycle Drips
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Pre-configured behavioral triggers delivered via background edge functions.
              </p>
            </div>
            <div className="text-xs text-stone-500 font-medium">
              {campaigns.filter((c) => c.is_active).length} of {campaigns.length} campaigns active
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {campaigns.map((campaign) => {
              const meta = getCampaignMeta(campaign);
              const MetaIcon = meta.icon;

              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                >
                  {/* Card Header Gradient Strip */}
                  <div
                    className={`px-5 pt-5 pb-3 border-b border-stone-100 bg-gradient-to-br ${meta.color}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#090D15] text-[#D4AF37] border border-[#D4AF37]/30 shadow-xs">
                        <MetaIcon className="w-3 h-3 text-[#D4AF37]" />
                        <span>{meta.badge}</span>
                      </span>

                      {/* Accessible Switch Toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={campaign.is_active}
                        aria-label={`Toggle ${campaign.title}`}
                        disabled={togglingCampaignId === campaign.id}
                        onClick={() => handleToggle(campaign)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:ring-offset-2 ${
                          campaign.is_active ? 'bg-[#D4AF37]' : 'bg-stone-300'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            campaign.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {campaign.title}
                    </h3>
                    <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                      {meta.subtitle}
                    </p>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 block mb-1">
                        Subject Line
                      </span>
                      <p className="text-slate-800 font-medium line-clamp-2 bg-stone-50 p-2.5 rounded-xl border border-stone-200/60 font-sans text-xs">
                        "{campaign.subject}"
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        <span className="font-semibold text-slate-700 capitalize">
                          {campaign.audience === 'trial'
                            ? 'Active Trials'
                            : campaign.audience === 'expired'
                            ? 'Expired Brokers'
                            : 'All Brokers'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 text-stone-400">
                        <Clock className="w-3 h-3" />
                        <span>{meta.timing.replace('Triggered ', '')}</span>
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        campaign.is_active
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-stone-200 text-stone-600'
                      }`}
                    >
                      {campaign.is_active ? 'Active & Delivering' : 'Paused'}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplate(campaign);
                        setSelectedLibraryTemplate(null);
                      }}
                      aria-label={`Preview Template for ${campaign.title}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-800 hover:text-slate-950 bg-white hover:bg-stone-100 border border-stone-200 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Preview Template</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 2: 8-Template Showcase & Live Luxury Previewer */}
        <section aria-labelledby="templates-heading" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D4AF37]" />
                <h2 id="templates-heading" className="text-lg font-serif font-bold text-slate-900">
                  Email Template Library & Previewer
                </h2>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Complete 8-template luxury Dubai email architecture delivered via Nodemailer direct SMTP transport.
              </p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {['all', 'Security', 'Onboarding', 'Lifecycle', 'Billing', 'Operations', 'Broadcast'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer capitalize ${
                      activeCategory.toLowerCase() === cat.toLowerCase()
                        ? 'bg-[#090D15] text-[#D4AF37] border border-[#D4AF37]/40 shadow-xs'
                        : 'bg-white hover:bg-stone-100 text-stone-600 border border-stone-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>
          </div>

          {/* 8 Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {filteredTemplates.map((template) => {
              const IconComp = getTemplateIcon(template.category);

              return (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl border border-stone-200/90 hover:border-[#D4AF37]/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-5 space-y-3 flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-900 text-[#D4AF37] border border-[#D4AF37]/30">
                        <IconComp className="w-3 h-3 text-[#D4AF37]" />
                        <span>{template.category}</span>
                      </span>
                      <span className="text-[10px] font-mono text-stone-400">
                        {template.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-[#090D15] transition-colors">
                        {template.name}
                      </h3>
                      <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {template.description}
                      </p>
                    </div>

                    <div className="mt-auto pt-3 border-t border-stone-100 space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-stone-400 block tracking-wider">
                          Trigger Event
                        </span>
                        <span className="text-slate-700 font-medium line-clamp-1">
                          {template.triggerEvent}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-stone-400 block tracking-wider">
                          Subject Line
                        </span>
                        <span className="text-slate-800 font-medium italic line-clamp-1">
                          "{template.subject}"
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="px-5 py-3.5 bg-stone-50 border-t border-stone-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>SMTP Ready</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLibraryTemplate(template);
                        setSelectedTemplate(null);
                      }}
                      aria-label={`Preview ${template.name}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-900 hover:text-black bg-white hover:bg-stone-100 border border-stone-200/90 shadow-2xs transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Preview Template</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* SECTION 3: Manual Broadcast Email Composer & Live Luxury Preview */}
        <section aria-labelledby="composer-heading" className="space-y-4">
          <div className="border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#D4AF37]" />
              <h2 id="composer-heading" className="text-lg font-serif font-bold text-slate-900">
                Broadcast Email Composer
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Compose and dispatch instantaneous luxury HTML emails to targeted broker cohorts.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column (Left) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-5">
              <form onSubmit={handleSendBroadcast} className="space-y-5">
                {/* Target Audience */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="broadcast-audience"
                      className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
                    >
                      Target Audience
                    </label>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Cohort Segmentation
                    </span>
                  </div>
                  <div className="relative">
                    <select
                      id="broadcast-audience"
                      aria-label="Target Audience"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-stone-50 hover:bg-stone-100/80 border border-stone-200 rounded-xl text-xs font-medium text-slate-800 appearance-none focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all cursor-pointer"
                    >
                      <option value="all">All Brokers (Active & Trial)</option>
                      <option value="active">Active Subscribers</option>
                      <option value="trial">Active 5-Day Trials</option>
                      <option value="expired">Expired Trials</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Subject Line & Variable Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="broadcast-subject"
                      className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
                    >
                      Subject Line
                    </label>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {subject.length} / 120 characters
                    </span>
                  </div>

                  <input
                    ref={subjectInputRef}
                    id="broadcast-subject"
                    aria-label="Subject Line"
                    type="text"
                    maxLength={120}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Exclusive Allocation: Dubai Creek Harbour Sky Penthouses"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-slate-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all"
                  />

                  {/* Variable insertion buttons */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-stone-400 font-medium mr-1">Insert Variable:</span>
                    <button
                      type="button"
                      onClick={() => insertVariableIntoSubject('{{broker_name}}')}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-[#D4AF37]/20 text-slate-700 hover:text-[#090D15] font-mono text-[10px] border border-stone-200 transition-colors cursor-pointer"
                    >
                      &#123;&#123;broker_name&#125;&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableIntoSubject('{{expiry_date}}')}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-[#D4AF37]/20 text-slate-700 hover:text-[#090D15] font-mono text-[10px] border border-stone-200 transition-colors cursor-pointer"
                    >
                      &#123;&#123;expiry_date&#125;&#125;
                    </button>
                    <button
                      type="button"
                      onClick={() => insertVariableIntoSubject('{{checkout_url}}')}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-[#D4AF37]/20 text-slate-700 hover:text-[#090D15] font-mono text-[10px] border border-stone-200 transition-colors cursor-pointer"
                    >
                      &#123;&#123;checkout_url&#125;&#125;
                    </button>
                  </div>
                </div>

                {/* Email Body Editor */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="broadcast-body"
                      className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
                    >
                      Email Body (HTML / Rich Text)
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => insertTagIntoBody('<p>', '</p>')}
                        className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-mono"
                        title="Paragraph"
                      >
                        &lt;p&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() => insertTagIntoBody('<strong>', '</strong>')}
                        className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-mono"
                        title="Bold"
                      >
                        &lt;b&gt;
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          insertTagIntoBody('<a href="https://realtorbuddy.ae/subscribe">', '</a>')
                        }
                        className="px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-mono"
                        title="Link"
                      >
                        &lt;a&gt;
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={bodyTextareaRef}
                    id="broadcast-body"
                    aria-label="Email Body"
                    rows={8}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="<p>Dear {{broker_name}},</p><p>We are delighted to invite your brokerage to an exclusive pre-launch presentation of luxury penthouses in Downtown Dubai...</p>"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono text-slate-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all leading-relaxed"
                  />
                  <p className="text-[11px] text-stone-500 mt-1">
                    Standard HTML tags supported. Interpolations:{' '}
                    <code className="text-[#090D15] font-semibold">&#123;&#123;broker_name&#125;&#125;</code>,{' '}
                    <code className="text-[#090D15] font-semibold">&#123;&#123;checkout_url&#125;&#125;</code>.
                  </p>
                </div>

                {/* Submit / Reset Actions */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSubject('');
                      setBody('');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:text-slate-900 bg-stone-100 hover:bg-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-stone-500" />
                    <span>Clear</span>
                  </button>

                  <button
                    type="submit"
                    disabled={!subject.trim() || !body.trim() || isSending}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#D4AF37] via-amber-400 to-[#D4AF37] hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer"
                  >
                    {isSending ? (
                      <>
                        <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Dispatching via Resend...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-slate-950" />
                        <span>Send Broadcast Email</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Live Luxury Email Preview (Right) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#D4AF37]" />
                  <span>Live Luxury Email Preview</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                  Real-Time
                </span>
              </div>

              {/* Obsidian Frame */}
              <div className="bg-[#090D15] rounded-2xl border border-[#D4AF37]/40 shadow-xl overflow-hidden flex flex-col">
                {/* Email Client Top Bar */}
                <div className="bg-slate-950 px-4 py-3 border-b border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="text-[10px] font-mono text-stone-500">
                    VIP Concierge Dispatch
                  </span>
                </div>

                {/* Email Metadata Strip */}
                <div className="p-4 bg-slate-900/90 border-b border-stone-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-stone-400 font-mono text-[11px]">
                      From:{' '}
                      <span className="text-stone-200">
                        Realtor Buddy VIP Concierge &lt;concierge@realtorbuddy.ae&gt;
                      </span>
                    </div>
                  </div>
                  <div className="text-stone-400 font-mono text-[11px]">
                    To:{' '}
                    <span className="text-[#D4AF37]">
                      {audience === 'all'
                        ? 'All Registered Brokers'
                        : audience === 'active'
                        ? 'Active VIP Subscribers'
                        : audience === 'trial'
                        ? 'Active 5-Day Trial Brokers'
                        : 'Expired Trial Brokers'}
                    </span>
                  </div>
                  <div className="pt-1 border-t border-stone-800">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block mb-0.5">
                      Subject:
                    </span>
                    <h4
                      data-testid="preview-subject"
                      className="text-sm font-semibold text-white tracking-tight"
                    >
                      {renderedSubject || (
                        <span className="text-stone-600 italic">
                          (Subject line preview appears here)
                        </span>
                      )}
                    </h4>
                  </div>
                </div>

                {/* Email Body Rendered Container */}
                <div className="p-5 bg-[#FAF8F5] text-slate-800 min-h-[260px] flex flex-col justify-between">
                  {/* Luxury Header Brand */}
                  <div>
                    <div className="text-center py-3 border-b border-[#D4AF37]/30 mb-4">
                      <div className="inline-flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                        <span className="font-serif font-bold text-sm tracking-widest text-[#090D15]">
                          REALTOR BUDDY
                        </span>
                      </div>
                      <p className="text-[10px] uppercase tracking-widest text-stone-500 mt-0.5">
                        Dubai Prime Real Estate Platform
                      </p>
                    </div>

                    {/* Dynamic Content */}
                    <div
                      data-testid="preview-body"
                      className="text-xs text-slate-700 leading-relaxed space-y-2.5 font-sans"
                      dangerouslySetInnerHTML={{
                        __html:
                          renderedBody ||
                          '<p class="text-stone-400 italic">Email message content preview will appear here in real time as you compose...</p>',
                      }}
                    />
                  </div>

                  {/* Luxury Footer */}
                  <div className="mt-8 pt-4 border-t border-stone-200 text-center space-y-1.5">
                    <p className="text-[10px] text-stone-400 font-medium">
                      Realtor Buddy HQ • Emaar Square Building 4, Downtown Dubai
                    </p>
                    <p className="text-[9px] text-stone-400">
                      You are receiving this communication as a registered Dubai real estate broker.
                    </p>
                    <div className="flex items-center justify-center gap-3 text-[10px] text-stone-500 font-medium pt-1">
                      <span className="hover:underline cursor-pointer">Unsubscribe</span>
                      <span>•</span>
                      <span className="hover:underline cursor-pointer">Manage Preferences</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* UNIFIED LUXURY TEMPLATE PREVIEW MODAL */}
      {(selectedLibraryTemplate || selectedTemplate) && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="bg-[#FAF8F5] w-full max-w-4xl rounded-2xl shadow-2xl border border-[#D4AF37]/40 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="bg-[#090D15] px-6 py-4 border-b border-[#D4AF37]/25 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-900 text-[#D4AF37] rounded-xl border border-[#D4AF37]/30">
                  <Mail className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-bold text-white">
                    Template Preview:{' '}
                    {selectedLibraryTemplate
                      ? selectedLibraryTemplate.name
                      : selectedTemplate?.title}
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    {selectedLibraryTemplate
                      ? `${selectedLibraryTemplate.category} Template • ${selectedLibraryTemplate.triggerEvent}`
                      : `Automated trigger email delivered to ${selectedTemplate?.audience} cohort`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedLibraryTemplate(null);
                  setSelectedTemplate(null);
                }}
                aria-label="Close modal"
                className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Controls Bar: Viewport Switcher & Live Test Dispatcher */}
            <div className="bg-slate-900 border-b border-stone-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
              {/* Desktop / Mobile Viewport Toggle */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-stone-800">
                <button
                  type="button"
                  onClick={() => setViewportMode('desktop')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewportMode === 'desktop'
                      ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Desktop</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewportMode('mobile')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    viewportMode === 'mobile'
                      ? 'bg-[#D4AF37] text-slate-950 shadow-xs'
                      : 'text-stone-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mobile</span>
                </button>
              </div>

              {/* Live Test Dispatcher */}
              <form
                onSubmit={handleSendTestEmail}
                className="flex items-center gap-2 flex-1 max-w-md justify-end"
              >
                <div className="relative flex-1">
                  <input
                    type="email"
                    required
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="admin@realtorbuddy.ae"
                    aria-label="Recipient Email"
                    className="w-full pl-3 pr-3 py-1.5 bg-slate-950 border border-stone-700 focus:border-[#D4AF37] rounded-xl text-xs text-stone-200 placeholder:text-stone-500 focus:outline-hidden"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingTest}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingTest ? (
                    <>
                      <div className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3 h-3 text-slate-950" />
                      <span>Send Test Email</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Modal Body / Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-4 bg-stone-100 flex-1">
              <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-2">
                <div className="text-xs">
                  <span className="text-[10px] font-bold uppercase text-stone-400 block mb-0.5">
                    Subject Line
                  </span>
                  <p className="font-semibold text-slate-900">
                    {selectedLibraryTemplate
                      ? selectedLibraryTemplate.subject
                      : selectedTemplate?.subject}
                  </p>
                </div>
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 flex-wrap gap-2">
                  <span>
                    Template ID:{' '}
                    <strong className="text-slate-800 font-mono">
                      {selectedLibraryTemplate
                        ? selectedLibraryTemplate.id
                        : selectedTemplate?.id}
                    </strong>
                  </span>
                  <span>
                    Delivery Engine:{' '}
                    <strong className="text-[#D4AF37] bg-slate-900 px-2 py-0.5 rounded-md font-mono text-[10px]">
                      Nodemailer Direct SMTP
                    </strong>
                  </span>
                </div>
              </div>

              {/* Rendered Email Frame with Viewport Constraint */}
              <div
                data-testid="email-preview-viewport"
                className={`mx-auto transition-all duration-300 ${
                  viewportMode === 'mobile'
                    ? 'max-w-[375px] border-8 border-slate-900 rounded-3xl p-1 bg-slate-950 shadow-2xl'
                    : 'max-w-[650px] w-full'
                }`}
              >
                {selectedLibraryTemplate ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderLuxuryTemplateHtml(
                        selectedLibraryTemplate.id,
                        selectedLibraryTemplate.sampleData,
                        selectedLibraryTemplate.subject
                      ),
                    }}
                  />
                ) : (
                  <div className="bg-[#090D15] rounded-xl p-1 border border-[#D4AF37]/30">
                    <div className="bg-white p-6 rounded-lg space-y-4">
                      <div className="text-center pb-3 border-b border-[#D4AF37]/30">
                        <span className="font-serif font-bold text-xs tracking-widest text-[#090D15]">
                          REALTOR BUDDY CONCIERGE
                        </span>
                        <p className="text-[9px] uppercase tracking-wider text-stone-400">
                          Dubai Automated Lifecycle Notice
                        </p>
                      </div>

                      <div
                        className="text-xs text-slate-700 leading-relaxed font-sans space-y-2"
                        dangerouslySetInnerHTML={{
                          __html:
                            selectedTemplate?.content_html || '<p>No content provided</p>',
                        }}
                      />

                      <div className="pt-4 border-t border-stone-200 text-center">
                        <p className="text-[10px] text-stone-400">
                          Realtor Buddy HQ • Automated Concierge Trigger
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-white px-6 py-3.5 border-t border-stone-200 flex items-center justify-between">
              <span className="text-[11px] text-stone-500 font-medium">
                Viewport: <strong className="capitalize text-slate-800">{viewportMode}</strong> mode
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedLibraryTemplate(null);
                  setSelectedTemplate(null);
                }}
                aria-label="Close Preview"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMarketing;
