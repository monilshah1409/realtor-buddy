/**
 * Realtor Buddy: 8 Luxury Email Templates Catalog & HTML Renderer
 * Matches Obsidian Noir (#090D15) and Champagne Gold (#D4AF37) brand identity.
 */

export interface EmailTemplateDefinition {
  id: string;
  name: string;
  category: 'Security' | 'Onboarding' | 'Lifecycle' | 'Billing' | 'Operations' | 'Broadcast';
  subject: string;
  description: string;
  triggerEvent: string;
  sampleData: Record<string, any>;
}

export const EMAIL_TEMPLATES_CATALOG: EmailTemplateDefinition[] = [
  {
    id: 'otp_verification',
    name: 'OTP Verification',
    category: 'Security',
    subject: 'Your Verification Code',
    description: 'Cryptographically generated 6-digit numeric passcode with 10-minute expiry for broker registration.',
    triggerEvent: 'Broker Registration Form Submission',
    sampleData: {
      code: '849201',
      expiry_minutes: 10,
    },
  },
  {
    id: 'broker_welcome_trial',
    name: 'Broker Welcome & VIP Trial',
    category: 'Onboarding',
    subject: 'Welcome to Realtor Buddy VIP — 5-Day Full Access Activated',
    description: 'Onboarding welcome package with trial activation details and direct inventory link.',
    triggerEvent: 'Successful Code Verification & Account Activation',
    sampleData: {
      broker_name: 'Tariq Al-Mansoor',
      trial_days: 5,
    },
  },
  {
    id: 'trial_day_3',
    name: 'Trial Day 3 Feature Discovery',
    category: 'Lifecycle',
    subject: 'Unlock Exclusive Wholesale Off-Plan Pricing & PDF Exports',
    description: 'Mid-trial discovery showcasing branded brochure export, wholesale pricing, and shortlist features.',
    triggerEvent: '72 Hours Post-Registration (Automated Drip)',
    sampleData: {
      broker_name: 'Tariq Al-Mansoor',
    },
  },
  {
    id: 'trial_expiring_24h',
    name: 'Trial 24h Expiration Alert',
    category: 'Lifecycle',
    subject: 'Your VIP Access Expires in 24 Hours — Continue for 149 AED/mo',
    description: 'Urgency expiration notice alerting the broker that full-access trial ends tomorrow.',
    triggerEvent: '24 Hours Before Trial Ends (Automated Drip)',
    sampleData: {
      broker_name: 'Tariq Al-Mansoor',
    },
  },
  {
    id: 'trial_expired_winback',
    name: 'Trial Expired Win-Back Offer',
    category: 'Lifecycle',
    subject: 'Exclusive Partner Offer: 20% Off Your Realtor Buddy License',
    description: 'Retention offer delivering promotional coupon code SPECIAL20 for 20% membership savings.',
    triggerEvent: '48 Hours Post-Expiration (Automated Drip)',
    sampleData: {
      broker_name: 'Tariq Al-Mansoor',
      promo_code: 'SPECIAL20',
    },
  },
  {
    id: 'payment_receipt',
    name: 'Payment Receipt',
    category: 'Billing',
    subject: 'VIP Membership Confirmation & Receipt (149 AED)',
    description: 'Automated payment confirmation and tax invoice for 149 AED monthly VIP access via Ziina Pay.',
    triggerEvent: 'Successful Payment Webhook / Transaction',
    sampleData: {
      invoice_id: 'INV-2026-904',
      amount_aed: 149,
      broker_name: 'Elena Rostova',
      payment_method: 'Ziina Pay',
    },
  },
  {
    id: 'property_review_status',
    name: 'Property Listing Review Update',
    category: 'Operations',
    subject: 'Off-Plan Listing Status: Habtoor Grand Residences Approved',
    description: 'Broker notification when an off-plan development listing is approved or changes are requested.',
    triggerEvent: 'Admin Listing Moderation',
    sampleData: {
      property_title: 'Habtoor Grand Residences',
      status: 'approved',
      feedback: 'All luxury floor plans and commission details have been verified.',
    },
  },
  {
    id: 'admin_broadcast',
    name: 'Executive Broadcast Announcement',
    category: 'Broadcast',
    subject: 'Q4 Dubai Real Estate Market Brief & Penthouse Allocation',
    description: 'Bespoke executive newsletters, off-plan developer allocations, and high-priority announcements.',
    triggerEvent: 'Manual Admin Dispatch',
    sampleData: {
      headline: 'Record Off-Plan Sales Across Dubai Marina',
      message: 'Over 12,000 off-plan registrations recorded this quarter across Dubai prime locations.',
      cta_label: 'VIEW MARKET REPORT',
      cta_url: 'https://realtorbuddy.ae/reports/q4',
    },
  },
];

