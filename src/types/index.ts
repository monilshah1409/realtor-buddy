export type PropertyType = 
  | 'studio' 
  | '1bhk' 
  | '2bhk' 
  | '3bhk' 
  | '4bhk_plus' 
  | 'villa' 
  | 'townhouse' 
  | 'penthouse';

export type HandoverStatus = 
  | 'ready' 
  | 'near_handover' 
  | 'under_construction' 
  | 'newly_launched';

export type PropertyStatus = 
  | 'private' 
  | 'global' 
  | 'rejected';

export type UserRole = 
  | 'admin' 
  | 'agent';

export type ProfileStatus = 
  | 'pending_approval' 
  | 'active' 
  | 'suspended';

export type SubscriptionStatus = 
  | 'inactive' 
  | 'trial' 
  | 'active' 
  | 'past_due' 
  | 'canceled';

export interface Property {
  id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  locality: string;
  sub_community?: string;
  handover_status: HandoverStatus;
  handover_date: string;
  price_aed: number;
  developer_name: string;
  area_sqft: number;
  bedrooms: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  photos: string[];
  brochure_onedrive_url?: string;
  brochure_file_name?: string;
  status: PropertyStatus;
  created_by: string;
  approved_by?: string;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export type PublicProperty = Omit<Property, 'price_aed' | 'developer_name'>;

export interface Profile {
  id: string;
  full_name: string;
  agency_name: string;
  phone_number?: string;
  whatsapp_number: string;
  avatar_url?: string;
  email?: string;
  role: UserRole;
  status: ProfileStatus;
  subscription_status: SubscriptionStatus;
  trial_expires_at?: string;
  gateway_customer_id?: string;
  created_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  user_email: string;
  amount_aed: number;
  plan_id?: string;
  promo_code?: string;
  payment_gateway?: string;
  gateway_session_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
}

export interface PromoCoupon {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_aed';
  discount_value: number;
  description?: string;
  is_active: boolean;
  max_uses: number;
  times_redeemed: number;
  valid_until?: string | null;
  created_at: string;
}

export interface MarketingCampaign {
  id: string;
  title: string;
  trigger_type: string;
  subject: string;
  content_html?: string;
  is_active: boolean;
  audience?: string;
  last_run_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface EmailLog {
  id: string;
  user_id?: string | null;
  recipient_email: string;
  campaign_type?: string | null;
  subject: string;
  status: 'sent' | 'failed' | 'logged' | string;
  error_message?: string | null;
  sent_at: string;
  created_at?: string;
}

export interface ShortlistItem {
  id: string;
  shortlist_id: string;
  property_id: string;
  order_index: number;
  property?: Property;
}

export interface Shortlist {
  id: string;
  agent_id: string;
  client_name: string;
  share_token: string;
  notes?: string;
  created_at: string;
  items?: ShortlistItem[];
}

export interface MatchCriteria {
  targetLocality?: string;
  propertyType?: PropertyType;
  bedrooms?: number;
  targetBudgetAed?: number;
  budgetStretchPercent?: number; // e.g. 15 for 15%
  minSqft?: number;
  preferredHandover?: HandoverStatus;
}

export interface MatchScoreResult {
  totalScore: number;
  locationScore?: number;
  handoverScore?: number;
  unitTypeScore?: number;
  sizeScore?: number;
  budgetScore?: number;
  localityTag: string; // e.g. 'Target Location' | 'Nearby Community - 5-10 min'
  budgetTag: string; // e.g. 'Within Budget' | 'High-Value Stretch'
  isWithinBudget: boolean;
  isStretchMatch: boolean;
}

export interface ScoredProperty extends Property {
  score: MatchScoreResult;
}

export interface DubaiLocality {
  name: string;
  cluster: string;
  adjacentLocalities: string[];
  coordinates: {
    latitude: number;
    longitude: number;
  };
}
