ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY tenant_isolation_projects ON projects
    USING (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY tenant_isolation_tasks ON tasks
    USING (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY tenant_isolation_comments ON comments
    USING (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    USING (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY tenant_isolation_memberships ON memberships
    USING (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
--> statement-breakpoint
CREATE POLICY tenant_isolation_invitations ON invitations
    USING (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
    WITH CHECK (organization_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
