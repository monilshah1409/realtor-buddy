// Realtor Buddy: Pluggable Email Dispatcher Edge Function
// Supports Nodemailer direct SMTP delivery (bypassing Supabase limits)
// with Resend API backward-compatibility and automatic Logger/Console fallback.
// Audience segmentation against public.profiles and 8 responsive luxury Dubai HTML email templates.

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

import nodemailer from 'npm:nodemailer@^6.9.16';
import { createClient } from '@supabase/supabase-js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export interface EmailDispatcherPayload {
  action?: 'send_email' | 'send_otp' | 'verify_otp' | string;
  audience?: 'all' | 'active' | 'trial' | 'expired' | 'trial_users' | string;
  to?: string[];
  subject?: string;
  htmlContent?: string;
  template?: string;
  data?: Record<string, any>;
  email?: string;
  otp_code?: string;
  purpose?: string;
}

export interface BrokerOtpRecord {
  id: string;
  email: string;
  otp_code: string;
  purpose: string;
  attempts: number;
  max_attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
}

// In-memory store for OTP records when database is unavailable (offline / testing)
export const inMemoryBrokerOtps: BrokerOtpRecord[] = [];

let customSupabaseAdmin: any = null;

export function setCustomSupabaseAdmin(client: any): void {
  customSupabaseAdmin = client;
}

export function clearInMemoryBrokerOtps(): void {
  inMemoryBrokerOtps.length = 0;
  customSupabaseAdmin = null;
}

export function getLatestMockOtp(email: string, purpose = 'verification'): BrokerOtpRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return inMemoryBrokerOtps
    .filter((o) => o.email === normalized && o.purpose === purpose)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
}

/**
 * Generates a luxury Dubai Obsidian Noir & Champagne Gold responsive HTML email
 * Supports 8 built-in templates with variable interpolation:
 * 1. otp_verification
 * 2. broker_welcome_trial
 * 3. trial_day_3
 * 4. trial_expiring_24h
 * 5. trial_expired_winback
 * 6. payment_receipt
 * 7. property_review_status
 * 8. admin_broadcast
 */
