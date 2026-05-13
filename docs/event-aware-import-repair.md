# Event-Aware Import Data Repair

Use this checklist after deploying the event-aware import migration.

1. Run the database migration so existing divisions receive slugs and legacy `usauUrl` values become active import sources.
2. Open `/admin/settings` and confirm each event has the expected divisions and USAU source URLs.
3. Create any missing championship events from `/admin/import` by pasting one USAU division URL, choosing `Create new event`, and saving the first division.
4. Import the remaining divisions by choosing the correct existing event and `Create new division`.
5. For any event that was accidentally overwritten, check `/admin/entries` before reopening picks. Delete test entries or ask affected users to resubmit if their picks point at the wrong championship field.
6. Use `/admin/games` to preview result imports from the stored source URLs before confirming updates.

Do not repair overwritten event data by importing into whichever admin event is active. Always confirm the target event and division in the guided import form.
