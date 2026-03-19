-- ========================================
-- TEAM INVITATIONS TABLE
-- ========================================

-- Create team invitations table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'WORKER' CHECK (role IN ('ADMIN', 'WORKER')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_invitations_tenant_id ON public.team_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);
CREATE INDEX IF NOT EXISTS idx_team_invitations_expires_at ON public.team_invitations(expires_at);

-- Enable Row Level Security
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Tenant users can view invitations for their tenant" ON public.team_invitations
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can manage invitations" ON public.team_invitations
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ========================================
-- PROFILES TABLE UPDATES
-- ========================================

-- Add status column to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS status TEXT 
  DEFAULT 'ACTIVE' 
  CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING'));

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- ========================================
-- FUNCTIONS FOR TIMESTAMP UPDATES
-- ========================================

-- Function to automatically update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON public.profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_team_invitations_updated_at ON public.team_invitations;
CREATE TRIGGER handle_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ========================================
-- SAMPLE DATA (OPTIONAL)
-- ========================================

-- You can uncomment this to test with sample data
/*
-- Insert sample invitation
INSERT INTO public.team_invitations (tenant_id, email, name, role, invited_by, expires_at)
VALUES (
  'your-tenant-id-here',
  'test@example.com',
  'Test User',
  'WORKER',
  'your-user-id-here',
  NOW() + INTERVAL '7 days'
);
*/
