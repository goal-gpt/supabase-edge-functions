create table "public"."subscriber" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "email" character varying not null,
    "user_id" uuid,
    "updated_at" timestamp with time zone not null default now(),
    "is_subscribed" boolean not null default true
);


alter table "public"."subscriber" enable row level security;

CREATE UNIQUE INDEX subscribers_email_key ON public.subscriber USING btree (email);

CREATE UNIQUE INDEX subscribers_pkey ON public.subscriber USING btree (id);

alter table "public"."subscriber" add constraint "subscribers_pkey" PRIMARY KEY using index "subscribers_pkey";

alter table "public"."subscriber" add constraint "subscriber_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."subscriber" validate constraint "subscriber_user_id_fkey";

alter table "public"."subscriber" add constraint "subscribers_email_key" UNIQUE using index "subscribers_email_key";

create policy "Enable delete for users based on user_id"
on "public"."subscriber"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Enable insert for all users"
on "public"."subscriber"
as permissive
for insert
to public
with check (true);


create policy "Enable read access for all users"
on "public"."subscriber"
as permissive
for select
to public
using (true);


create policy "Enable update for users based on email"
on "public"."subscriber"
as permissive
for update
to public
using (((auth.jwt() ->> 'email'::text) = (email)::text))
with check (((auth.jwt() ->> 'email'::text) = (email)::text));



