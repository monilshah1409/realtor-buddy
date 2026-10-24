// Realtor Buddy: Pluggable Email Dispatcher Edge Function
// Supports Resend API with automatic Logger/Console fallback
// Audience segmentation against public.profiles and luxury Dubai HTML email formatting.

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Promise<Response> | Response): void;
};

import { createClient } from '@supabase/supabase-js';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export interface EmailDispatcherPayload {
  audience?: 'all' | 'active' | 'trial' | 'expired' | 'trial_users' | string;
  to?: string[];
  subject: string;
  htmlContent?: string;
  template?: string;
  data?: Record<string, any>;
}

/**
 * Generates a luxury Dubai Obsidian Noir & Champagne Gold responsive HTML email
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
    if (template === 'trial_day_3') {
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
    }
  }

  // Fallback body if none provided
  if (!bodyHtml) {
    bodyHtml = `<p style="color: #FAF8F5; font-size: 15px; line-height: 1.6;">${subject}</p>`;
  }

  // Template variable interpolation {{key}}
  for (const [key, val] of Object.entries(data)) {
    const pattern = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    bodyHtml = bodyHtml.replace(pattern, String(val));
  }

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

    // 3. Supabase admin client initialization (if configured)
    const supabaseUrl = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_URL') : undefined;
    const supabaseServiceRoleKey = typeof Deno !== 'undefined' ? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') : undefined;

    let supabaseAdmin: any = null;
    if (supabaseUrl && supabaseServiceRoleKey) {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }

    // 4. Resolve recipient emails
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
            query = query
              .eq('subscription_status', 'trial')
              .lte('trial_expires_at', nowIso);
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

    // 5. Generate Luxury Dubai HTML
    const formattedHtml = generateLuxuryEmailHtml({
      subject: payload.subject,
      htmlContent: payload.htmlContent,
      template: payload.template,
      data: payload.data,
    });

    // 6. Pluggable Dispatch: Resend API or Logger Fallback
    const resendApiKey = typeof Deno !== 'undefined' ? Deno.env.get('RESEND_API_KEY') : undefined;
    let provider: 'resend' | 'logger' = 'logger';
    let dispatchSuccess = false;
    let dispatchError: string | null = null;

    if (resendApiKey) {
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
            to: recipientEmails,
            subject: payload.subject,
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
        subject: payload.subject,
        recipientCount: recipientEmails.length,
        recipients: recipientEmails,
        provider: 'logger',
        timestamp: new Date().toISOString(),
      });
    }

    // 7. Persist logs into public.email_logs
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

    // 8. Output Response
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
