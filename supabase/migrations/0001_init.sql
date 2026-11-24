-- CMC Growth Store — Supabase schema (mirrors includes/db.php from the PHP build).
-- Numbers stay integer cents. Statuses keep the exact PHP values so admin
-- filters and email copy behave identically.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- catalogue
create table if not exists categories (
    id bigint generated always as identity primary key,
    slug text not null unique,
    name text not null,
    description text default '',
    icon text default '',
    sort_order int default 0,
    active boolean default true,
    created_at timestamptz not null default now()
);

create table if not exists products (
    id bigint generated always as identity primary key,
    sku text not null unique,
    slug text not null unique,
    category_id bigint references categories(id) on delete set null,
    title text not null,
    subtitle text default '',
    description text default '',
    benefits text default '',          -- newline-separated
    outcomes text default '',          -- newline-separated
    audience text default '',          -- newline-separated
    includes text default '',          -- newline-separated
    format text default 'PDF',
    pages text default '',
    price_cents int not null default 0,
    sale_price_cents int,              -- null = no promo
    status text not null default 'coming_soon',  -- draft | coming_soon | published
    featured boolean default false,
    bestseller_rank int,               -- null = not a bestseller
    is_new boolean default false,
    is_bundle boolean default false,
    bundle_skus text default '',       -- csv of child product skus
    file_path text default '',         -- storage path inside product-files; never public
    cover_color text default 'blue',   -- blue | gold | navy | coral
    preview_note text default '',
    sort_order int default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists customers (
    id bigint generated always as identity primary key,
    email text not null unique,
    password_hash text,                -- null = email-verified guest only
    first_name text default '',
    last_name text default '',
    phone text default '',
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create table if not exists orders (
    id bigint generated always as identity primary key,
    ref text not null unique,          -- CMC-YYYYMMDD-XXXXXX
    customer_id bigint references customers(id) on delete set null,
    email text not null,
    first_name text default '',
    last_name text default '',
    phone text default '',
    subtotal_cents int not null default 0,
    discount_cents int not null default 0,
    total_cents int not null default 0,
    discount_code text default '',
    status text not null default 'PENDING',
        -- PENDING | PROCESSING | PAID | FAILED | CANCELLED | REFUNDED
    ozow_transaction_id text,
    ozow_status_message text default '',
    test_mode boolean default false,
    ip text default '',
    created_at timestamptz not null default now(),
    paid_at timestamptz,
    fulfilled_at timestamptz
);
create index if not exists idx_orders_email on orders(email);
create index if not exists idx_orders_status on orders(status);

create table if not exists order_items (
    id bigint generated always as identity primary key,
    order_id bigint not null references orders(id) on delete cascade,
    product_id bigint references products(id) on delete set null,
    title_snapshot text not null,
    sku_snapshot text not null default '',
    unit_cents int not null,
    qty int not null default 1
);

-- one row per gateway notification/redirect result; unique key = idempotency
create table if not exists payments (
    id bigint generated always as identity primary key,
    order_id bigint not null references orders(id) on delete cascade,
    gateway text not null default 'ozow',
    transaction_id text not null,
    amount_cents int not null,
    status text not null,
    source text not null default 'notify',  -- notify | redirect
    raw text default '',
    ip text default '',
    created_at timestamptz not null default now(),
    unique(order_id, transaction_id, source)
);

create table if not exists entitlements (
    id bigint generated always as identity primary key,
    order_id bigint not null references orders(id) on delete cascade,
    product_id bigint not null references products(id),
    email text not null,
    token text not null unique,
    download_limit int not null default 5,
    downloads_used int not null default 0,
    revoked boolean default false,
    created_at timestamptz not null default now(),
    unique(order_id, product_id)
);

create table if not exists entitlement_links (
    id bigint generated always as identity primary key,
    entitlement_id bigint not null references entitlements(id) on delete cascade,
    token text not null unique,
    expires_at timestamptz not null,
    max_downloads int not null default 3,
    used int not null default 0,
    created_at timestamptz not null default now()
);

create table if not exists download_events (
    id bigint generated always as identity primary key,
    entitlement_id bigint not null references entitlements(id) on delete cascade,
    ip text default '',
    user_agent text default '',
    created_at timestamptz not null default now()
);

create table if not exists discount_codes (
    id bigint generated always as identity primary key,
    code text not null unique,
    type text not null default 'percent',   -- percent | fixed
    value int not null,                     -- percent (0-100) or cents
    active boolean default true,
    min_subtotal_cents int default 0,
    starts_at timestamptz,
    ends_at timestamptz,
    max_uses int,                           -- null = unlimited
    used int default 0,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- content
create table if not exists settings (
    key text primary key,
    value text not null
);

create table if not exists admin_users (
    id bigint generated always as identity primary key,
    email text not null unique,
    password_hash text not null,
    name text default '',
    role text default 'admin',
    created_at timestamptz not null default now(),
    last_login timestamptz
);

create table if not exists login_attempts (
    id bigint generated always as identity primary key,
    context text not null,             -- 'admin:email' or 'customer:email'
    ip text default '',
    ok boolean default false,
    created_at timestamptz not null default now()
);

create table if not exists mail_log (
    id bigint generated always as identity primary key,
    to_email text not null,
    subject text not null,
    body text not null,
    status text default 'sent',        -- sent | failed
    error text default '',
    kind text default '',
    created_at timestamptz not null default now()
);

create table if not exists newsletter (
    id bigint generated always as identity primary key,
    email text not null unique,
    created_at timestamptz not null default now()
);

create table if not exists testimonials (
    id bigint generated always as identity primary key,
    name text not null,
    role text default '',
    quote text not null,
    active boolean default true,
    is_sample boolean default false,
    sort_order int default 0,
    created_at timestamptz not null default now()
);

create table if not exists faqs (
    id bigint generated always as identity primary key,
    question text not null,
    answer text not null,
    active boolean default true,
    sort_order int default 0,
    created_at timestamptz not null default now()
);

create table if not exists media (
    id bigint generated always as identity primary key,
    title text not null,
    kind text not null default 'pdf',       -- pdf | video | audio | image | zip | doc | ebook
    mime text default '',
    ext text default '',
    size_bytes bigint default 0,
    stored_name text not null unique,       -- random name inside media-files bucket (never public)
    original_name text default '',
    note text default '',                   -- internal note, never shown to buyers
    duration_text text default '',
    created_at timestamptz not null default now()
);

create table if not exists product_media (
    id bigint generated always as identity primary key,
    product_id bigint not null references products(id) on delete cascade,
    media_id bigint not null references media(id) on delete cascade,
    label text default '',
    sort_order int default 0,
    created_at timestamptz not null default now(),
    unique(product_id, media_id)
);

create table if not exists media_links (
    id bigint generated always as identity primary key,
    media_id bigint not null references media(id) on delete cascade,
    entitlement_id bigint not null references entitlements(id) on delete cascade,
    token text not null unique,             -- 48-hex, same shape as entitlement_links
    expires_at timestamptz not null,
    max_downloads int not null default 0,   -- 0 = unlimited while valid (streaming)
    used int not null default 0,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- storage
-- private buckets; access only through expiring signed URLs from the server.
insert into storage.buckets (id, name, public, file_size_limit)
values
  ('product-files', 'product-files', false, 83886080),   -- 80 MB
  ('media-files',   'media-files',   false, 524288000)   -- 512 MB
on conflict (id) do nothing;

-- ---------------------------------------------------------------- rls
-- the app talks through the service key server-side only; every table denies
-- anon and authenticated clients outright so nothing is readable in a browser.
alter table categories         enable row level security;
alter table products           enable row level security;
alter table customers          enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table payments           enable row level security;
alter table entitlements       enable row level security;
alter table entitlement_links  enable row level security;
alter table download_events    enable row level security;
alter table discount_codes     enable row level security;
alter table settings           enable row level security;
alter table admin_users        enable row level security;
alter table login_attempts     enable row level security;
alter table mail_log           enable row level security;
alter table newsletter         enable row level security;
alter table testimonials       enable row level security;
alter table faqs               enable row level security;
alter table media              enable row level security;
alter table product_media      enable row level security;
alter table media_links        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'categories','products','customers','orders','order_items','payments',
    'entitlements','entitlement_links','download_events','discount_codes',
    'settings','admin_users','login_attempts','mail_log','newsletter',
    'testimonials','faqs','media','product_media','media_links'
  ] loop
    execute format('drop policy if exists no_client_access on %I', t);
    execute format('create policy no_client_access on %I for all to anon, authenticated using (false) with check (false)', t);
  end loop;
end $$;
