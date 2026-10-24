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

export const LOCAL_PROPERTIES_STORAGE_KEY = 'realtor_buddy_custom_properties';

/**
 * Retrieves custom properties created by the broker stored in localStorage.
 */
export function getLocalStoredProperties(): Property[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(LOCAL_PROPERTIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed to parse local stored properties:', err);
    return [];
  }
}

/**
 * Saves a property to localStorage so it is preserved immediately across page refreshes.
 */
export function saveLocalStoredProperty(property: Property): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const existing = getLocalStoredProperties();
    const updated = [property, ...existing.filter((p) => p.id !== property.id)];
    window.localStorage.setItem(LOCAL_PROPERTIES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to save property to localStorage:', err);
  }
}

/**
 * Removes a locally stored property from localStorage.
 */
export function removeLocalStoredProperty(id: string): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const existing = getLocalStoredProperties();
    const updated = existing.filter((p) => p.id !== id);
    window.localStorage.setItem(LOCAL_PROPERTIES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to remove property from localStorage:', err);
  }
}

/**
 * Loads properties from live Supabase database if connected, merged with local stored properties, or returns fallback.
 */
export async function fetchLiveProperties(): Promise<Property[]> {
  const localProps = getLocalStoredProperties();

  if (!isLiveSupabase()) {
    return localProps;
  }

  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to fetch properties from Supabase:', error.message);
      return localProps;
    }

    const liveMapped: Property[] = (data || []).map((row) => ({
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

    // Merge Supabase properties with any locally added properties so fresh broker additions are never lost
    const liveIds = new Set(liveMapped.map((p) => p.id));
    const uniqueLocal = localProps.filter((p) => !liveIds.has(p.id));

    return [...uniqueLocal, ...liveMapped];
  } catch (err) {
    console.warn('Supabase properties network exception:', err);
    return localProps;
  }
}

/**
 * Inserts a newly submitted property into Supabase with automatic local storage fallback.
 */
export async function insertLiveProperty(property: Property): Promise<boolean> {
  // Always persist to localStorage first so it immediately survives page refreshes
  saveLocalStoredProperty(property);

  if (!isLiveSupabase()) {
    return true;
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.id);

    // Get current auth session user ID if available
    let createdBy = property.created_by;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user?.id) {
        createdBy = sessionData.session.user.id;
      }
    } catch {
      // ignore
    }

    const payload: any = {
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
      status: property.status || 'global',
      share_token: property.share_token,
    };

    if (isUuid) {
      payload.id = property.id;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(createdBy)) {
      payload.created_by = createdBy;
    }

    const { error } = await supabase.from('properties').insert(payload);

    if (error) {
      console.warn('Supabase property insert notice (persisted in local storage):', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Exception inserting property to Supabase (persisted in local storage):', err);
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
