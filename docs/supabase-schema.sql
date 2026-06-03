create table if not exists leads (
  id text primary key,
  name text not null,
  email text not null default '',
  phone text not null default '',
  company text not null default '',
  website text not null default '',
  industry text not null default 'general business',
  source text not null,
  status text not null,
  service_needed text not null default '',
  budget text not null default '',
  timeline text not null default '',
  score integer not null default 0,
  summary text not null default '',
  assigned_to text not null default '',
  pain_points jsonb not null default '[]'::jsonb,
  goals jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id text primary key,
  lead_id text not null references leads(id) on delete cascade,
  channel text not null,
  status text not null,
  summary text not null default '',
  handoff_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists messages (
  id text primary key,
  conversation_id text not null references conversations(id) on delete cascade,
  sender text not null,
  direction text not null,
  content text not null,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists bookings (
  id text primary key,
  lead_id text not null references leads(id) on delete cascade,
  calendar_event_id text not null default '',
  meeting_url text not null default '',
  scheduled_for timestamptz not null,
  timezone text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists human_handoffs (
  id text primary key,
  lead_id text not null references leads(id) on delete cascade,
  conversation_id text not null references conversations(id) on delete cascade,
  reason text not null,
  priority text not null,
  status text not null,
  assigned_to text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists voice_calls (
  id text primary key,
  lead_id text not null references leads(id) on delete cascade,
  conversation_id text not null references conversations(id) on delete cascade,
  provider text not null,
  provider_call_id text not null default '',
  phone_number text not null,
  direction text not null,
  status text not null,
  transcript text not null default '',
  summary text not null default '',
  result text not null default '',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
