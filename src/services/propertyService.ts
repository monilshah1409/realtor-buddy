import { supabase, isLiveSupabase } from '../lib/supabase';
import type { Property, PropertyStatus } from '../types';

export const SUPPORT_EMAIL = 'mswebdevelopments.uae@gmail.com';

export interface FeedbackComplaintPayload {
  topic: string;
  brief: string;
  name: string;
  email: string;
  phone?: string;
  pageUrl?: string;
}

/**
 * Loads properties from live Supabase database if connected, or returns fallback.
 */
export async function fetchLiveProperties(): Promise<Property[]> {
  if (!isLiveSupabase()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch properties from Supabase:', error.message);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description || '',
      property_type: row.property_type,
      locality: row.locality,
      sub_community: row.sub_community || undefined,
      handover_status: row.handover_status,
      handover_date: row.handover_date,
      price_aed: Number(row.price_aed),
      developer_name: row.developer_name,
      area_sqft: Number(row.area_sqft),
      bedrooms: row.bedrooms,
      bathrooms: row.bathrooms,
      latitude: row.latitude,
      longitude: row.longitude,
      photos: row.photos || [],
      brochure_onedrive_url: row.brochure_onedrive_url || undefined,
      brochure_file_name: row.brochure_file_name || undefined,
      status: row.status as PropertyStatus,
      created_by: row.created_by,
      share_token: row.share_token,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  } catch (err) {
    console.warn('Supabase properties network exception:', err);
    return [];
  }
}

/**
 * Inserts a newly submitted property into Supabase.
 */
export async function insertLiveProperty(property: Property): Promise<boolean> {
  if (!isLiveSupabase()) {
    return true; // Local state handled in-memory
  }

  try {
    const { error } = await supabase.from('properties').insert({
      id: property.id,
      title: property.title,
      description: property.description,
      property_type: property.property_type,
      locality: property.locality,
      sub_community: property.sub_community,
      handover_status: property.handover_status,
      handover_date: property.handover_date,
      price_aed: property.price_aed,
      developer_name: property.developer_name,
      area_sqft: property.area_sqft,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      latitude: property.latitude,
      longitude: property.longitude,
      photos: property.photos,
      brochure_onedrive_url: property.brochure_onedrive_url,
      brochure_file_name: property.brochure_file_name,
      status: property.status,
      created_by: property.created_by,
      share_token: property.share_token,
    });

    if (error) {
      console.error('Error inserting property to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception inserting property to Supabase:', err);
    return false;
  }
}

/**
 * Updates a property status (approval / rejection) in Supabase.
 */
export async function updateLivePropertyStatus(
  id: string,
  status: PropertyStatus
): Promise<boolean> {
  if (!isLiveSupabase()) {
    return true;
  }

  try {
    const { error } = await supabase
      .from('properties')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating property status in Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updating property status in Supabase:', err);
    return false;
  }
}

/**
 * Submits user feedback or complaint to Supabase feedback_submissions table
 * and triggers email / mailto dispatch to mswebdevelopments.uae@gmail.com.
 */
export async function submitFeedbackComplaint(
  payload: FeedbackComplaintPayload
): Promise<void> {
  // 1. Record submission in Supabase
  if (isLiveSupabase()) {
    try {
      await supabase.from('feedback_submissions').insert({
        topic: payload.topic,
        brief: payload.brief,
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        page_url: payload.pageUrl,
        recipient_email: SUPPORT_EMAIL,
      });
    } catch (err) {
      console.warn('Could not save feedback to Supabase database:', err);
    }
  }

  // 2. Open mailto client pre-addressed to mswebdevelopments.uae@gmail.com
  const subject = encodeURIComponent(`[Realtor Buddy Feedback] ${payload.topic}: ${payload.name}`);
  const body = encodeURIComponent(
    `Topic: ${payload.topic}\n` +
    `Sender: ${payload.name} (${payload.email}${payload.phone ? `, Phone: ${payload.phone}` : ''})\n` +
    `Page URL: ${payload.pageUrl || 'N/A'}\n\n` +
    `Message:\n${payload.brief}`
  );
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    try {
      window.open(mailtoUrl, '_blank');
    } catch {
      // Ignore popup blocker in restrictive browsers
    }
  }
}
