-- SQLite3 Database Schema for Hady Hotspot Dashboard
-- Generated from JSON data files

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Auth Users Table
CREATE TABLE auth_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('owner', 'trader')),
    name TEXT NOT NULL,
    phone TEXT, -- Only for traders
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Traders Table
CREATE TABLE traders (
    phone TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hotspot_name TEXT NOT NULL,
    mikrotik_host TEXT NOT NULL,
    mikrotik_username TEXT NOT NULL,
    mikrotik_password TEXT NOT NULL,
    mikrotik_port INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Traders Pricing Table (for pricing configuration)
CREATE TABLE trader_pricing (
    trader_phone TEXT NOT NULL,
    hour_price REAL NOT NULL,
    day_price REAL NOT NULL,
    week_price REAL NOT NULL,
    month_price REAL NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trader_phone),
    FOREIGN KEY (trader_phone) REFERENCES traders(phone) ON DELETE CASCADE
);

-- MikroTik Devices Table
CREATE TABLE mikrotiks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    port INTEGER NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Clients Table
CREATE TABLE clients (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    mac_address TEXT NOT NULL,
    rewarded_user BOOLEAN NOT NULL DEFAULT 0,
    trader_phone TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trader_phone) REFERENCES traders(phone) ON DELETE CASCADE
);

-- Users Table (MikroTik hotspot users)
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    trader_phone TEXT NOT NULL,
    username TEXT NOT NULL,
    password TEXT,
    profile TEXT,
    limit_uptime TEXT,
    limit_bytes_in TEXT,
    limit_bytes_out TEXT,
    limit_bytes_total TEXT,
    comment TEXT,
    disabled BOOLEAN NOT NULL DEFAULT 0,
    bytes_in INTEGER NOT NULL DEFAULT 0,
    bytes_out INTEGER NOT NULL DEFAULT 0,
    packets_in INTEGER NOT NULL DEFAULT 0,
    packets_out INTEGER NOT NULL DEFAULT 0,
    uptime TEXT NOT NULL DEFAULT '0s',
    mac_address TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trader_phone) REFERENCES traders(phone) ON DELETE CASCADE
);

-- Sessions Table (currently empty in data)
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    trader_phone TEXT NOT NULL,
    user_id TEXT,
    session_data TEXT, -- JSON data for session information
    start_time DATETIME,
    end_time DATETIME,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trader_phone) REFERENCES traders(phone) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Vouchers Table (currently empty in data)
CREATE TABLE vouchers (
    id TEXT PRIMARY KEY,
    trader_phone TEXT NOT NULL,
    voucher_code TEXT NOT NULL UNIQUE,
    duration TEXT NOT NULL, -- e.g., '1h', '1d', '1w', '1m'
    price REAL NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT 0,
    used_by TEXT, -- phone number of user who used it
    used_at DATETIME,
    expires_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trader_phone) REFERENCES traders(phone) ON DELETE CASCADE
);

-- Message Queue Table for WhatsApp Bot
CREATE TABLE message_queue (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'processing')),
    priority INTEGER NOT NULL DEFAULT 0, -- Higher number = higher priority
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    scheduled_at DATETIME DEFAULT CURRENT_TIMESTAMP -- For delayed messages
);

-- Bot Status Table
CREATE TABLE bot_status (
    id INTEGER PRIMARY KEY DEFAULT 1,
    is_ready BOOLEAN NOT NULL DEFAULT 0,
    last_heartbeat DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT single_row CHECK (id = 1)
);

-- Cron Jobs Table (tracking background jobs)
CREATE TABLE cron_jobs (
    service TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    details TEXT
);

-- Transactions Table
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    trader_phone TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('credit_add', 'voucher_purchase', 'voucher_used', 'refund')),
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    voucher_id TEXT, -- Reference to voucher if applicable
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trader_phone) REFERENCES traders(phone) ON DELETE CASCADE,
    FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE SET NULL
);

-- Indexes for better performance
CREATE INDEX idx_auth_users_username ON auth_users(username);
CREATE INDEX idx_auth_users_type ON auth_users(type);
CREATE INDEX idx_auth_users_phone ON auth_users(phone);

CREATE INDEX idx_traders_phone ON traders(phone);
CREATE INDEX idx_traders_is_active ON traders(is_active);

CREATE INDEX idx_mikrotiks_host ON mikrotiks(host);
CREATE INDEX idx_mikrotiks_is_active ON mikrotiks(is_active);

CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_mac_address ON clients(mac_address);
CREATE INDEX idx_clients_trader_phone ON clients(trader_phone);

CREATE INDEX idx_users_trader_phone ON users(trader_phone);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_disabled ON users(disabled);
CREATE INDEX idx_users_mac_address ON users(mac_address);

CREATE INDEX idx_sessions_trader_phone ON sessions(trader_phone);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);

