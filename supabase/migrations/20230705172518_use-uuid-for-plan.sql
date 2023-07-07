drop table public.plan;

create table public.plan (
    id uuid not null default uuid_generate_v4(),
    user_id uuid,
    goal text,
    steps json null,
    inserted_at timestamp with time zone not null default timezone ('utc'::text, now()),
    updated_at timestamp with time zone not null default timezone ('utc'::text, now()),
    constraint plan_pkey primary key (id),
    constraint plan_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade
  ) tablespace pg_default;

ALTER TABLE public.plan ENABLE ROW LEVEL SECURITY;

create policy "Users can view their own plans."
on public.plan for select
using ( auth.uid() = user_id );

create policy "Users can insert their own plans."
on public.plan for insert
with check ( auth.uid() = user_id );

create policy "Users can update their own plans."
on public.plan for update
using ( auth.uid() = user_id );

create policy "Users can delete their own plans."
on public.plan for delete
using ( auth.uid() = user_id );
