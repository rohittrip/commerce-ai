-- Users (minimal; auth can be external later)
CREATE TABLE users (
  id              TEXT PRIMARY KEY,
  phone_hash      TEXT,
  email_hash      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE user_preferences (
  user_id         TEXT PRIMARY KEY REFERENCES users(id),
  preferences     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE addresses (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  line1           TEXT NOT NULL,
  line2           TEXT,
  city            TEXT,
  state           TEXT,
  pincode         TEXT,
  country         TEXT DEFAULT 'IN',
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat sessions and messages
CREATE TABLE chat_sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id),
  locale          TEXT,
  device_id       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
  role            TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content_text    TEXT,
  content_json    JSONB NOT NULL DEFAULT '{}'::jsonb,
  redacted_text   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tool calls (audit + debugging)
CREATE TABLE tool_calls (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
  tool_name       TEXT NOT NULL,
  request_json    JSONB NOT NULL,
  response_json   JSONB NOT NULL,
  success         BOOLEAN NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL REFERENCES chat_sessions(id),
  message_id      TEXT REFERENCES chat_messages(id),
  rating          INTEGER NOT NULL CHECK (rating IN (-1, 1)),
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cart / Orders (canonical, even if provider has its own)
CREATE TABLE carts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  provider        TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  currency        TEXT NOT NULL DEFAULT 'INR',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cart_items (
  cart_id         TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id      TEXT NOT NULL,
  provider        TEXT,
  qty             INTEGER NOT NULL CHECK (qty > 0),
  unit_price      NUMERIC(12,2),
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (cart_id, product_id)
);

CREATE TABLE orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  cart_id         TEXT REFERENCES carts(id),
  provider        TEXT NOT NULL,
  provider_order_id TEXT,
  status          TEXT NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'INR',
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_events (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status          TEXT NOT NULL,
  message         TEXT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  ts             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency (for cart/order mutations)
CREATE TABLE idempotency_keys (
  key             TEXT PRIMARY KEY,
  user_id         TEXT,
  scope           TEXT NOT NULL, -- e.g. 'cart.addItem', 'order.create'
  request_hash    TEXT NOT NULL,
  response_json   JSONB NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ
);