export function generateLuxuryEmailHtml(params: {
  subject: string;
  htmlContent?: string;
  template?: string;
  data?: Record<string, any>;
}): string {
  const { subject, htmlContent, template, data = {} } = params;

  let bodyHtml = htmlContent ? htmlContent.trim() : '';

  // Built-in luxury templates if no raw htmlContent is provided
  if (!bodyHtml && template) {
    if (template === 'otp_verification') {
      const code = data.code || '------';
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
    } else if (template === 'broker_welcome_trial') {
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
    } else if (template === 'trial_day_3') {
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
    } else if (template === 'trial_expiring_24h') {
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
    } else if (template === 'trial_expired_winback') {
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
    } else if (template === 'payment_receipt') {
      const invoiceId = data.invoice_id || ('INV-' + Math.floor(100000 + Math.random() * 900000));
      const amountAed = data.amount_aed !== undefined ? data.amount_aed : 149;
      const brokerName = data.broker_name || 'Esteemed Broker';
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
    } else if (template === 'property_review_status') {
      const propertyTitle = data.property_title || 'Off-Plan Development';
      const status = data.status || 'Under Review';
      const feedback = data.feedback || '';
      const isApproved = String(status).toLowerCase().includes('approv');

      bodyHtml = `
        <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
          Off-Plan Listing Status Update
        </h2>
        <p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">
          ${isApproved
            ? `Congratulations! Your off-plan development listing for <strong style="color: #D4AF37;">${propertyTitle}</strong> has been reviewed and <strong style="color: #22C55E;">${status}</strong> for publication on the Realtor Buddy marketplace.`
            : `Your listing submission for <strong style="color: #D4AF37;">${propertyTitle}</strong> has updated status: <strong style="color: #F59E0B;">${status}</strong>.`
          }
        </p>
        ${feedback ? `
          <div style="background: rgba(255, 255, 255, 0.04); border-left: 3px solid #D4AF37; padding: 14px 18px; margin: 20px 0; border-radius: 0 4px 4px 0;">
            <div style="color: #D4AF37; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
              Reviewer Feedback:
            </div>
            <div style="color: #FAF8F5; font-size: 14px; line-height: 1.5;">
              ${feedback}
            </div>
          </div>
        ` : ''}
        <div style="text-align: center; margin: 32px 0;">
          <a href="https://realtorbuddy.ae/app/inventory" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
            VIEW LISTING DETAILS
          </a>
        </div>
      `;
    } else if (template === 'admin_broadcast') {
      const headline = data.headline || subject || 'Realtor Buddy VIP Advisory';
      const message = data.message || data.body || subject;
      const ctaLabel = data.cta_label || '';
      const ctaUrl = data.cta_url || '';

      bodyHtml = `
        <h2 style="color: #D4AF37; font-family: 'Cinzel', Georgia, serif; font-size: 20px; margin-top: 0; font-weight: 600;">
          ${headline}
        </h2>
        <div style="color: #FAF8F5; font-size: 15px; line-height: 1.7; margin: 20px 0;">
          ${message}
        </div>
        ${ctaLabel && ctaUrl ? `
          <div style="text-align: center; margin: 32px 0;">
            <a href="${ctaUrl}" style="background: #D4AF37; color: #090D15; padding: 14px 28px; text-decoration: none; font-weight: bold; font-size: 13px; letter-spacing: 0.08em; border-radius: 4px; display: inline-block; text-transform: uppercase;">
              ${ctaLabel}
            </a>
          </div>
        ` : ''}
      `;
    }
  }

  // Fallback body if none provided
  if (!bodyHtml) {
    bodyHtml = `<p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">${subject}</p>`;
  }

  // Template variable interpolation {{key}} and {{ key }}
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined && val !== null) {
      const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
      bodyHtml = bodyHtml.replace(pattern, String(val));
    }
  }

  // Clean up any remaining unparsed mustache tags safely
  bodyHtml = bodyHtml.replace(/{{\s*[\w_.-]+\s*}}/g, '');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #090D15;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #FAF8F5;
      -webkit-font-smoothing: antialiased;
    }
    table {
      border-collapse: collapse;
    }
    a {
      color: #D4AF37;
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #090D15;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #090D15; width: 100%; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #121824; border: 1px solid rgba(212, 175, 55, 0.4); border-radius: 8px; overflow: hidden; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);">
          <!-- Header Bar with Cinzel Branding -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, #182030 0%, #121824 100%); border-bottom: 1px solid rgba(212, 175, 55, 0.2);">
              <div style="font-family: 'Cinzel', Georgia, serif; font-size: 24px; font-weight: 700; color: #D4AF37; letter-spacing: 0.18em; text-transform: uppercase;">
                REALTOR BUDDY
              </div>
              <div style="font-size: 11px; letter-spacing: 0.24em; color: #FAF8F5; opacity: 0.8; text-transform: uppercase; margin-top: 6px;">
                DUBAI OFF-PLAN INTELLIGENCE
              </div>
            </td>
          </tr>

          <!-- Champagne Gold Accent Divider -->
          <tr>
            <td style="padding: 0; height: 2px; background: linear-gradient(90deg, rgba(212, 175, 55, 0) 0%, #D4AF37 50%, rgba(212, 175, 55, 0) 100%);"></td>
          </tr>

          <!-- Email Subject Header -->
          <tr>
            <td style="padding: 32px 32px 12px;">
              <h1 style="margin: 0; font-family: 'Cinzel', Georgia, serif; font-size: 20px; font-weight: 600; color: #FAF8F5; line-height: 1.4;">
                ${subject}
              </h1>
            </td>
          </tr>

          <!-- Email Body Content -->
          <tr>
            <td style="padding: 12px 32px 32px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; line-height: 1.65; color: #FAF8F5;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;">
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); height: 1px;"></div>
            </td>
          </tr>

          <!-- Luxury Dubai Concierge Footer -->
          <tr>
            <td style="padding: 24px 32px 32px; text-align: center; font-size: 12px; color: #8F9BB3; line-height: 1.6;">
              <div style="font-family: 'Cinzel', Georgia, serif; font-size: 13px; font-weight: 600; color: #D4AF37; margin-bottom: 8px;">
                REALTOR BUDDY VIP CONCIERGE
              </div>
              <p style="margin: 4px 0;">Downtown Dubai • Emaar Square • Building 4, Level 6</p>
              <p style="margin: 4px 0;">Empowering elite UAE brokerages with wholesale off-plan data & investor assets.</p>
              <p style="margin: 12px 0 0; font-size: 11px; color: #64748B;">
                © ${new Date().getFullYear()} Realtor Buddy AE. All rights reserved. • Confidential Brokerage Dispatch
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function dispatchEmail(options: {
  recipients: string[];
  subject: string;
  formattedHtml: string;
}): Promise<{
  provider: 'nodemailer' | 'resend' | 'logger';
  dispatchSuccess: boolean;
  dispatchError: string | null;
}> {
  const { recipients, subject, formattedHtml } = options;

  const smtpHost = typeof Deno !== 'undefined' ? Deno.env.get('SMTP_HOST') : undefined;
  const smtpPort = typeof Deno !== 'undefined' ? Number(Deno.env.get('SMTP_PORT') || 587) : 587;
  const smtpSecure = typeof Deno !== 'undefined'
    ? (Deno.env.get('SMTP_SECURE') === 'true' || smtpPort === 465)
    : false;
  const smtpUser = typeof Deno !== 'undefined' ? Deno.env.get('SMTP_USER') : undefined;
  const smtpPass = typeof Deno !== 'undefined' ? Deno.env.get('SMTP_PASS') : undefined;
  const smtpFrom = (typeof Deno !== 'undefined' && Deno.env.get('SMTP_FROM'))
    || '"Realtor Buddy VIP Concierge" <concierge@realtorbuddy.ae>';

  const resendApiKey = typeof Deno !== 'undefined' ? Deno.env.get('RESEND_API_KEY') : undefined;
  let provider: 'nodemailer' | 'resend' | 'logger' = 'logger';
  let dispatchSuccess = false;
  let dispatchError: string | null = null;

  if (smtpHost && smtpUser && smtpPass) {
    provider = 'nodemailer';
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: recipients.join(', '),
        subject,
        html: formattedHtml,
      });

      dispatchSuccess = true;
    } catch (smtpErr: any) {
      console.error('[EMAIL-DISPATCHER] Nodemailer SMTP delivery error:', smtpErr);
      dispatchError = smtpErr?.message || 'SMTP delivery exception';
    }
  } else if (resendApiKey) {
    provider = 'resend';
    try {
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Realtor Buddy VIP <concierge@realtorbuddy.ae>',
          to: recipients,
          subject,
          html: formattedHtml,
        }),
      });

      if (resendResponse.ok) {
        dispatchSuccess = true;
      } else {
        const errText = await resendResponse.text();
        console.error('[EMAIL-DISPATCHER] Resend API error response:', resendResponse.status, errText);
        dispatchError = `Resend error (${resendResponse.status}): ${errText}`;
      }
    } catch (networkErr: any) {
      console.error('[EMAIL-DISPATCHER] Resend network error:', networkErr);
      dispatchError = networkErr?.message || 'Network exception calling Resend API';
    }
  } else {
    // Mock Logger fallback
    provider = 'logger';
    dispatchSuccess = true;
    console.log('[EMAIL-DISPATCHER: MOCK DISPATCH]', {
      subject,
      recipientCount: recipients.length,
      recipients,
      provider: 'logger',
      timestamp: new Date().toISOString(),
    });
  }

  return { provider, dispatchSuccess, dispatchError };
}

