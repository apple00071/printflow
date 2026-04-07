-- Create Expenses Table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    spent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    description TEXT,
    payment_method TEXT DEFAULT 'CASH',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Register with multi-tenant structure
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only seeleur own tenant's expenses"
ON public.expenses
FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Create Inventory Table
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity NUMERIC(15, 2) NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'Units',
    low_stock_limit NUMERIC(15, 2) DEFAULT 0,
    last_restocked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Register with multi-tenant structure
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own tenant's inventory"
ON public.inventory
FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexing for performance
CREATE INDEX idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX idx_inventory_tenant ON public.inventory(tenant_id);
CREATE INDEX idx_expenses_spent_at ON public.expenses(spent_at);
