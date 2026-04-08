-- Fix type mismatch in auto_deduct_inventory trigger
-- The quantity column was changed to VARCHAR to support expressions, 
-- but the trigger was comparing it directly to 0.

CREATE OR REPLACE FUNCTION public.auto_deduct_inventory()
RETURNS TRIGGER AS $$
DECLARE
    v_qty_numeric NUMERIC;
BEGIN
    -- Only attempt deduction if an inventory item is selected
    IF (NEW.inventory_id IS NOT NULL AND NEW.quantity IS NOT NULL AND NEW.quantity != '') THEN
        -- Try to cast quantity to numeric. 
        -- This handles simple numeric strings. For "500+500" type strings, 
        -- we skip auto-deduction for now to avoid errors.
        IF (NEW.quantity ~ '^[0-9.]+$') THEN
            v_qty_numeric := NEW.quantity::NUMERIC;
            
            IF (v_qty_numeric > 0) THEN
                UPDATE public.inventory
                SET 
                    quantity = quantity - (v_qty_numeric * NEW.material_units_per_order),
                    updated_at = now()
                WHERE id = NEW.inventory_id;
                
                NEW.total_material_deducted := (v_qty_numeric * NEW.material_units_per_order);
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
