# Dev-only SQL

`000_reset_and_setup.sql` **drops every table** (`DROP TABLE ... CASCADE`) and recreates them.
It lives here, outside `supabase/migrations/`, so that `supabase db push` / migration
runners can never execute it against a real database by accident.

Use it only on a throwaway local or dev project. For production, apply
`supabase/migrations/*` in order, and never run anything from this folder.
