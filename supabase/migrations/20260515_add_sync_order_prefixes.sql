-- Migration: Add sync_order_prefixes function to handle bulk updates when tenant prefix changes
CREATE OR REPLACE FUNCTION sync_order_prefixes(p_tenant_id UUID, p_new_prefix TEXT)
RETURNS VOID AS $$
BEGIN
  -- Update all orders for this tenant
  UPDATE orders
  SET friendly_id = UPPER(p_new_prefix) || 
    CASE 
      -- If it already has a hyphen, take everything from the hyphen onwards (e.g., "-001")
      WHEN friendly_id LIKE '%-%' THEN SUBSTRING(friendly_id FROM POSITION('-' IN friendly_id))
      -- If no hyphen, add one before the existing ID (e.g., "001" -> "-001")
      ELSE '-' || friendly_id
    END
  WHERE tenant_id = p_tenant_id
    AND friendly_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
