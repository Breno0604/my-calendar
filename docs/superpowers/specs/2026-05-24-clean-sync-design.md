# Sincronia Clean Sync — Supabase Only

## Architecture

Supabase is the single source of truth. No localStorage for events/categories.
Theme stays in localStorage (UI preference only).

## Data Flow

```
onMounted → loadEvents(sb) + loadCategories(sb) → events.value / categoriesData.value

saveNewEvent → INSERT into Supabase → update local array from response → toast
saveEditedEvent → UPDATE in Supabase → update local array from response → toast
deleteEvent → DELETE in Supabase → remove from local array → toast
undoableDelete → DELETE in Supabase → hold deleted event for undo
undoDelete → INSERT into Supabase → add back to local array → toast
```

## Removed

- `pending-ops.js` service and `pending-ops.spec.js`
- `fetchEvents` / `fetchCategories` (duplicates of load*)
- ALL `saveToStorage` and `loadFromStorage` calls for events/categories
- ALL `pendingOps` references
- `doSync`, `processPendingOps`, `syncReminderInterval`
- `visibilitychange` handler, polling intervals, realtime subscriptions
- `dirty` flag, `_saveGen`, `_catSaveGen` (already removed)

## Files to Change

### src/services/db.js
- `loadEvents`: remove localStorage fallback, pure fetch only
- `loadCategories`: remove localStorage fallback
- remove `fetchEvents` and `fetchCategories`

### src/App.vue
- Remove `pending-ops.js` import
- Remove `pendingOps` ref
- Remove `processPendingOps()` function
- Remove `saveToStorage()` function (localStorage-only wrapper)
- `onMounted`: load from Supabase with `await`, no localStorage, no sync setup
- `saveNewEvent`: INSERT in Supabase, update local array from response
- `saveEditedEvent`: UPDATE in Supabase, update local array from response
- `undoableDelete`: DELETE in Supabase, hold for undo
- `undoDelete`: INSERT in Supabase, add back
- `saveCategoriesToStorage`: Supabase-only (remove localStorage)
- Category CRUD: Supabase-only
- Drag/resize/recurrence: Supabase-only
- Remove `onVisibility`, `pollId`, `pendingTimer`, `onRealtimeChange`

### Tests
- `helpers.js`: no localStorage seeding for events/categories
- `sync.spec.js`: rewrite for Supabase-only operations
- `pending-ops.spec.js`: delete
- All test files: remove localStorage expectations for events/categories
