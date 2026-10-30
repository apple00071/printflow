    -- Migration: Create tenant_integrations table for Gmail and other third-party integrations
    CREATE TABLE IF NOT EXISTS public.tenant_integrations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT TRUE,
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        CONSTRAINT tenant_integrations_tenant_type_unique UNIQUE (tenant_id, type)
    );

    CREATE INDEX IF NOT EXISTS idx_tenant_integrations_tenant ON public.tenant_integrations(tenant_id);

    ALTER TABLE public.tenant_integrations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "tenant_isolation_tenant_integrations" ON public.tenant_integrations;
    CREATE POLICY "tenant_isolation_tenant_integrations" ON public.tenant_integrations
        FOR ALL USING (tenant_id = get_tenant_id()) WITH CHECK (tenant_id = get_tenant_id());
