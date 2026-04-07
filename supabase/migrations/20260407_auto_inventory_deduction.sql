-- Add material link and deduction tracking to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS inventory_id UUID REFERENCES public.inventory(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS material_units_per_order NUMERIC(15, 4) DEFAULT 1;

-- Add a column to track EXACTLY how much was deducted (for audit/restocking)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS total_material_deducted NUMERIC(15, 4) DEFAULT 0;

-- Function to automatically deduct inventory on order creation
CREATE OR REPLACE FUNCTION public.auto_deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
    -- Only deduct if an inventory item is selected
    IF (NEW.inventory_id IS NOT NULL AND NEW.quantity > 0) THEN
        UPDATE public.inventory
        SET 
            quantity = quantity - (NEW.quantity * NEW.material_units_per_order),
            updated_at = now()
        WHERE id = NEW.inventory_id;
        
        NEW.total_material_deducted := (NEW.quantity * NEW.material_units_per_order);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to run the deduction
DROP TRIGGER IF EXISTS trigger_auto_deduct_inventory ON public.orders;
CREATE TRIGGER trigger_auto_deduct_inventory
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_deduct_inventory();
