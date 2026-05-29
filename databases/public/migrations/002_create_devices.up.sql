CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT UNIQUE NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('desktop', 'mobile', 'web')),
  device_name TEXT NOT NULL,
  platform TEXT,
  app_version TEXT,
  public_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'trusted', 'revoked', 'blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ
);

CREATE TABLE trusted_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  desktop_device_id TEXT NOT NULL REFERENCES devices(device_id),
  mobile_device_id TEXT NOT NULL REFERENCES devices(device_id),
  trust_level TEXT NOT NULL DEFAULT 'view_only' CHECK (trust_level IN ('view_only', 'approve_only', 'full_control')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  UNIQUE(desktop_device_id, mobile_device_id)
);

CREATE TABLE link_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  desktop_device_id TEXT NOT NULL,
  mobile_device_id TEXT NOT NULL,
  workspace_id TEXT,
  window_id TEXT,
  terminal_id TEXT,
  mode TEXT NOT NULL DEFAULT 'full_control' CHECK (mode IN ('view_only', 'approve_only', 'full_control')),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'expired', 'ended')),
  transport TEXT NOT NULL DEFAULT 'pending' CHECK (transport IN ('pending', 'p2p', 'relay')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  device_id TEXT,
  action TEXT NOT NULL,
  resource TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_devices_user_id ON devices(user_id);
CREATE INDEX idx_devices_device_id ON devices(device_id);
CREATE INDEX idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX idx_link_sessions_user_id ON link_sessions(user_id);
CREATE INDEX idx_link_sessions_status ON link_sessions(status);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