CREATE INDEX idx_vouchers_trader_phone ON vouchers(trader_phone);
CREATE INDEX idx_vouchers_voucher_code ON vouchers(voucher_code);
CREATE INDEX idx_vouchers_is_used ON vouchers(is_used);
CREATE INDEX idx_vouchers_expires_at ON vouchers(expires_at);

CREATE INDEX idx_transactions_trader_phone ON transactions(trader_phone);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_voucher_id ON transactions(voucher_id);

-- Message Queue Indexes
CREATE INDEX idx_message_queue_status ON message_queue(status);
CREATE INDEX idx_message_queue_phone ON message_queue(phone_number);
CREATE INDEX idx_message_queue_priority ON message_queue(priority DESC);
CREATE INDEX idx_message_queue_scheduled ON message_queue(scheduled_at);
CREATE INDEX idx_message_queue_created ON message_queue(created_at);

-- Bot Status Indexes
CREATE INDEX idx_bot_status_ready ON bot_status(is_ready);
CREATE INDEX idx_bot_status_heartbeat ON bot_status(last_heartbeat);

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_auth_users_timestamp 
    AFTER UPDATE ON auth_users
    FOR EACH ROW
    BEGIN
        UPDATE auth_users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_traders_timestamp 
    AFTER UPDATE ON traders
    FOR EACH ROW
    BEGIN
        UPDATE traders SET updated_at = CURRENT_TIMESTAMP WHERE phone = NEW.phone;
    END;

CREATE TRIGGER update_trader_pricing_timestamp 
    AFTER UPDATE ON trader_pricing
    FOR EACH ROW
    BEGIN
        UPDATE trader_pricing SET updated_at = CURRENT_TIMESTAMP WHERE trader_phone = NEW.trader_phone;
    END;

CREATE TRIGGER update_mikrotiks_timestamp 
    AFTER UPDATE ON mikrotiks
    FOR EACH ROW
    BEGIN
        UPDATE mikrotiks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_clients_timestamp 
    AFTER UPDATE ON clients
    FOR EACH ROW
    BEGIN
        UPDATE clients SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_users_timestamp 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_sessions_timestamp 
    AFTER UPDATE ON sessions
    FOR EACH ROW
    BEGIN
        UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_vouchers_timestamp 
    AFTER UPDATE ON vouchers
    FOR EACH ROW
    BEGIN
        UPDATE vouchers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER update_bot_status_timestamp 
    AFTER UPDATE ON bot_status
    FOR EACH ROW
    BEGIN
        UPDATE bot_status SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Views for common queries
CREATE VIEW trader_summary AS
SELECT 
    t.phone,
    t.name,
    t.hotspot_name,
    t.credit,
    t.is_active,
    tp.hour_price,
    tp.day_price,
    tp.week_price,
    tp.month_price,
    COUNT(DISTINCT c.id) as client_count,
    COUNT(DISTINCT u.id) as user_count,
    COUNT(DISTINCT v.id) as voucher_count,
    COALESCE(SUM(CASE WHEN tx.type = 'credit_add' THEN tx.amount ELSE 0 END), 0) as total_credits_added,
    COALESCE(SUM(CASE WHEN tx.type = 'voucher_purchase' THEN ABS(tx.amount) ELSE 0 END), 0) as total_voucher_spent
FROM traders t
LEFT JOIN trader_pricing tp ON t.phone = tp.trader_phone
LEFT JOIN clients c ON t.phone = c.trader_phone
LEFT JOIN users u ON t.phone = u.trader_phone
LEFT JOIN vouchers v ON t.phone = v.trader_phone
LEFT JOIN transactions tx ON t.phone = tx.trader_phone
GROUP BY t.phone, t.name, t.hotspot_name, t.credit, t.is_active, tp.hour_price, tp.day_price, tp.week_price, tp.month_price;

CREATE VIEW active_sessions AS
SELECT 
    s.id,
    s.trader_phone,
    t.name as trader_name,
    u.username,
    s.start_time,
    s.is_active,
    s.created_at
FROM sessions s
JOIN traders t ON s.trader_phone = t.phone
LEFT JOIN users u ON s.user_id = u.id
WHERE s.is_active = 1;

CREATE VIEW voucher_analytics AS
SELECT 
    v.trader_phone,
    t.name as trader_name,
    COUNT(v.id) as total_vouchers,
    COUNT(CASE WHEN v.is_used = 1 THEN 1 END) as used_vouchers,
    COUNT(CASE WHEN v.is_used = 0 AND (v.expires_at IS NULL OR v.expires_at > CURRENT_TIMESTAMP) THEN 1 END) as available_vouchers,
    COUNT(CASE WHEN v.is_used = 0 AND v.expires_at < CURRENT_TIMESTAMP THEN 1 END) as expired_vouchers,
    SUM(CASE WHEN v.is_used = 1 THEN v.price ELSE 0 END) as total_revenue
FROM vouchers v
JOIN traders t ON v.trader_phone = t.phone
GROUP BY v.trader_phone, t.name;
