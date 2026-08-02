-- =============================================================================
-- FILE: 00002_add_stock_management.sql
-- PROJECT: Automated Payment & Order Management System
-- DESCRIPTION: Add stock management triggers to automatically handle inventory
-- =============================================================================

-- ============================================================
-- SECTION 1: STOCK MANAGEMENT FUNCTIONS
-- ============================================================

-- Function to deduct stock when order is paid
CREATE OR REPLACE FUNCTION deduct_stock_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
    v_quantity INTEGER;
    v_current_stock INTEGER;
BEGIN
    -- Only deduct when status changes TO 'paid'
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        v_product_id := NEW.product_id;
        v_quantity := NEW.quantity;
        
        -- Get current stock with row lock
        SELECT stock_quantity INTO v_current_stock
        FROM products
        WHERE id = v_product_id
        FOR UPDATE;
        
        -- Check if sufficient stock
        IF v_current_stock IS NULL THEN
            RAISE EXCEPTION 'Product not found: %', v_product_id;
        END IF;
        
        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Insufficient stock for product %. Current: %, Required: %', 
                v_product_id, v_current_stock, v_quantity;
        END IF;
        
        -- Deduct stock
        UPDATE products
        SET stock_quantity = stock_quantity - v_quantity,
            updated_at = NOW()
        WHERE id = v_product_id;
        
        RAISE LOG 'Stock deducted: product_id=%, quantity=%, remaining=%', 
            v_product_id, v_quantity, (v_current_stock - v_quantity);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to restore stock when order is cancelled
CREATE OR REPLACE FUNCTION restore_stock_on_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_product_id UUID;
    v_quantity INTEGER;
    v_current_stock INTEGER;
BEGIN
    -- Only restore when status changes TO 'cancelled' FROM 'pending'
    IF NEW.status = 'cancelled' AND OLD.status = 'pending' THEN
        v_product_id := NEW.product_id;
        v_quantity := NEW.quantity;
        
        -- Get current stock with row lock
        SELECT stock_quantity INTO v_current_stock
        FROM products
        WHERE id = v_product_id
        FOR UPDATE;
        
        IF v_current_stock IS NULL THEN
            RAISE WARNING 'Product not found for stock restoration: %', v_product_id;
            RETURN NEW;
        END IF;
        
        -- Restore stock
        UPDATE products
        SET stock_quantity = stock_quantity + v_quantity,
            updated_at = NOW()
        WHERE id = v_product_id;
        
        RAISE LOG 'Stock restored: product_id=%, quantity=%, new_total=%', 
            v_product_id, v_quantity, (v_current_stock + v_quantity);
    END IF;
    
    RETURN NEW;
END;
$$;

-- Function to prevent stock modification if product has active orders
CREATE OR REPLACE FUNCTION prevent_stock_modification_with_active_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_active_orders_count INTEGER;
BEGIN
    -- Check if there are any pending/paid orders for this product
    SELECT COUNT(*) INTO v_active_orders_count
    FROM orders
    WHERE product_id = NEW.id
      AND status IN ('pending', 'paid');
    
    -- If there are active orders, warn but allow (business decision)
    -- Alternatively, you could RAISE EXCEPTION to prevent modification
    IF v_active_orders_count > 0 AND OLD.stock_quantity != NEW.stock_quantity THEN
        RAISE WARNING 'Modifying stock for product % with % active orders', 
            NEW.id, v_active_orders_count;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================
-- SECTION 2: CREATE TRIGGERS
-- ============================================================

-- Trigger to deduct stock when order is paid
DROP TRIGGER IF EXISTS trg_deduct_stock_on_payment ON orders;
CREATE TRIGGER trg_deduct_stock_on_payment
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION deduct_stock_on_payment();

-- Trigger to restore stock when order is cancelled
DROP TRIGGER IF EXISTS trg_restore_stock_on_cancellation ON orders;
CREATE TRIGGER trg_restore_stock_on_cancellation
    AFTER UPDATE OF status ON orders
    FOR EACH ROW
    EXECUTE FUNCTION restore_stock_on_cancellation();

-- Trigger to warn when modifying stock with active orders
DROP TRIGGER IF EXISTS trg_prevent_stock_modification ON products;
CREATE TRIGGER trg_prevent_stock_modification
    BEFORE UPDATE OF stock_quantity ON products
    FOR EACH ROW
    EXECUTE FUNCTION prevent_stock_modification_with_active_orders();

-- ============================================================
-- SECTION 3: HELPER FUNCTION FOR MANUAL STOCK ADJUSTMENT
-- ============================================================

-- Function to manually adjust stock with logging
CREATE OR REPLACE FUNCTION adjust_product_stock(
    p_product_id UUID,
    p_adjustment INTEGER,
    p_reason TEXT DEFAULT 'Manual adjustment'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
BEGIN
    -- Get current stock with lock
    SELECT stock_quantity INTO v_current_stock
    FROM products
    WHERE id = p_product_id
    FOR UPDATE;
    
    IF v_current_stock IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Product not found'
        );
    END IF;
    
    -- Calculate new stock
    v_new_stock := v_current_stock + p_adjustment;
    
    -- Validate new stock is not negative
    IF v_new_stock < 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Insufficient stock for adjustment',
            'current_stock', v_current_stock,
            'adjustment', p_adjustment
        );
    END IF;
    
    -- Update stock
    UPDATE products
    SET stock_quantity = v_new_stock,
        updated_at = NOW()
    WHERE id = p_product_id;
    
    -- Log the adjustment
    RAISE LOG 'Stock adjustment: product_id=%, old_stock=%, adjustment=%, new_stock=%, reason=%',
        p_product_id, v_current_stock, p_adjustment, v_new_stock, p_reason;
    
    RETURN jsonb_build_object(
        'success', TRUE,
        'product_id', p_product_id,
        'old_stock', v_current_stock,
        'adjustment', p_adjustment,
        'new_stock', v_new_stock,
        'reason', p_reason
    );
END;
$$;

COMMENT ON FUNCTION adjust_product_stock IS 'Manually adjust product stock with validation and logging';

-- ============================================================
-- SECTION 4: GRANT PERMISSIONS
-- ============================================================

GRANT EXECUTE ON FUNCTION deduct_stock_on_payment() TO service_role;
GRANT EXECUTE ON FUNCTION restore_stock_on_cancellation() TO service_role;
GRANT EXECUTE ON FUNCTION prevent_stock_modification_with_active_orders() TO service_role;
GRANT EXECUTE ON FUNCTION adjust_product_stock(UUID, INTEGER, TEXT) TO service_role;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
