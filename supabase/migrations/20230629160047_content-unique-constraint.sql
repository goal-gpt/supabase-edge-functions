alter table "public"."document" drop constraint "document_content_key";

drop index if exists "public"."document_content_key";

alter table "public"."document" alter column "content" set not null;
