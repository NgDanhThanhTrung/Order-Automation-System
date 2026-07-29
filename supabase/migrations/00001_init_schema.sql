-- =============================================================================
-- FILE: 00001_init_schema.sql
-- PROJECT: Automated Payment & Order Management System
-- DESCRIPTION: Full schema, seed data, stored procedure, RLS, and indexes
-- =============================================================================

-- ============================================================
-- SECTION 0: EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SECTION 1: ENUM TYPES
-- ============================================================

CREATE TYPE order_status AS ENUM (
    'pending',      -- Đơn mới tạo, chờ thanh toán
    'paid',         -- Thanh toán xác nhận thành công
    'shipped',      -- Admin đã đánh dấu đã giao hàng
    'cancelled'     -- Hết hạn hoặc bị hủy thủ công
);

CREATE TYPE transaction_status AS ENUM (
    'matched',      -- Đã khớp với đơn hàng
    'unmatched',    -- Không khớp đơn nào (dư / sai nội dung)
    'duplicate'     -- Webhook trùng lặp, đã bỏ qua
);

-- ============================================================
-- SECTION 2: TABLE DEFINITIONS
-- ============================================================

-- ----------------------------------------------------------
-- 2.1  products
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255)    NOT NULL,
    description     TEXT,
    price           NUMERIC(15, 0)  NOT NULL CHECK (price >= 0),   -- VND, no decimal
    image_url       TEXT,
    stock_quantity  INTEGER         NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  products                  IS 'Danh mục sản phẩm bán hàng';
COMMENT ON COLUMN products.price            IS 'Đơn vị VND, không có thập phân';
COMMENT ON COLUMN products.stock_quantity   IS 'Số lượng tồn kho, không âm';

-- ----------------------------------------------------------
-- 2.2  orders
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                  UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_code          VARCHAR(64)     NOT NULL UNIQUE,   -- Nội dung chuyển khoản dùng để khớp
    product_id          UUID            NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity            INTEGER         NOT NULL DEFAULT 1 CHECK (quantity > 0),
    total_amount        NUMERIC(15, 0)  NOT NULL CHECK (total_amount >= 0),
    customer_name       VARCHAR(255),
    customer_email      VARCHAR(255),
    customer_phone      VARCHAR(20),
    customer_note       TEXT,
    status              order_status    NOT NULL DEFAULT 'pending',
    payment_content     VARCHAR(255),   -- Nội dung CK thực tế từ SePay webhook
    paid_at             TIMESTAMPTZ,
    shipped_at          TIMESTAMPTZ,
    cancelled_at        TIMESTAMPTZ,
    expires_at          TIMESTAMPTZ     NOT NULL DEFAULT (NOW() + INTERVAL '20 minutes'),
    telegram_message_id BIGINT,         -- Message ID trong Telegram để edit sau
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  orders                    IS 'Đơn hàng của khách';
COMMENT ON COLUMN orders.order_code         IS 'Mã đơn hàng, đồng thời là nội dung chuyển khoản';
COMMENT ON COLUMN orders.expires_at         IS 'Thời điểm đơn bị auto-cancel nếu chưa thanh toán';
COMMENT ON COLUMN orders.telegram_message_id IS 'Để gọi editMessageReplyMarkup khi cập nhật trạng thái';

-- ----------------------------------------------------------
-- 2.3  payment_transactions
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                      UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
    sepay_transaction_id    BIGINT          NOT NULL UNIQUE,  -- ID giao dịch từ SePay (dùng idempotency)
    order_id                UUID            REFERENCES orders(id) ON DELETE SET NULL,
    bank_brand_name         VARCHAR(50),
    account_number          VARCHAR(50),
    transaction_date        TIMESTAMPTZ     NOT NULL,
    amount_in               NUMERIC(15, 0)  NOT NULL DEFAULT 0,
    amount_out              NUMERIC(15, 0)  NOT NULL DEFAULT 0,
    accumulated             NUMERIC(15, 0),
    transaction_content     TEXT,
    reference_code          VARCHAR(255),
    body                    JSONB           NOT NULL,          -- Raw payload từ SePay
    status                  transaction_status NOT NULL DEFAULT 'unmatched',
    processed_at            TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  payment_transactions                          IS 'Lịch sử biến động số dư từ SePay webhook';
COMMENT ON COLUMN payment_transactions.sepay_transaction_id    IS 'ID duy nhất từ SePay, dùng để chống xử lý duplicate';
COMMENT ON COLUMN payment_transactions.body                    IS 'Toàn bộ raw JSON payload từ SePay lưu để tra soát';

