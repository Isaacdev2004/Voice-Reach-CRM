# Writing-first Notes and template repair

Categories and primary note actions now sit in the left rail, above the scrollable note library and supporting panels. The editor occupies the remaining width, with a taller writing canvas. Mobile keeps explicit Library / Editor / Context switching.

Built-in templates are available even with the basic Notes schema. The shared template-to-note mapper chooses compatible note/strategy/goal kinds and supported metadata; it does not bypass schema checks. Unsupported advanced metadata, history and reusable user templates remain gated. No migration is needed for these built-in templates.

All eleven templates now include concrete real-estate planning prompts, ownership/due-date checklists and verified-data reminders. The picker supports search, short use-case descriptions and expandable outline previews. Applying a template first saves the current draft using existing conflict checks, then creates a separate editable note. It does not create tasks, send messages or modify calendar events. Saved reusable templates are copied without inheriting contact associations.

Validation: real basic-schema handler test saves all eleven templates; browser tests cover their creation, editing, saving and reopening, custom-template reuse, existing conflict/recovery flows, tenant isolation, and editor-width/sidebar positioning at desktop sizes. Responsive browser checks cover 1440/1920/768/390. TypeScript, affected lint, Notes regression tests and optimized build pass.

Production remains unchanged. Hosted owner review is separate from the synthetic acceptance tests. Reusable custom templates and version history still require the advanced Notes database schema and are not silently enabled here.
