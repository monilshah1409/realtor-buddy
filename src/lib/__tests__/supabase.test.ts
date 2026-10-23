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
