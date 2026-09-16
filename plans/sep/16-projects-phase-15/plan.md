# Implementation Plan: 876 Projects Phase 15 — Custom Modules

- **Run ID:** `2026-09-16-projects-phase-15` · **Branch:** `feature/projects-phase-15-custom-modules` · **Status:** `PLANNED`

## Binding decisions
1. A **custom module** is org-defined record type (`projects_custom_modules`: tenant, `scope` `org|project`, optional `projectId`, `key` kebab-case, `singularName`, `pluralName`, `icon` key, `version`, soft delete). Not to be confused with settings "modules" — UI copy calls them "Custom modules".
2. **Fields** reuse the phase-12 field-type vocabulary and the shared value validator `src/modules/custom-fields/field-values.ts` (`projects_custom_module_fields`). **Layouts** reuse phase-12 layouts with `entity = 'custom-module:<moduleKey>'` (extend the entity union; resolver + rule evaluator unchanged).
3. **Records** (`projects_custom_module_records`: tenant, moduleId, projectId nullable, `title`, `statusKey`, `values` stored in `projects_custom_module_record_values` with the same typed columns as other field values, created/updated by, soft delete). **Statuses** per module (`projects_custom_module_statuses`: key, label, category `open|in-progress|done`, position).
4. **Relationships**: `projects_custom_module_links` (record ↔ record | work-item | project | phase), typed `relation` key, unique per pair+relation.
5. **Permissions**: per module `view|create|edit|delete` keys generated as `custom-module:<key>.<action>`; stored grants per app role in core app access are out of scope — Projects enforces via existing `projects.view`/`projects.edit` plus a module-level `restrictedToRoleKeys` list checked against the caller's effective app role keys passed by the app. Documented as interim.
6. **Reports**: count by status, by field (select fields), created over period — reuse reports module helpers and CSV serializer.
7. **Automation**: new triggers `custom-record.created|updated|status-changed` feed the phase-13 outbox; actions `set-field`/`notify`/`call-webhook` apply to records.
8. **Widgets**: a dashboard widget definition (`projects_dashboard_widgets`: tenant, userId nullable (shared), kind `record-count|status-breakdown|recent-records`, moduleId, config JSON, position) rendered on the Projects dashboard.
9. App: Settings → Custom modules (definition, fields, statuses, layout via phase-12 editor), module record list/detail/new/edit pages at `/m/[moduleKey]`, sidebar entries for org-scope modules. Console: read-only definitions + records.
