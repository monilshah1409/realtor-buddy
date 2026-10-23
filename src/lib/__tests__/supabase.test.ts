import { describe, it, expect } from 'vitest';
import { supabase } from '../supabase';
import migrationSql from '../../../supabase/migrations/20261024000000_initial_schema.sql?raw';

describe('Supabase Client Configuration', () => {
  it('initializes the supabase client with auth persistence', () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
    expect(supabase.from).toBeDefined();
    expect(supabase.storage).toBeDefined();
  });

  it('provides safe fallback environment variables without crashing', () => {
    // Verifies the client can instantiate and has default URL configured
    expect((supabase as any).supabaseUrl).toBeDefined();
    expect(typeof (supabase as any).supabaseUrl).toBe('string');
  });
});

describe('Supabase Database Migration Schema', () => {
  it('migration file content is loaded', () => {
    expect(migrationSql).toBeDefined();
    expect(migrationSql.length).toBeGreaterThan(0);
  });

  it('migration defines required core tables and types', () => {
    // Tables
    expect(migrationSql).toMatch(/create\s+table\s+(if\s+not\s+exists\s+)?public\.profiles/i);
    expect(migrationSql).toMatch(/create\s+table\s+(if\s+not\s+exists\s+)?public\.properties/i);
    expect(migrationSql).toMatch(/create\s+table\s+(if\s+not\s+exists\s+)?public\.shortlists/i);
    expect(migrationSql).toMatch(/create\s+table\s+(if\s+not\s+exists\s+)?public\.shortlist_items/i);

    // RLS enabled
    expect(migrationSql).toMatch(/alter\s+table\s+public\.profiles\s+enable\s+row\s+level\s+security/i);
    expect(migrationSql).toMatch(/alter\s+table\s+public\.properties\s+enable\s+row\s+level\s+security/i);
    expect(migrationSql).toMatch(/alter\s+table\s+public\.shortlists\s+enable\s+row\s+level\s+security/i);
    expect(migrationSql).toMatch(/alter\s+table\s+public\.shortlist_items\s+enable\s+row\s+level\s+security/i);
  });

  it('migration defines public_properties view explicitly omitting price_aed and developer_name', () => {
    expect(migrationSql).toMatch(/create\s+(or\s+replace\s+)?view\s+public\.public_properties/i);

    // Find the view definition
    const viewMatch = migrationSql.match(/create\s+(?:or\s+replace\s+)?view\s+public\.public_properties[\s\S]*?from\s+public\.properties/i);
    expect(viewMatch).not.toBeNull();
    if (viewMatch) {
      const viewQuery = viewMatch[0];
      expect(viewQuery).not.toMatch(/price_aed/i);
      expect(viewQuery).not.toMatch(/developer_name/i);
      expect(viewQuery).toMatch(/share_token/i);
      expect(viewQuery).toMatch(/handover_status/i);
      expect(viewQuery).toMatch(/handover_date/i);
    }
  });

  it('migration defines the specified RLS policies on properties table', () => {
    expect(migrationSql).toMatch(/properties_admin_all/i);
    expect(migrationSql).toMatch(/properties_agent_select/i);
    expect(migrationSql).toMatch(/properties_public_select/i);
  });
});

describe('Supabase Security Hardening & Isolation', () => {
  it('strictly revokes price_aed and developer_name from anon on public.properties', () => {
    expect(migrationSql).toMatch(/revoke\s+select\s*\(\s*price_aed\s*,\s*developer_name\s*\)\s*on\s+public\.properties\s+from\s+anon/i);
  });

  it('strictly revokes gateway_customer_id and subscription_status from anon on public.profiles', () => {
    expect(migrationSql).toMatch(/revoke\s+select\s*\(\s*gateway_customer_id\s*,\s*subscription_status\s*\)\s*on\s+public\.profiles\s+from\s+anon/i);
  });

  it('defines public_agent_profiles view omitting sensitive billing columns', () => {
    expect(migrationSql).toMatch(/create\s+(or\s+replace\s+)?view\s+public\.public_agent_profiles/i);
    const viewMatch = migrationSql.match(/create\s+(?:or\s+replace\s+)?view\s+public\.public_agent_profiles[\s\S]*?from\s+public\.profiles/i);
    expect(viewMatch).not.toBeNull();
    if (viewMatch) {
      const viewQuery = viewMatch[0];
      expect(viewQuery).not.toMatch(/gateway_customer_id/i);
      expect(viewQuery).not.toMatch(/subscription_status/i);
    }
  });

  it('restricts public share policies strictly TO anon to prevent cross-agent visibility leaks', () => {
    // properties_public_select must be TO anon only
    const propPolicyMatch = migrationSql.match(/create\s+policy\s+"properties_public_select"\s+on\s+public\.properties\s+for\s+select\s+to\s+([^\s\n]+)/i);
    expect(propPolicyMatch).not.toBeNull();
    expect(propPolicyMatch?.[1].toLowerCase().trim()).toBe('anon');

    // shortlists_public_select must be TO anon only
    const shortlistPolicyMatch = migrationSql.match(/create\s+policy\s+"shortlists_public_select"\s+on\s+public\.shortlists\s+for\s+select\s+to\s+([^\s\n]+)/i);
    expect(shortlistPolicyMatch).not.toBeNull();
    expect(shortlistPolicyMatch?.[1].toLowerCase().trim()).toBe('anon');

    // shortlist_items_public_select must be TO anon only
    const itemsPolicyMatch = migrationSql.match(/create\s+policy\s+"shortlist_items_public_select"\s+on\s+public\.shortlist_items\s+for\s+select\s+to\s+([^\s\n]+)/i);
    expect(itemsPolicyMatch).not.toBeNull();
    expect(itemsPolicyMatch?.[1].toLowerCase().trim()).toBe('anon');
  });

  it('hardcodes agent role in handle_new_user to prevent privilege escalation', () => {
    // Verify handle_new_user uses 'agent' directly and does not read role from raw_user_meta_data
    expect(migrationSql).toMatch(/'agent'::public\.user_role/i);
    expect(migrationSql).not.toMatch(/raw_user_meta_data->>'role'/i);
  });

  it('sets explicit search_path on security definer functions', () => {
    // is_admin() must set search_path = public
    const isAdminMatch = migrationSql.match(/function\s+public\.is_admin[\s\S]*?set\s+search_path\s*=\s*public/i);
    expect(isAdminMatch).not.toBeNull();

    // handle_new_user() must set search_path = public
    const handleUserMatch = migrationSql.match(/function\s+public\.handle_new_user[\s\S]*?set\s+search_path\s*=\s*public/i);
    expect(handleUserMatch).not.toBeNull();
  });
});