export function renderLuxuryTemplateHtml(
  templateId: string,
  customData?: Record<string, any>,
  customSubject?: string
): string {
  const definition = EMAIL_TEMPLATES_CATALOG.find((t) => t.id === templateId);
  const data = { ...(definition?.sampleData || {}), ...(customData || {}) };
  const subject = customSubject || definition?.subject || 'Realtor Buddy VIP Advisory';

  let bodyHtml = '';

  if (templateId === 'otp_verification') {
    const code = data.code || '849201';
    const expiryMinutes = data.expiry_minutes || 10;
    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        Broker Verification Code
      </h2>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Welcome to Realtor Buddy. Use the secure 6-digit verification code below to confirm your brokerage email address and activate your VIP access.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; background: rgba(212, 175, 55, 0.08); border: 2px solid #D4AF37; border-radius: 8px; padding: 18px 36px; box-shadow: 0 8px 24px rgba(212, 175, 55, 0.15);">
          <span style="font-family: 'Cinzel', Georgia, monospace, serif; font-size: 32px; font-weight: 700; color: #D4AF37; letter-spacing: 0.3em; display: inline-block;">
            ${code}
          </span>
        </div>
      </div>
      <p style="text-align: center; color: #FAF8F5; font-size: 14px; margin-bottom: 24px;">
        This one-time passcode is valid for <strong style="color: #D4AF37;">${expiryMinutes} minutes</strong>. For security, never share this code with anyone.
      </p>
      <p style="font-size: 12px; color: #8F9BB3; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 16px; margin-top: 24px;">
        If you did not initiate this request, you can safely ignore this email or contact our VIP Concierge team.
      </p>
    `;
  } else if (templateId === 'broker_welcome_trial') {
    const brokerName = data.broker_name || 'Esteemed Broker';
    const trialDays = data.trial_days || 5;
    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        Welcome to Realtor Buddy VIP
      </h2>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Dear ${brokerName}, welcome to Dubai's premier off-plan brokerage intelligence network.
      </p>
      <div style="background: rgba(212, 175, 55, 0.06); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 6px; padding: 20px; margin: 24px 0;">
        <div style="font-family: 'Cinzel', Georgia, serif; color: #D4AF37; font-size: 16px; font-weight: 700; margin-bottom: 10px; text-transform: uppercase;">
          Your ${trialDays}-Day Complimentary Trial is Active
        </div>
        <ul style="margin: 0; padding-left: 20px; color: #FAF8F5; font-size: 14px; line-height: 1.8;">
          <li>Direct access to developer-verified Dubai off-plan projects</li>
          <li>Branded PDF brochures & investor shortlists with your contact info</li>
          <li>Accurate developer commission structures and payment milestones</li>
          <li>Real-time ROI, rental yield, and capital appreciation analytics</li>
        </ul>
      </div>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Explore top projects across Dubai Maritime City, Palm Jumeirah, Business Bay, and Downtown Dubai.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://realtorbuddy.ae/app/off-plan" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
          EXPLORE OFF-PLAN INVENTORY
        </a>
      </div>
    `;
  } else if (templateId === 'trial_day_3') {
    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        Unlock Exclusive Wholesale Off-Plan Pricing
      </h2>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Your 5-Day Free Trial is in full swing. Have you explored Dubai's top upcoming off-plan developments across Dubai Maritime City, Palm Jumeirah, and Downtown Dubai?
      </p>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Download broker-ready branded PDF brochures, export curated shortlists for your high-net-worth investors, and access real-time developer commission structures.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://realtorbuddy.ae/app/off-plan" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
          EXPLORE OFF-PLAN INVENTORY
        </a>
      </div>
    `;
  } else if (templateId === 'trial_expiring_24h') {
    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        Your VIP Trial Expires in 24 Hours
      </h2>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Don't lose instant access to verified Dubai off-plan projects, high-yield payment plans, and branded brochure generation.
      </p>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Maintain uninterrupted brokerage intelligence for only <strong style="color: #D4AF37;">149 AED/month</strong>. Cancel anytime with zero lock-in.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://realtorbuddy.ae/app/subscribe" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
          CONTINUE VIP MEMBERSHIP (149 AED/MO)
        </a>
      </div>
    `;
  } else if (templateId === 'trial_expired_winback') {
    const code = data.promo_code || 'SPECIAL20';
    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        Exclusive Partner Offer: 20% Off Your Membership
      </h2>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Your 5-Day Free Trial has concluded. We would love to continue empowering your Dubai real estate transactions.
      </p>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Use exclusive partner code <strong style="color: #D4AF37; letter-spacing: 0.1em; background: rgba(212, 175, 55, 0.15); padding: 2px 8px; border-radius: 3px;">${code}</strong> at checkout to claim 20% off your monthly membership.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://realtorbuddy.ae/app/subscribe?promo=${code}" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
          REDEEM 20% SAVINGS
        </a>
      </div>
    `;
  } else if (templateId === 'payment_receipt') {
    const invoiceId = data.invoice_id || 'INV-2026-904';
    const amountAed = data.amount_aed !== undefined ? data.amount_aed : 149;
    const brokerName = data.broker_name || 'Elena Rostova';
    const paymentMethod = data.payment_method || 'Ziina Pay';
    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        VIP Membership Confirmation & Receipt
      </h2>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        Thank you for your payment, ${brokerName}. Your Realtor Buddy VIP subscription is active and confirmed.
      </p>
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 6px; overflow: hidden;">
        <tr>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #8F9BB3; font-size: 13px;">Invoice Reference</td>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #FAF8F5; font-size: 13px; font-weight: 600; text-align: right;">${invoiceId}</td>
        </tr>
        <tr>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #8F9BB3; font-size: 13px;">Amount Paid</td>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #D4AF37; font-size: 15px; font-weight: 700; text-align: right;">${amountAed} AED</td>
        </tr>
        <tr>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #8F9BB3; font-size: 13px;">Member</td>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #FAF8F5; font-size: 13px; text-align: right;">${brokerName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #8F9BB3; font-size: 13px;">Payment Provider</td>
          <td style="padding: 12px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); color: #FAF8F5; font-size: 13px; text-align: right;">${paymentMethod}</td>
        </tr>
        <tr>
          <td style="padding: 12px 18px; color: #8F9BB3; font-size: 13px;">Membership Plan</td>
          <td style="padding: 12px 18px; color: #FAF8F5; font-size: 13px; text-align: right;">Monthly VIP Access (149 AED/mo)</td>
        </tr>
      </table>
      <p style="color: #FAF8F5; font-size: 14px; line-height: 1.6;">
        Your VIP membership includes unlimited brochure generation, wholesale off-plan data access, and concierge support.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://realtorbuddy.ae/app/dashboard" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
          GO TO VIP DASHBOARD
        </a>
      </div>
    `;
  } else if (templateId === 'property_review_status') {
    const propertyTitle = data.property_title || 'Habtoor Grand Residences';
    const status = data.status || 'approved';
    const feedback = data.feedback || 'All luxury floor plans and commission details have been verified.';
    const isApproved = String(status).toLowerCase().includes('approv');

    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        Off-Plan Listing Status Update
      </h2>
      <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
        ${
          isApproved
            ? `Congratulations! Your off-plan development listing for <strong style="color: #D4AF37;">${propertyTitle}</strong> has been reviewed and <strong style="color: #22C55E;">${status}</strong> for publication on the Realtor Buddy marketplace.`
            : `Your listing submission for <strong style="color: #D4AF37;">${propertyTitle}</strong> has updated status: <strong style="color: #F59E0B;">${status}</strong>.`
        }
      </p>
      ${
        feedback
          ? `
        <div style="background: rgba(255, 255, 255, 0.04); border-left: 3px solid #D4AF37; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0;">
          <div style="color: #D4AF37; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
            Reviewer Feedback:
          </div>
          <div style="color: #FAF8F5; font-size: 14px; line-height: 1.5;">
            ${feedback}
          </div>
        </div>
      `
          : ''
      }
      <div style="text-align: center; margin: 32px 0;">
        <a href="https://realtorbuddy.ae/app/inventory" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
          VIEW LISTING DETAILS
        </a>
      </div>
    `;
  } else if (templateId === 'admin_broadcast') {
    const headline = data.headline || 'Record Off-Plan Sales Across Dubai Marina';
    const message =
      data.message ||
      'Over 12,000 off-plan registrations recorded this quarter across Dubai prime locations.';
    const ctaLabel = data.cta_label || 'VIEW MARKET REPORT';
    const ctaUrl = data.cta_url || 'https://realtorbuddy.ae/reports/q4';

    bodyHtml = `
      <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
        ${headline}
      </h2>
      <div style="color: #FAF8F5; font-size: 15px; line-height: 1.7; margin: 20px 0;">
        ${message}
      </div>
      ${
        ctaLabel && ctaUrl
          ? `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${ctaUrl}" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
            ${ctaLabel}
          </a>
        </div>
      `
          : ''
      }
    `;
  } else {
    bodyHtml = `<p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">${subject}</p>`;
  }

  // Template variable interpolation
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      bodyHtml = bodyHtml.replace(pattern, String(val));
    }
  }

  return `
    <div style="background-color: #090D15; color: #FAF8F5; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; border-radius: 12px; border: 1px solid rgba(212, 175, 55, 0.35); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7); max-width: 100%; box-sizing: border-box;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid rgba(212, 175, 55, 0.25); margin-bottom: 24px;">
        <div style="font-family: 'Cinzel', Georgia, serif; font-size: 22px; font-weight: 700; color: #D4AF37; letter-spacing: 0.18em; text-transform: uppercase;">
          REALTOR BUDDY
        </div>
        <div style="font-size: 10px; letter-spacing: 0.24em; color: #FAF8F5; opacity: 0.8; text-transform: uppercase; margin-top: 4px;">
          DUBAI OFF-PLAN INTELLIGENCE
        </div>
      </div>
      <div style="padding: 8px 4px;">
        ${bodyHtml}
      </div>
      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.08); text-align: center; font-size: 11px; color: #8F9BB3;">
        <p style="margin: 0 0 6px 0;">Realtor Buddy HQ • Emaar Square Building 4, Downtown Dubai</p>
        <p style="margin: 0; font-size: 10px; opacity: 0.7;">Official Transactional Communication • All Rights Reserved</p>
      </div>
    </div>
  `;
}