export async function handleEmailDispatcherRequest(req: Request): Promise<Response> {
  // 1. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST is allowed for email dispatch
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed. Use POST.' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // 2. Parse & Validate input payload
    let payload: EmailDispatcherPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Supabase admin client initialization (if configured)
    const supabaseUrl = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') : undefined;
    const supabaseServiceRoleKey = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : undefined;

    let supabaseAdmin: any = customSupabaseAdmin;
    if (!supabaseAdmin && supabaseUrl && supabaseServiceRoleKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    // 4. Route Authorization Guard
    const action = payload?.action || 'send_email';
    const isPublicAction = action === 'send_otp' || action === 'verify_otp';

    if (!isPublicAction) {
      const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
      const requireAuth = Boolean(
        (supabaseUrl && supabaseServiceRoleKey) ||
        (typeof Deno !== 'undefined' && Deno.env.get('REQUIRE_AUTH') === 'true')
      );

      if (requireAuth) {
        const allowedTransactionalTemplates = [
          'broker_welcome_trial',
          'payment_receipt',
          'property_review_status',
          'otp_verification',
        ];
        const isSingleRecipient = Array.isArray(payload?.to) && payload.to.length === 1;
        const isTransactional =
          !payload?.audience &&
          isSingleRecipient &&
          typeof payload?.template === 'string' &&
          allowedTransactionalTemplates.includes(payload.template);

        let isAuthorized = false;

        if (!authHeader) {
          if (isTransactional) {
            // Permit single-recipient transactional email for internal system calls
            isAuthorized = true;
          } else {
            return new Response(
              JSON.stringify({ error: 'Unauthorized: Missing Authorization header for email broadcast' }),
              {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
        } else {
          const token = authHeader.replace(/^Bearer\s+/i, '').trim();

          if (supabaseServiceRoleKey && token === supabaseServiceRoleKey) {
            isAuthorized = true;
          } else if (supabaseAdmin) {
            try {
              const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
              if (!userError && user) {
                const role = user.app_metadata?.role || user.user_metadata?.role || user.role;
                const isAdmin = role === 'admin' || role === 'service_role';
                if (isAdmin) {
                  isAuthorized = true;
                } else if (isTransactional) {
                  // Permit single-recipient transactional emails for authenticated brokers
                  isAuthorized = true;
                }
              }
            } catch (authErr) {
              console.warn('[EMAIL-DISPATCHER] Token validation error:', authErr);
            }
          }
        }

        if (!isAuthorized) {
          return new Response(
            JSON.stringify({ error: 'Forbidden: Admin access required for email broadcasts' }),
            {
              status: 403,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // 5. Handle action: send_otp (Public endpoint with rate limiting)
    if (action === 'send_otp') {
      const email = payload.email;
      if (!email || typeof email !== 'string' || !email.includes('@') || email.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'Valid email is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const purpose = payload.purpose?.trim() || 'verification';

      // Strict rate limiting: Maximum 3 requests in the last 60 minutes
      const oneHourAgoIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const oneHourAgoMs = Date.now() - 60 * 60 * 1000;
      let countLastHour = 0;

      if (supabaseAdmin) {
        try {
          const { count, error: countErr } = await supabaseAdmin
            .from('broker_otps')
            .select('*', { count: 'exact', head: true })
            .eq('email', normalizedEmail)
            .gt('created_at', oneHourAgoIso);

          if (!countErr && typeof count === 'number') {
            countLastHour = count;
          }
        } catch (dbErr) {
          console.warn('[EMAIL-DISPATCHER] Supabase OTP count error:', dbErr);
        }
      } else {
        countLastHour = inMemoryBrokerOtps.filter(
          (o) => o.email === normalizedEmail && new Date(o.created_at).getTime() > oneHourAgoMs
        ).length;
      }

      if (countLastHour >= 3) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Maximum 3 verification codes per hour.' }),
          {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Generate cryptographically secure 6-digit numeric string
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      const otpCode = (100000 + (buffer[0] % 900000)).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('broker_otps').insert({
            email: normalizedEmail,
            otp_code: otpCode,
            purpose,
            attempts: 0,
            max_attempts: 5,
            expires_at: expiresAt,
          });
        } catch (dbErr) {
          console.warn('[EMAIL-DISPATCHER] Failed to insert broker_otps into Supabase:', dbErr);
        }
      }

      // Record in memory store
      inMemoryBrokerOtps.unshift({
        id: 'otp-' + Math.random().toString(36).substring(2, 9),
        email: normalizedEmail,
        otp_code: otpCode,
        purpose,
        attempts: 0,
        max_attempts: 5,
        expires_at: expiresAt,
        consumed_at: null,
        created_at: new Date().toISOString(),
      });

      // Send otp_verification email via Nodemailer
      const otpHtml = generateLuxuryEmailHtml({
        subject: 'Your Realtor Buddy Verification Code',
        template: 'otp_verification',
        data: {
          code: otpCode,
          expiry_minutes: 10,
        },
      });

      await dispatchEmail({
        recipients: [normalizedEmail],
        subject: 'Your Realtor Buddy Verification Code',
        formattedHtml: otpHtml,
      });

      return new Response(
        JSON.stringify({
          success: true,
          action: 'send_otp',
          message: 'Verification code sent',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 6. Handle action: verify_otp (Public endpoint with brute force guard)
    if (action === 'verify_otp') {
      const email = payload.email;
      const otpCode = payload.otp_code;

      if (!email || typeof email !== 'string' || !email.includes('@') || email.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, verified: false, error: 'Valid email is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      if (!otpCode || typeof otpCode !== 'string' || otpCode.trim().length === 0) {
        return new Response(
          JSON.stringify({ success: false, verified: false, error: 'Verification code is required' }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      const trimmedCode = otpCode.trim();
      const purpose = payload.purpose?.trim() || 'verification';

      let otpRecord: BrokerOtpRecord | null = null;

      if (supabaseAdmin) {
        try {
          const { data, error } = await supabaseAdmin
            .from('broker_otps')
            .select('*')
            .eq('email', normalizedEmail)
            .eq('purpose', purpose)
            .is('consumed_at', null)
            .order('created_at', { ascending: false })
            .limit(1);

          if (!error && Array.isArray(data) && data.length > 0) {
            otpRecord = data[0];
          }
        } catch (dbErr) {
          console.warn('[EMAIL-DISPATCHER] Supabase fetch OTP error:', dbErr);
        }
      }

      if (!otpRecord) {
        otpRecord = inMemoryBrokerOtps.find(
          (o) => o.email === normalizedEmail && o.purpose === purpose && o.consumed_at === null
        ) || null;
      }

      if (!otpRecord) {
        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            error: 'Verification code expired or invalid',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check expiry
      if (new Date(otpRecord.expires_at).getTime() <= Date.now()) {
        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            error: 'Verification code expired or invalid',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check max attempts exceeded
      const maxAttempts = otpRecord.max_attempts || 5;
      if ((otpRecord.attempts || 0) >= maxAttempts) {
        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            error: 'Maximum attempts exceeded. Please request a new code.',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check code match
      if (otpRecord.otp_code === trimmedCode) {
        const nowIso = new Date().toISOString();
        otpRecord.consumed_at = nowIso;

        if (supabaseAdmin) {
          try {
            await supabaseAdmin
              .from('broker_otps')
              .update({ consumed_at: nowIso })
              .eq('id', otpRecord.id);

            await supabaseAdmin
              .from('profiles')
              .update({ email_verified: true })
              .eq('email', normalizedEmail);
          } catch (updateErr) {
            console.warn('[EMAIL-DISPATCHER] Supabase update OTP/profile error:', updateErr);
          }
        }

        return new Response(
          JSON.stringify({
            success: true,
            verified: true,
            message: 'Email successfully verified',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        const updatedAttempts = (otpRecord.attempts || 0) + 1;
        otpRecord.attempts = updatedAttempts;

        if (supabaseAdmin) {
          try {
            await supabaseAdmin
              .from('broker_otps')
              .update({ attempts: updatedAttempts })
              .eq('id', otpRecord.id);
          } catch (updateErr) {
            console.warn('[EMAIL-DISPATCHER] Supabase increment OTP attempts error:', updateErr);
          }
        }

        if (updatedAttempts >= maxAttempts) {
          return new Response(
            JSON.stringify({
              success: false,
              verified: false,
              error: 'Maximum attempts exceeded. Please request a new code.',
            }),
            {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            verified: false,
            error: 'Incorrect verification code',
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 7. Handle action: send_email (Protected broadcast or direct email dispatch)
    const hasSubject = typeof payload?.subject === 'string' && payload.subject.trim().length > 0;
    const hasAudience = typeof payload?.audience === 'string' && payload.audience.trim().length > 0;
    const hasTo = Array.isArray(payload?.to) && payload.to.length > 0;

    if (!hasSubject || (!hasAudience && !hasTo)) {
      return new Response(
        JSON.stringify({ error: 'Missing subject or recipient audience' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Resolve recipient emails
    let recipientEmails: string[] = [];

    if (hasTo && payload.to) {
      recipientEmails = payload.to
        .filter((email) => typeof email === 'string' && email.includes('@'))
        .map((email) => email.trim().toLowerCase());
    } else if (hasAudience && payload.audience) {
      const rawAudience = payload.audience.toLowerCase().trim();
      const normalizedAudience = rawAudience === 'trial_users' ? 'trial' : rawAudience;
      const nowIso = new Date().toISOString();

      if (supabaseAdmin) {
        try {
          let query = supabaseAdmin
            .from('profiles')
            .select('email')
            .not('email', 'is', null);

          if (normalizedAudience === 'active') {
            query = query.eq('subscription_status', 'active');
          } else if (normalizedAudience === 'trial') {
            query = query
              .eq('subscription_status', 'trial')
              .gt('trial_expires_at', nowIso);
          } else if (normalizedAudience === 'expired') {
            query = query.or(
              `subscription_status.eq.expired,and(subscription_status.eq.trial,trial_expires_at.lte.${nowIso})`
            );
          }
          // 'all' includes all profiles where email is not null

          const { data, error } = await query;
          if (!error && Array.isArray(data)) {
            recipientEmails = data
              .map((row: any) => row.email)
              .filter((email: any) => typeof email === 'string' && email.includes('@'))
              .map((email: string) => email.trim().toLowerCase());
          } else if (error) {
            console.warn('[EMAIL-DISPATCHER] Supabase query profiles error:', error);
          }
        } catch (dbErr) {
          console.warn('[EMAIL-DISPATCHER] Supabase profiles fetch error:', dbErr);
        }
      }

      // Fallback mock recipient resolution if Supabase credentials are not configured or no records found
      if (recipientEmails.length === 0) {
        if (normalizedAudience === 'active') {
          recipientEmails = ['broker.active1@apexrealty.ae', 'broker.active2@skyline.ae'];
        } else if (normalizedAudience === 'trial') {
          recipientEmails = ['broker.trial1@emaarpartners.ae', 'broker.trial2@marinaestates.ae'];
        } else if (normalizedAudience === 'expired') {
          recipientEmails = ['broker.expired1@gulfproperties.ae'];
        } else {
          recipientEmails = [
            'broker1@apexrealty.ae',
            'broker2@skyline.ae',
            'broker3@marinaestates.ae',
          ];
        }
      }
    }

    // Deduplicate recipient emails
    recipientEmails = Array.from(new Set(recipientEmails));

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid recipient email addresses found' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate Luxury Dubai HTML
    const formattedHtml = generateLuxuryEmailHtml({
      subject: payload.subject!,
      htmlContent: payload.htmlContent,
      template: payload.template,
      data: payload.data,
    });

    // Pluggable Dispatch via helper
    const { provider, dispatchSuccess, dispatchError } = await dispatchEmail({
      recipients: recipientEmails,
      subject: payload.subject!,
      formattedHtml,
    });

    // Persist logs into public.email_logs
    if (supabaseAdmin) {
      try {
        const logEntries = recipientEmails.map((email) => ({
          recipient_email: email,
          subject: payload.subject,
          campaign_type: payload.template || payload.audience || 'broadcast',
          template_name: payload.template || null,
          provider: provider,
          status: dispatchSuccess ? (provider === 'logger' ? 'logged' : 'sent') : 'failed',
          error_message: dispatchError,
          sent_at: new Date().toISOString(),
        }));

        // Attempt insert with extended columns
        const { error: insertErr } = await supabaseAdmin
          .from('email_logs')
          .insert(logEntries);

        if (insertErr) {
          // Fallback if template_name or provider columns do not exist in existing schema
          const fallbackEntries = recipientEmails.map((email) => ({
            recipient_email: email,
            subject: payload.subject,
            campaign_type: payload.template || payload.audience || 'broadcast',
            status: dispatchSuccess ? (provider === 'logger' ? 'logged' : 'sent') : 'failed',
            error_message: dispatchError,
            sent_at: new Date().toISOString(),
          }));

          await supabaseAdmin.from('email_logs').insert(fallbackEntries);
        }
      } catch (logEx) {
        console.warn('[EMAIL-DISPATCHER] Failed to persist email logs:', logEx);
      }
    }

    // Output Response
    if (dispatchSuccess) {
      return new Response(
        JSON.stringify({
          success: true,
          dispatchedCount: recipientEmails.length,
          provider: provider,
          audience: payload.audience || 'custom',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: dispatchError || 'Failed to dispatch emails via provider',
          provider: provider,
          dispatchedCount: 0,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (err: any) {
    console.error('[EMAIL-DISPATCHER] Unhandled exception:', err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Internal server error in email-dispatcher',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

if (typeof Deno !== 'undefined' && typeof Deno.serve === 'function') {
  Deno.serve(handleEmailDispatcherRequest);
}
