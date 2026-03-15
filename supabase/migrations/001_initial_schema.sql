-- ─── Users ─────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  company_name text,
  default_rate numeric(10,2) not null default 175.00,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.users for insert
  with check (auth.uid() = id);

-- ─── Clients ───────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_name text not null,
  default_rate numeric(10,2),
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;

create policy "Users can manage own clients"
  on public.clients for all
  using (auth.uid() = user_id);

-- ─── Sessions ──────────────────────────────────────────────────
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null,
  transcript text not null,
  analysis_json jsonb,
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Users can manage own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

-- ─── Invoices ──────────────────────────────────────────────────
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  total_hours numeric(10,2) not null,
  hourly_rate numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  invoice_pdf_url text,
  created_at timestamptz not null default now()
);

alter table public.invoices enable row level security;

create policy "Users can read own invoices"
  on public.invoices for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = invoices.session_id
      and s.user_id = auth.uid()
    )
  );

create policy "Users can insert own invoices"
  on public.invoices for insert
  with check (
    exists (
      select 1 from public.sessions s
      where s.id = session_id
      and s.user_id = auth.uid()
    )
  );

-- ─── Auto-create user profile on signup ────────────────────────
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, company_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'company_name', null)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
