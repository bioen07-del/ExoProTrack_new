# EXO-ProTrack Session Summary

**Last Updated:** 2026-01-23 21:45
**Project:** /workspace/exo-protrack
**Deployed URL:** https://b5kr6utulx4l.space.minimax.io

## Recent Changes Implemented

### 1. Product Archive/Restore Feature
- Added `archived_at` column to `product` table
- Admin can archive products instead of hard-delete
- "Показать архив" checkbox to toggle archived products visibility
- Restore button for archived items

### 2. Raw Material Processing Display
- Added "Проц. сырья" column to products table in Admin
- Shows `default_raw_processing` methods in order

### 3. Modification Type for Processing Methods
- Added new method type "Modification" to `cm_process_method`
- New fields for Modification type:
  - `steps_count` - number of steps
  - `step_definitions` - JSON array with step descriptions
  - `applicability` - 'product', 'raw', or 'both'
  - `trigger_stage` - when to trigger the form
- Updated Lyophilization method to use Modification type
- DB migration added 'Modification' to CHECK constraint

### 4. Requests Page Improvements
- Hide completed/cancelled requests by default
- Added "Показать завершённые" checkbox
- Added search field (searches request_id, customer, status)
- Added sort dropdown (by date, customer, status)

### 5. Processing Step Creation Fix
- Fixed bug where pack lots created with "Filling" status skipped processing step creation
- Modified `RequestList.tsx` and `RequestDetail.tsx` to check if product has processing methods
- If product has `default_postprocess_methods`, initial status is set to "Processing" instead of "Filling"

### 6. Time Tracking for Processing Methods (Latest)
- Added `requires_time_tracking` boolean to `cm_process_method` table
- Added columns to `pack_processing_step`: `started_at`, `ended_at`, `duration_minutes`
- Admin form shows checkbox "Требуется фиксация времени процедуры" for all method types
- Methods table shows "Время" column with ✓ when enabled
- PackLotDetail processing form shows start/end datetime fields when method requires time tracking
- Auto-calculates duration in minutes
- Displays time data on completed steps

---

## Pending Tasks (User's Original 3-Part Request)

### Task 1: Change Processing Units from "шт" to "мл"
- **Status:** NOT STARTED
- **Description:** Processing step input/output fields should use 'мл' (ml) instead of 'шт' (pieces) for processing before bottling
- **Files to modify:** `PackLotDetail.tsx` - processing form labels

### Task 2: Improve Request Detail UI
- **Status:** NOT STARTED  
- **Description:** Redesign requirements section to clearly distinguish:
  - Base vs additional requirements
  - Raw material vs product requirements (QC and processing)
  - Show fulfillment status for each
- **Files to modify:** `RequestDetail.tsx`

### Task 3: Lyophilization Step Not Appearing
- **Status:** INVESTIGATED - AWAITING USER DECISION
- **Finding:** Pack lot `PK-20260123-0002` has `has_lyophilization: false`
- **Finding:** Product "ReEXOw2" only has "Фильтрация 0,1 мкм" in `default_postprocess_methods`, not Lyophilization
- **Options presented to user:**
  1. Manually add Lyophilization step to this specific pack lot
  2. Update product definition to include Lyophilization for future lots
- **User has not yet confirmed which option to proceed with**

---

## Database Schema Notes

### Key Tables Modified
- `product` - added `archived_at` timestamp
- `cm_process_method` - added `requires_time_tracking`, `steps_count`, `step_definitions`, `applicability`, `trigger_stage`
- `pack_processing_step` - added `started_at`, `ended_at`, `duration_minutes`

### Important Relationships
- `pack_lot.request_line_id` → `request_line.request_line_id`
- `pack_processing_step.pack_lot_id` → `pack_lot.pack_lot_id`
- `pack_processing_step.method_id` → `cm_process_method.method_id`

---

## Key Files

| File | Purpose |
|------|--------|
| `src/pages/AdminPage.tsx` | Reference data management (products, methods, QC tests) |
| `src/pages/RequestList.tsx` | List of production requests |
| `src/pages/RequestDetail.tsx` | Single request details and actions |
| `src/pages/PackLotDetail.tsx` | Pack lot lifecycle (processing, QC, QA) |
| `src/pages/CmLotDetail.tsx` | CM lot lifecycle |

---

## Supabase Config
- Project ID: swlzoqemroxdoenqxhnx
- URL: https://swlzoqemroxdoenqxhnx.supabase.co