-- ----------------------------------------------------------
-- 2.4  payment_reports
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_reports (
    id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id                UUID        REFERENCES orders(id) ON DELETE SET NULL,
    transaction_id          UUID        REFERENCES payment_transactions(id) ON DELETE SET NULL,
    bill_image_url          TEXT        NOT NULL,              -- Cloudinary URL
    cloudinary_public_id    TEXT        NOT NULL,              -- Để xóa hoặc transform sau
    uploaded_by_telegram_id BIGINT,                            -- Telegram User ID người upload
    note                    TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  payment_reports                       IS 'Ảnh bill tra soát thanh toán';
COMMENT ON COLUMN payment_reports.bill_image_url        IS 'URL công khai Cloudinary';
COMMENT ON COLUMN payment_reports.cloudinary_public_id  IS 'Public ID trên Cloudinary để quản lý assets';

-- ============================================================
-- SECTION 3: INDEXES
-- ============================================================

-- products
CREATE INDEX idx_products_is_active     ON products (is_active);
CREATE INDEX idx_products_created_at    ON products (created_at DESC);

-- orders
CREATE UNIQUE INDEX idx_orders_order_code           ON orders (order_code);
CREATE INDEX        idx_orders_status               ON orders (status);
CREATE INDEX        idx_orders_product_id           ON orders (product_id);
CREATE INDEX        idx_orders_expires_at           ON orders (expires_at) WHERE status = 'pending';
CREATE INDEX        idx_orders_created_at           ON orders (created_at DESC);
CREATE INDEX        idx_orders_status_created_at    ON orders (status, created_at DESC);

-- payment_transactions
CREATE UNIQUE INDEX idx_payment_tx_sepay_id     ON payment_transactions (sepay_transaction_id);
CREATE INDEX        idx_payment_tx_order_id     ON payment_transactions (order_id);
CREATE INDEX        idx_payment_tx_status       ON payment_transactions (status);
CREATE INDEX        idx_payment_tx_tx_date      ON payment_transactions (transaction_date DESC);

-- payment_reports
CREATE INDEX idx_payment_reports_order_id   ON payment_reports (order_id);
CREATE INDEX idx_payment_reports_created_at ON payment_reports (created_at DESC);

-- ============================================================
-- SECTION 4: AUTO-UPDATE updated_at TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
-- SECTION 5: STORED PROCEDURE — process_sepay_webhook
--
-- Mục tiêu:
--   • Atomic, idempotent: dùng Advisory Lock + UNIQUE constraint
--     loại bỏ 100% race condition khi cùng webhook tới 2 lần song song.
--   • Trả về JSON kết quả để backend xử lý phản hồi và gọi Telegram.
--
-- Luồng xử lý:
--   1. Acquire advisory lock theo sepay_transaction_id (ngăn 2 request song song).
--   2. Kiểm tra duplicate (sepay_transaction_id đã tồn tại).
--   3. Tìm đơn hàng khớp: order_code = transaction_content (ILIKE trim),
--      status = 'pending', chưa hết hạn, amount >= total_amount.
--   4. Nếu khớp: UPDATE orders → paid, INSERT transaction → matched.
--   5. Nếu không khớp: INSERT transaction → unmatched.
--   6. Release advisory lock (tự động khi transaction kết thúc).
-- ============================================================

CREATE OR REPLACE FUNCTION process_sepay_webhook(
    p_sepay_transaction_id  BIGINT,
    p_bank_brand_name       VARCHAR,
    p_account_number        VARCHAR,
    p_transaction_date      TIMESTAMPTZ,
    p_amount_in             NUMERIC,
    p_amount_out            NUMERIC,
    p_accumulated           NUMERIC,
    p_transaction_content   TEXT,
    p_reference_code        VARCHAR,
    p_body                  JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_lock_key          BIGINT;
    v_order             orders%ROWTYPE;
    v_transaction_id    UUID;
    v_result            JSONB;
    v_clean_content     TEXT;
BEGIN
    -- --------------------------------------------------------
    -- STEP 1: Advisory Lock — chặn race condition song song
    --         pg_try_advisory_xact_lock tự release khi TX kết thúc
    -- --------------------------------------------------------
    v_lock_key := p_sepay_transaction_id % 2147483647; -- pg advisory lock range
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- --------------------------------------------------------
    -- STEP 2: Idempotency check — đã xử lý rồi thì bỏ qua
    -- --------------------------------------------------------
    IF EXISTS (
        SELECT 1 FROM payment_transactions
        WHERE sepay_transaction_id = p_sepay_transaction_id
    ) THEN
        RETURN jsonb_build_object(
            'success',  FALSE,
            'status',   'duplicate',
            'message',  'Transaction already processed',
            'order_id', NULL
        );
    END IF;

    -- --------------------------------------------------------
    -- STEP 3: Chỉ xét tiền vào (amount_in > 0)
    -- --------------------------------------------------------
    IF p_amount_in IS NULL OR p_amount_in <= 0 THEN
        INSERT INTO payment_transactions (
            sepay_transaction_id, bank_brand_name, account_number,
            transaction_date, amount_in, amount_out, accumulated,
            transaction_content, reference_code, body, status
        ) VALUES (
            p_sepay_transaction_id, p_bank_brand_name, p_account_number,
            p_transaction_date, COALESCE(p_amount_in, 0), COALESCE(p_amount_out, 0),
            p_accumulated, p_transaction_content, p_reference_code, p_body,
            'unmatched'
        ) RETURNING id INTO v_transaction_id;

        RETURN jsonb_build_object(
            'success',          FALSE,
            'status',           'unmatched',
            'message',          'Not a credit transaction',
            'transaction_id',   v_transaction_id,
            'order_id',         NULL
        );
    END IF;

    -- --------------------------------------------------------
    -- STEP 4: Tìm đơn hàng khớp
    --   - Nội dung CK chứa order_code (không phân biệt hoa/thường)
    --   - Trạng thái pending
    --   - Chưa hết hạn
    --   - Số tiền >= total_amount
    --   - Lock row (FOR UPDATE) để tránh concurrent update
    -- --------------------------------------------------------
    v_clean_content := TRIM(UPPER(p_transaction_content));

    SELECT * INTO v_order
    FROM orders
    WHERE status = 'pending'
      AND expires_at > NOW()
      AND total_amount <= p_amount_in
      AND TRIM(UPPER(order_code)) = ANY(
              -- Thử khớp chính xác trước, rồi LIKE cho trường hợp nội dung thêm chữ
              ARRAY[v_clean_content]
          )
    ORDER BY created_at ASC   -- Nếu nhiều đơn trùng content, lấy đơn cũ nhất
    LIMIT 1
    FOR UPDATE SKIP LOCKED;   -- SKIP LOCKED: bỏ qua row đang bị lock bởi TX khác

    -- Fallback: thử ILIKE nếu không khớp chính xác
    IF v_order.id IS NULL THEN
        SELECT * INTO v_order
        FROM orders
        WHERE status = 'pending'
          AND expires_at > NOW()
          AND total_amount <= p_amount_in
          AND v_clean_content ILIKE ('%' || TRIM(UPPER(order_code)) || '%')
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED;
    END IF;

    -- --------------------------------------------------------
    -- STEP 5a: Tìm thấy đơn khớp → xác nhận thanh toán
    -- --------------------------------------------------------
    IF v_order.id IS NOT NULL THEN
        -- Cập nhật đơn hàng
        UPDATE orders
        SET status          = 'paid',
            paid_at         = NOW(),
            payment_content = p_transaction_content,
            updated_at      = NOW()
        WHERE id = v_order.id;

        -- Ghi nhận giao dịch
        INSERT INTO payment_transactions (
            sepay_transaction_id, order_id, bank_brand_name, account_number,
            transaction_date, amount_in, amount_out, accumulated,
            transaction_content, reference_code, body, status
        ) VALUES (
            p_sepay_transaction_id, v_order.id, p_bank_brand_name, p_account_number,
            p_transaction_date, p_amount_in, COALESCE(p_amount_out, 0), p_accumulated,
            p_transaction_content, p_reference_code, p_body,
            'matched'
        ) RETURNING id INTO v_transaction_id;

        v_result := jsonb_build_object(
            'success',          TRUE,
            'status',           'matched',
            'message',          'Order paid successfully',
            'transaction_id',   v_transaction_id,
            'order_id',         v_order.id,
            'order_code',       v_order.order_code,
            'total_amount',     v_order.total_amount,
            'amount_received',  p_amount_in,
            'customer_name',    v_order.customer_name,
            'customer_email',   v_order.customer_email,
            'telegram_message_id', v_order.telegram_message_id
        );

        RETURN v_result;
    END IF;

    -- --------------------------------------------------------
    -- STEP 5b: Không khớp đơn nào → lưu giao dịch unmatched
    -- --------------------------------------------------------
    INSERT INTO payment_transactions (
        sepay_transaction_id, bank_brand_name, account_number,
        transaction_date, amount_in, amount_out, accumulated,
        transaction_content, reference_code, body, status
    ) VALUES (
        p_sepay_transaction_id, p_bank_brand_name, p_account_number,
        p_transaction_date, p_amount_in, COALESCE(p_amount_out, 0), p_accumulated,
        p_transaction_content, p_reference_code, p_body,
        'unmatched'
    ) RETURNING id INTO v_transaction_id;

    RETURN jsonb_build_object(
        'success',          FALSE,
        'status',           'unmatched',
        'message',          'No matching pending order found',
        'transaction_id',   v_transaction_id,
        'order_id',         NULL
    );

EXCEPTION
    WHEN OTHERS THEN
        -- Ghi lại lỗi nhưng không crash — trả về error JSON để backend xử lý
        RETURN jsonb_build_object(
            'success',  FALSE,
            'status',   'error',
            'message',  SQLERRM,
            'sqlstate', SQLSTATE
        );
END;
$$;

COMMENT ON FUNCTION process_sepay_webhook IS
    'Xử lý nguyên tử (atomic) webhook từ SePay: advisory lock + idempotency check + order matching + status update. Trả về JSONB kết quả.';

-- ============================================================
-- SECTION 6: HELPER FUNCTION — auto_cancel_expired_orders
--
-- Được gọi bởi Cron Job (node-cron) mỗi phút.
-- Trả về số lượng đơn đã bị cancel.
-- ============================================================

CREATE OR REPLACE FUNCTION auto_cancel_expired_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cancelled_count INTEGER;
BEGIN
    WITH cancelled AS (
        UPDATE orders
        SET status          = 'cancelled',
            cancelled_at    = NOW(),
            updated_at      = NOW()
        WHERE status      = 'pending'
          AND expires_at  < NOW()
        RETURNING id
    )
    SELECT COUNT(*) INTO v_cancelled_count FROM cancelled;

    RETURN v_cancelled_count;
END;
$$;

COMMENT ON FUNCTION auto_cancel_expired_orders IS
    'Auto-cancel các đơn pending đã hết hạn 20 phút. Được gọi bởi Cron Job backend. Trả về số lượng đơn bị cancel.';

-- ============================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS trên tất cả bảng
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reports    ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------
-- Policy cho SERVICE ROLE (backend Express + Supabase client)
-- Service role key bỏ qua RLS — để RLS chặn truy cập ANON.
-- ----------------------------------------------------------

-- ANON role: Chỉ đọc products đang active
CREATE POLICY "anon_read_active_products"
    ON products
    FOR SELECT
    TO anon
    USING (is_active = TRUE);

-- ANON role: Không được đọc orders, transactions, reports
CREATE POLICY "anon_no_orders"
    ON orders
    FOR ALL
    TO anon
    USING (FALSE);

CREATE POLICY "anon_no_transactions"
    ON payment_transactions
    FOR ALL
    TO anon
    USING (FALSE);

CREATE POLICY "anon_no_reports"
    ON payment_reports
    FOR ALL
    TO anon
    USING (FALSE);

-- SERVICE ROLE policies (service role bypass RLS by default in Supabase,
-- nhưng vẫn định nghĩa rõ ràng để dễ audit)
CREATE POLICY "service_full_access_products"
    ON products
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "service_full_access_orders"
    ON orders
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "service_full_access_transactions"
    ON payment_transactions
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "service_full_access_reports"
    ON payment_reports
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

-- ============================================================
-- SECTION 8: GRANT PERMISSIONS
-- ============================================================

-- anon: chỉ đọc products
GRANT SELECT ON products                TO anon;

-- anon: thực thi hàm nếu cần (frontend Next.js dùng anon key cho public data)
-- KHÔNG grant process_sepay_webhook cho anon

-- authenticated: nếu sau này thêm user auth
GRANT SELECT ON products                TO authenticated;
GRANT SELECT ON orders                  TO authenticated;
GRANT SELECT ON payment_reports         TO authenticated;

-- service_role: full access (default trong Supabase)
GRANT ALL ON products                   TO service_role;
GRANT ALL ON orders                     TO service_role;
GRANT ALL ON payment_transactions       TO service_role;
GRANT ALL ON payment_reports            TO service_role;
GRANT EXECUTE ON FUNCTION process_sepay_webhook TO service_role;
GRANT EXECUTE ON FUNCTION auto_cancel_expired_orders TO service_role;

-- ============================================================
-- SECTION 9: SEED DATA
-- ============================================================

INSERT INTO products (id, name, description, price, image_url, stock_quantity, is_active)
VALUES
    (
        uuid_generate_v4(),
        'Khóa học Node.js Fullstack — Cơ bản đến Nâng cao',
        'Khóa học thực chiến xây dựng hệ thống backend Node.js + Express + TypeScript + PostgreSQL. Bao gồm 80 bài học video HD, source code production-ready, và certificate hoàn thành.',
        499000,
        'https://placehold.co/800x450/1a1a2e/ffffff?text=Node.js+Fullstack',
        999,
        TRUE
    ),
    (
        uuid_generate_v4(),
        'Khóa học Next.js 14 App Router + Tailwind CSS',
        'Thành thạo Next.js 14 với App Router, Server Components, Server Actions, Tailwind CSS, và tối ưu SEO. 60 bài học thực hành xây dựng 3 dự án thực tế.',
        399000,
        'https://placehold.co/800x450/0f172a/38bdf8?text=Next.js+14',
        999,
        TRUE
    ),
    (
        uuid_generate_v4(),
        'Khóa học Supabase — Backend as a Service',
        'Xây dựng backend hoàn chỉnh với Supabase: PostgreSQL, Authentication, Storage, Edge Functions, Realtime. Bao gồm triển khai production và best practices bảo mật.',
        349000,
        'https://placehold.co/800x450/1c1c1c/3ecf8e?text=Supabase+BaaS',
        500,
        TRUE
    ),
    (
        uuid_generate_v4(),
        'Combo 3 Khóa học — Node.js + Next.js + Supabase',
        'Gói combo tiết kiệm 30% cho cả 3 khóa học: Node.js Fullstack, Next.js 14 App Router, và Supabase BaaS. Học theo lộ trình từ A đến Z, xây dựng hệ thống production hoàn chỉnh.',
        899000,
        'https://placehold.co/800x450/0d1117/58a6ff?text=COMBO+3+Kh%C3%B3a+h%E1%BB%8Dc',
        999,
        TRUE
    );

-- ============================================================
-- SECTION 10: REALTIME PUBLICATION (tùy chọn)
-- Cho phép frontend subscribe realtime order status updates
-- ============================================================

-- Uncomment nếu muốn enable Realtime trên Supabase dashboard
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE payment_transactions;

-- ============================================================
-- SECTION 11: VIEWS (cho admin dashboard / reporting)
-- ============================================================

-- View: Đơn hàng kèm thông tin sản phẩm và giao dịch
CREATE OR REPLACE VIEW v_orders_detail AS
SELECT
    o.id                    AS order_id,
    o.order_code,
    o.status                AS order_status,
    o.total_amount,
    o.quantity,
    o.customer_name,
    o.customer_email,
    o.customer_phone,
    o.payment_content,
    o.paid_at,
    o.shipped_at,
    o.cancelled_at,
    o.expires_at,
    o.created_at            AS order_created_at,
    p.id                    AS product_id,
    p.name                  AS product_name,
    p.price                 AS product_price,
    t.id                    AS transaction_id,
    t.sepay_transaction_id,
    t.amount_in             AS paid_amount,
    t.transaction_date,
    t.bank_brand_name,
    t.status                AS transaction_status,
    r.id                    AS report_id,
    r.bill_image_url,
    r.created_at            AS report_created_at
FROM orders o
JOIN products p ON p.id = o.product_id
LEFT JOIN payment_transactions t ON t.order_id = o.id AND t.status = 'matched'
LEFT JOIN payment_reports r ON r.order_id = o.id
ORDER BY o.created_at DESC;

COMMENT ON VIEW v_orders_detail IS 'Đơn hàng kèm đầy đủ thông tin sản phẩm, giao dịch thanh toán, và ảnh bill';

-- View: Thống kê doanh thu theo ngày
CREATE OR REPLACE VIEW v_daily_revenue AS
SELECT
    DATE_TRUNC('day', o.paid_at)    AS date,
    COUNT(*)                         AS total_orders,
    SUM(o.total_amount)              AS total_revenue
FROM orders o
WHERE o.status IN ('paid', 'shipped')
  AND o.paid_at IS NOT NULL
GROUP BY DATE_TRUNC('day', o.paid_at)
ORDER BY date DESC;

COMMENT ON VIEW v_daily_revenue IS 'Thống kê doanh thu theo ngày';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
