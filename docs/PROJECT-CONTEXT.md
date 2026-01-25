# EXO-ProTrack - Project Context for New Session

## Quick Start
```bash
cd /workspace/exo-protrack
pnpm build && # deploy to continue
```

**Live URL:** https://b5kr6utulx4l.space.minimax.io
**Supabase:** swlzoqemroxdoenqxhnx.supabase.co

---

## Project Overview

**EXO-ProTrack** - Production tracking system for biotechnology/pharmaceutical manufacturing.

### Core Entities
- **Request** - Production order from customer
- **CM Lot** - Conditioned media lot (raw material)
- **Pack Lot** - Final packaged product lot
- **Processing Steps** - Filtration, TFF, Lyophilization, etc.
- **QC/QA** - Quality control tests and quality assurance decisions

### Tech Stack
- React + TypeScript + Vite
- TailwindCSS
- Supabase (PostgreSQL + Auth)

---

## Database Schema (Key Tables)

### product
```sql
product_code (PK), product_name, product_type, media_spec_id,
default_primary_qc (jsonb), default_raw_processing (jsonb),
default_postprocess_methods (jsonb), default_product_qc (jsonb),
archived_at (timestamp)
```

### cm_process_method
```sql
method_id (PK), code, name, method_type, description, is_active,
requires_time_tracking (bool),
-- Modification type only:
steps_count, step_definitions (jsonb), applicability, trigger_stage
```

### pack_lot
```sql
pack_lot_id (PK), request_line_id, status, qty_planned,
source_cm_lot_id, pack_format_code, has_lyophilization
```

### pack_processing_step
```sql
processing_step_id (PK), pack_lot_id, method_id, method_name,
status, qty_input, qty_output, notes, performed_by,
started_at, ended_at, duration_minutes, completed_at
```

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/pages/AdminPage.tsx` | Reference data CRUD (products, methods, QC tests, media) |
| `src/pages/RequestList.tsx` | Production requests list with filtering/sorting |
| `src/pages/RequestDetail.tsx` | Single request view, create pack lots |
| `src/pages/PackLotDetail.tsx` | Pack lot lifecycle (processing, QC, QA, shipping) |
| `src/pages/CmLotDetail.tsx` | CM lot lifecycle |
| `src/lib/supabase.ts` | Supabase client and type definitions |

---

## Recent Changes (Last Session)

1. ✅ Product archive/restore feature
2. ✅ Raw processing display in Admin products table
3. ✅ "Modification" method type with multi-step definitions
4. ✅ Requests page: hide completed, search, sort
5. ✅ Fix: processing steps now created when pack lot needs processing
6. ✅ Time tracking for processing methods (start/end/duration)

---

## PENDING TASKS

### Task 1: Units "шт" → "мл"
**Location:** `PackLotDetail.tsx` lines ~900-920
**Change:** Labels "Кол-во на входе (шт)" → "Кол-во на входе (мл)" for pre-bottling processing

### Task 2: Request Detail UI Improvement
**Location:** `RequestDetail.tsx`
**Goal:** Clearly show:
- Base requirements vs additional requirements
- Raw material requirements vs product requirements
- Fulfillment status for each requirement

### Task 3: Lyophilization for PK-20260123-0002
**Investigation Result:**
- `pack_lot` has `has_lyophilization: false`
- Product "ReEXOw2" doesn't have Lyophilization in `default_postprocess_methods`
- **User needs to decide:** manual fix for this lot OR update product definition

---

## Useful Queries

```sql
-- Check pack lot processing steps
SELECT * FROM pack_processing_step WHERE pack_lot_id = 'PK-20260123-0002';

-- Check product processing requirements
SELECT product_code, product_name, default_postprocess_methods 
FROM product WHERE product_code = 'ReEXOw2';

-- Check method time tracking settings
SELECT method_id, name, method_type, requires_time_tracking 
FROM cm_process_method WHERE is_active = true;
```

---

## Status Flow

### Pack Lot Statuses
```
Planned → Processing → Filling → QC_Pending → QA_Pending → Released → Shipped
```

### Processing Step Statuses
```
Pending → In Progress → Completed
```
