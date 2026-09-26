-- Server readiness reads scans; operator coordination records run progress.
-- Keep these grants limited to the tables and operations used by those paths.
grant select on table public.scans to service_role;
grant select, insert, update on table public.operator_runs to service_role;
grant select, insert on table public.operator_run_events to service_role;
