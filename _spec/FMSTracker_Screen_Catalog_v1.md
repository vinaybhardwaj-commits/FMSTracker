# FMSTracker — Screen Catalog v1.0

**Date:** 2 May 2026
**Companion to:** `FMSTracker_PRD_v1.md`
**Purpose:** Information architecture — every user-facing surface, what it contains, where it leads.

---

## 0. Surface Inventory

**22 screens + 6 modals = 28 surfaces.** Grouped into four sections:

| Section | Screens |
|---|---|
| **Onboarding** (1) | S01 First-launch |
| **Worker** (8) | S02 Today's tasks · S03 Task detail · S04 Selfie capture · S05 Photo capture · S05b Reading input · S05c Vendor proof · S06 Completion confirmation · S07 Yesterday recap |
| **Dashboard** (1) | S08 Dashboard |
| **Admin** (12) | S09 PIN entry · S10 Admin home · S11 Tasks list · S12 Task edit · S13 Locations list · S14 Location edit · S15 Vendors list · S16 Vendor edit · S17 Statutory list · S18 Statutory edit · S19 Statutory renewal · S20 Audit log · S21 CSV Import/Export |
| **Modals** (6) | M1 Skip reason · M2 Release claim · M3 Force propagate · M4 Soft-delete confirm · M5 Photo gallery · M6 Statutory detail |

---

## 1. Onboarding

### S01 — First-launch
**Route:** `/` (when no `device_uuid` in localStorage)
**Purpose:** Capture identity. Three steps in one flow.

**Contents:**
- Step 1: Welcome card. EHRC logo. "FMSTracker — Hospital facilities maintenance log." Big "Get started" button.
- Step 2: Name input. "What's your name?" Single text field, no keyboard for surnames required.
- Step 3: Selfie capture. Front camera. "Take a clear selfie. This is how others know it's you." Big shutter button. Retry option.
- Final: confirms identity card with name + selfie thumbnail + "All set!" message + auto-advance.

**Exits:**
- Complete → S02 Today's tasks
- No back/skip — onboarding is mandatory once

---

## 2. Worker Surfaces

### S02 — Today's tasks (home)
**Route:** `/`
**Purpose:** Primary worker surface. Show what needs doing today, claim work, see what's done.

**Contents:**
- **Top bar:** "Hello, Ravi" + small avatar | nav icons: 📅 Yesterday · 📊 Dashboard · 🔒 Admin
- **Pinned banner (if any):** RED/CRITICAL statutory items — flashing red border, "URGENT: Fire NOC expires in 14 days" + tap to S18
- **Section: Overdue** (if any) — orange cards, badge "Carried over from [date]"
- **Section: Today's tasks** — sorted by priority_weight desc, then claim state
  - Each card shows:
    - Task name (large)
    - System badge (color-coded)
    - Location/asset (small grey)
    - Cadence badge (Daily / Weekly / Monthly etc.)
    - Claim state pill:
      - Empty → "Tap to claim"
      - Mine → blue "You're on this" + timer
      - Other → grey + avatar + "Ravi · 24 min left"
- **Section: Done today** (collapsed accordion, expand to view) — green check, completer name, time
- **Pull to refresh** at the top

**Exits:**
- Tap card → S03 Task detail
- Tap 📅 → S07 Yesterday recap
- Tap 📊 → S08 Dashboard
- Tap 🔒 → S09 PIN entry

---

### S03 — Task detail
**Route:** `/instance/[id]`
**Purpose:** Show acceptance criteria + start work.

**Contents:**
- **Title:** task name (full, large)
- **Badges row:** system | cadence | priority indicator
- **Location/asset:** floor + sub-location
- **"What done looks like":** acceptance_criteria text (verbatim from snapshot)
- **Reference policy:** collapsible — tap to expand, shows nabh_standard_ref + reference_policy text
- **Vendor card** (if `actor_type = amc_supervised` or `statutory`):
  - Vendor name, contact, phone (tap-to-call)
  - Last visit date
  - Next due date if known
- **Claim state UI** (dynamic — biggest visual element):
  - Free: huge primary blue button "I'll do this"
  - Mine: huge primary blue button "Complete this" + small "Cancel my claim" link
  - Other: greyed Ravi-card + "Release this claim" secondary button
- **Skip button:** small, bottom — "Skip this task" → triggers M1

**Exits:**
- "I'll do this" → API call → button switches to "Complete this" (no nav)
- "Complete this" → S04 Selfie capture
- "Cancel my claim" → confirmation toast → button reverts
- "Release this claim" → M2 Release modal
- "Skip this task" → M1 Skip reason
- Back arrow → S02

---

### S04 — Selfie capture
**Route:** `/instance/[id]/complete/selfie`
**Purpose:** Identity proof at moment of completion.

**Contents:**
- Front camera preview (full screen, dark background)
- Helper text overlay: "This proves you completed the task"
- Compare card (small, top-right): baseline selfie thumbnail
- Big shutter button (bottom centre, ~80px)
- "Cancel" link (bottom-left)
- After capture: preview + "Use this" / "Retake"

**Exits:**
- Use this → S05 Photo capture
- Retake → camera preview again
- Cancel → S03 Task detail (claim retained)

---

### S05 — Photo capture
**Route:** `/instance/[id]/complete/photos`
**Purpose:** Capture proof of work. Multi-photo support.

**Contents:**
- Rear camera preview
- Helper text from acceptance_criteria (top): e.g., "Pressure gauge in green band — capture the gauge close-up"
- Big shutter button
- Captured grid below: thumbnails of photos taken so far (tap to delete)
- Photo count: "1 / no max" — minimum 1 enforced
- Buttons: "Add another" + "Done" (Done greys out until ≥1 photo)

**Exits:**
- Done → next step based on `evidence_required`:
  - `selfie+photo` → S06 Confirmation
  - `selfie+photo+reading` → S05b Reading input
  - `selfie+vendor_report+next_due_date` → S05c Vendor proof
- Back → S04 Selfie capture (retain selfie)

---

### S05b — Reading input (conditional)
**Route:** `/instance/[id]/complete/reading`
**Purpose:** Capture numeric value with units.

**Contents:**
- Header: "What's the reading?"
- Sub-header: extracted units hint from acceptance_criteria (e.g., "Enter pressure in kg/cm²")
- Acceptance band reminder: "Should be 4–5 kg/cm²"
- Big numeric keypad input (no decimal mask — let helper enter freely)
- Out-of-band warning (live, not blocking): if reading typed is outside acceptance band, soft red warning above input "Outside expected range — please verify"
- Notes field (optional): "Anything to flag?"
- Submit / Back

**Exits:**
- Submit → S06 Confirmation
- Back → S05 Photo capture

---

### S05c — Vendor proof capture (conditional)
**Route:** `/instance/[id]/complete/vendor`
**Purpose:** Three sub-steps for AMC/statutory tasks.

**Contents — three-step wizard:**
1. **Vendor on-site:** "Photo of vendor on-site or vendor ID card." Camera capture.
2. **Service report:** "Photo of signed service report." Camera capture.
3. **Next due date:** Date picker — "When's the next service due?" + suggested default based on cadence.

Helper text bar at top: vendor card info (name, system) for context.

**Exits:**
- Submit (after all 3 steps) → S06 Confirmation
- Back → S05 Photo capture (retain previous photos)

---

### S06 — Completion confirmation
**Route:** `/instance/[id]/complete/done`
**Purpose:** Show submission with proof, then return to home.

**Contents:**
- Big green checkmark animation
- "Saved!" header
- Task name (small)
- Proof card:
  - Selfie thumbnail (left)
  - Photo thumbnails grid (right)
  - Reading value (if applicable)
  - Vendor next-due-date (if applicable)
  - Timestamp + "Submitted by [your name]"
- Big primary button: "Back to today"

**Exits:**
- "Back to today" → S02 (with green toast: "Task complete · Well done")
- Auto-navigate to S02 after 5 sec

---

### S07 — Yesterday recap
**Route:** `/yesterday`
**Purpose:** Show what got done vs. missed yesterday.

**Contents:**
- **Top metrics row:** ✓ X done · ⊘ Y skipped · ⚠ Z missed
- **Section: Done** — list of completed tasks. Each item: thumbnail strip (selfie + 1–2 photo thumbs), task name, completer name + time. Tap → M5 Photo gallery.
- **Section: Skipped** — list with skip reason badge.
- **Section: Missed (overdue carried to today)** — orange items, action "View on today's list" → S02 with anchor scroll.
- **Date selector** at top (default = yesterday; can swipe back further)

**Exits:**
- Tap done item → M5 Photo gallery (modal)
- Tap missed item → S02 anchored to that task
- Back → S02

---

## 3. Dashboard

### S08 — Dashboard
**Route:** `/dashboard`
**Purpose:** Read-only operational overview for V + Charan.

**Contents:**
- **Top — three big numbers (KPIs):**
  - Today's completion %: "82% (37 of 45)"
  - Overdue count: "3 overdue"
  - Statutory red+critical: "1 red · 0 critical"
- **System health grid** — one tile per system:
  - Color: green ≥90% / amber 70–89% / red <70% (rolling 7-day completion)
  - Tile shows system name + 7d% + small sparkline
  - Tap → drill-down list of that system's instances (filterable today's view)
- **Statutory dashboard** — every active licence:
  - Bar chart row per licence: bar length = days remaining, color tier
  - Tap → M6 Statutory detail modal
- **30-day completion trend** — sparkline of daily completion %
- **Recent activity feed** — last 50 completions:
  - Helper avatar + "Ravi · FT-014 MGPS oxygen manifold inspection · 09:42"
  - Tap → M5 Photo gallery (read-only)

**Exits:**
- Tap system tile → S02 filtered by system
- Tap statutory bar → M6 Statutory detail
- Tap activity → M5 Photo gallery
- Back → S02

---

## 4. Admin Surfaces (PIN-gated)

### S09 — PIN entry
**Route:** `/admin/pin` (only when admin pages requested without valid session)
**Purpose:** Gate admin surfaces.

**Contents:**
- Logo
- Header: "Admin access"
- Sub-header: "Charan + V only"
- 4-digit PIN keypad (large, centered)
- Dots for entered digits
- Auto-submit on 4th digit
- Wrong PIN: shake animation + "Wrong PIN" red text + audit log entry
- After 5 failures in 1 hour: hard lockout for 1 hour + flag to V's dashboard

**Exits:**
- Correct PIN → S10 Admin home (session valid for 30 min)
- Cancel/back → S02

---

### S10 — Admin home
**Route:** `/admin`
**Purpose:** Hub.

**Contents:**
- Top bar: "Admin · Charan" + session timer pill ("28 min left") + Lock button (forces PIN re-entry)
- Six big tiles (3×2 grid):
  - 📋 **Tasks** (count: 119 active) → S11
  - 📍 **Locations** (47) → S13
  - 🤝 **Vendors** (25) → S15
  - 📜 **Statutory** (12 · 1 red) → S17
  - 📜 **Audit log** (52 changes this month) → S20
  - ⬇⬆ **Import / Export** → S21
- Quick stats card below: "Last edit: Charan · 2 hours ago · FT-008 acceptance criteria updated"

**Exits:**
- Tap tile → respective list/page
- Lock button → S02 (PIN session ended)

---

### S11 — Task templates list
**Route:** `/admin/tasks`
**Purpose:** View/manage task templates.

**Contents:**
- Top: search input + filter chips (system, cadence, actor_type, draft_status, active/inactive)
- Sort dropdown (priority desc, system, cadence, last_modified desc)
- Floating "Add new" FAB (primary blue, bottom-right)
- List rows:
  - task_id badge (FT-001) + active toggle
  - Task name (truncated)
  - System pill + cadence badge + draft_status pill (proposed/confirmed/rejected/amended)
  - "Last edited [X] ago by [name]"
- Pagination (20 per page)
- Top-right utility: "Export CSV" button

**Exits:**
- Tap row → S12 Task edit
- "Add new" → S12 Task edit (empty)
- Toggle active off → M4 Soft-delete confirm
- Export CSV → download triggered, stays on S11

---

### S12 — Task template create/edit
**Route:** `/admin/tasks/[id]` (or `/admin/tasks/new`)
**Purpose:** Add or modify a task template.

**Contents (form layout, scrollable):**
- task_id (auto-generated for new; read-only for existing)
- system (dropdown, locked list from existing systems + "add new")
- subsystem (text)
- location_or_asset (text + dropdown autocomplete from `locations.name`)
- task_name (text, required)
- cadence (dropdown: daily/weekly/monthly/quarterly/semi_annual/annual/statutory_renewal)
- frequency_in_days (auto-suggest from cadence; editable)
- cadence_anchor (text — "every Monday" / "1st of month" / etc.)
- actor_type (dropdown)
- amc_vendor (dropdown from `vendors`, only enabled if actor_type ≠ in_house)
- acceptance_criteria (multi-line text, required)
- evidence_required (dropdown: selfie+photo / selfie+photo+reading / selfie+vendor_report+next_due_date)
- reference_policy (text)
- nabh_standard_ref (text)
- priority_weight (slider 1–100, default 50)
- draft_status (dropdown)
- notes (multi-line text)
- **Audit panel** (collapsible, right side on desktop / below on mobile):
  - "Created by [name] on [date]"
  - History log: every edit with date, name, changed-fields summary
- **Force propagate** option: checkbox "Apply changes to in-flight task instances now" — triggers M3 with PIN re-entry on save

**Bottom action bar:**
- Cancel (returns to S11 without save)
- Soft-delete (only on existing → M4)
- Save

**Exits:**
- Save → audit log entry → S11 with success toast
- Cancel → S11
- Soft-delete → M4 → S11

---

### S13 — Locations list
**Route:** `/admin/locations`
**Purpose:** Manage physical inventory.

**Contents:**
- Same pattern as S11
- Filter chips: system, floor, criticality
- Row shows: asset_id, name, system pill, floor, criticality badge, count, active toggle

**Exits:**
- Tap → S14 Location edit
- "Add new" → S14 (empty)
- Toggle active → M4

---

### S14 — Location create/edit
**Route:** `/admin/locations/[id]`
**Purpose:** Add/edit a location.

**Contents (form):**
- asset_id (auto)
- system, name, floor, sub_location, count, criticality, active, notes
- **Bound tasks panel:** list of templates currently bound to this location; "Add binding" button → picker

**Exits:**
- Save / Cancel / Soft-delete (same pattern)

---

### S15 — Vendors list
**Route:** `/admin/vendors`
**Purpose:** Manage AMC + statutory vendors.

**Contents:**
- Same pattern as S11
- Filter: system, active
- Row: vendor_id, name, system pill, contact_name, phone (tap-to-call), visit_cadence

**Exits:**
- Tap → S16 Vendor edit

---

### S16 — Vendor create/edit
**Route:** `/admin/vendors/[id]`
**Purpose:** Add/edit a vendor.

**Contents (form):**
- All vendor fields
- **Bound tasks panel:** templates referencing this vendor

**Exits:** Save / Cancel / Soft-delete

---

### S17 — Statutory list
**Route:** `/admin/statutory`
**Purpose:** Manage licences with renewal cadence.

**Contents:**
- Sorted by days_to_expiry ASC by default
- Color-coded by tier (red items at top)
- Row shows:
  - licence_id, item, authority
  - current_expiry date (large)
  - Days remaining badge (with color tier)
  - "Renew" button → S19
  - Active toggle
- "Add new" FAB

**Exits:**
- Tap row → S18 Statutory edit
- Tap "Renew" → S19 Statutory renewal
- Add new → S18 (empty)

---

### S18 — Statutory create/edit
**Route:** `/admin/statutory/[id]`
**Purpose:** Add/edit a statutory item.

**Contents (form):**
- All statutory fields
- "Latest certificate" preview (if uploaded) — image preview, replace button
- Renewal history list

**Exits:** Save / Cancel / Soft-delete / "Renew this now" → S19

---

### S19 — Statutory renewal flow
**Route:** `/admin/statutory/[id]/renew`
**Purpose:** Log a renewal event — uploads new certificate, resets expiry tier.

**Contents (focused single-purpose form):**
- Item name (locked, large header)
- Previous expiry (locked, grey)
- **Upload new certificate:** camera or file picker → preview
- **New expiry date** (date picker, required, validates >today)
- Notes (optional)
- Submit / Cancel

**Exits:**
- Submit → updates statutory_items.current_expiry, inserts statutory_renewals row, audit log → S17 with green toast "Renewal logged · 365 days remaining"
- Cancel → S17

---

### S20 — Audit log
**Route:** `/admin/audit`
**Purpose:** Read-only history of admin changes.

**Contents:**
- Filter chips: table_name, action, date range, person
- Timeline list:
  - Timestamp (relative + absolute)
  - "[Charan] [updated] [task_templates] · FT-008"
  - Expandable diff view (before / after for updates)
  - Action color: green=create, blue=update, red=delete, orange=force_propagate, purple=statutory_renew, grey=pin_failure
- "Export CSV" button (for FMS Committee monthly review)

**Exits:**
- Tap row → expand inline diff
- Export → download
- Back → S10

---

### S21 — CSV Import / Export
**Route:** `/admin/import-export`
**Purpose:** Bulk operations.

**Contents (two cards):**
- **Export card:**
  - Dropdown: which entity (Tasks / Locations / Vendors / Statutory)
  - Download button → CSV file
- **Import card:**
  - Entity dropdown
  - File picker
  - Mode toggle: **Merge** (update existing by id, add new) or **Replace** (replace all — destructive, requires PIN re-entry)
  - **Preview table:** parsed rows + diff (rows added, updated, errors)
  - Confirm import button (greyed if any errors)

**Exits:**
- Confirm → applies, audit log entries, S10 with toast "Imported X rows"
- Cancel → S10

---

## 5. Modals

### M1 — Skip reason picker
**Triggered from:** S03
**Contents:**
- Title: "Why skip this task?"
- 4 reason chips: "Not enough staff" · "Area in use" · "Supplies unavailable" · "Other"
- "Other" expands to text field (required if selected)
- Cancel / Confirm buttons

**Exits:**
- Confirm → API call → S03 (task marked skipped, returns to S02 after 1s)
- Cancel → S03

---

### M2 — Release claim confirmation
**Triggered from:** S03 (when claimed by another helper)
**Contents:**
- "Release Ravi's claim?"
- Reason text field (required): "Why? (e.g., Ravi went home, can't reach Ravi)"
- Cancel / Release buttons

**Exits:**
- Release → API call → S03 (task back in pool, anyone can claim)
- Cancel → S03

---

### M3 — Force propagate confirmation
**Triggered from:** S12 (when checking "Apply changes to in-flight")
**Contents:**
- ⚠ Warning: "This will overwrite [N] in-flight task instances with the new criteria."
- Re-enter PIN keypad
- Cancel / Apply

**Exits:**
- Apply (correct PIN) → updates all in-flight, audit log force_propagate event → S12 save flow continues
- Cancel → S12 (checkbox unchecks)

---

### M4 — Soft-delete confirmation
**Triggered from:** S11/S13/S15/S17/S18 (any active toggle off or delete button)
**Contents:**
- "Soft-delete [task name]?"
- Explainer: "This stops generating new instances. Historical records are preserved. Reversible by toggling active back on."
- Cancel / Confirm soft-delete

**Exits:**
- Confirm → audit log entry → list page with toast
- Cancel → list page

---

### M5 — Photo gallery
**Triggered from:** S07 Yesterday recap, S08 Dashboard activity feed, S20 Audit log
**Contents:**
- Full-screen photo viewer
- Selfie + photos in horizontal swipe carousel
- Bottom strip: thumbnails
- Header: task name, completer, timestamp
- Tap to dismiss

---

### M6 — Statutory detail
**Triggered from:** S08 Dashboard
**Contents:**
- Item name + authority
- Current expiry + days remaining + tier
- Latest certificate thumbnail (tap to view full)
- Renewal history list
- "Open in admin" button (gated — requires PIN if not in active admin session) → S18

**Exits:**
- Open in admin → S09 PIN (if needed) → S18
- Tap to dismiss

---

## 6. Connection Map (primary paths)

### Worker happy path
```
S02 → S03 → S04 → S05 → [S05b OR S05c OR direct] → S06 → S02
```

### Skip path
```
S02 → S03 → M1 → S03 → S02
```

### Claim conflict path
```
S02 → S03 (claimed by other) → M2 → S03 → claim flow
```

### Yesterday review path
```
S02 → S07 → M5 (photo gallery) → S07 → S02
```

### Dashboard drill-down
```
S02 → S08 → tap system tile → S02 (filtered)
S02 → S08 → tap statutory bar → M6 → optionally S09 → S18
```

### Admin task edit path
```
S02 → S09 → S10 → S11 → S12 → save → S11 → S10 → S02
```

### Admin force-propagate edit
```
S12 → check "Apply to in-flight" + Save → M3 → S11 (with audit entry)
```

### Statutory renewal path
```
S02 → S09 → S10 → S17 → S19 → S17 (with toast)
```

### CSV bulk update path
```
S02 → S09 → S10 → S21 → preview → confirm → S10
```

---

## 7. Cross-Cutting Concerns

### 7.1 Persistent UI elements
- **Top bar** (worker surfaces): name + avatar + nav icons (Yesterday / Dashboard / Admin)
- **Top bar** (admin surfaces): "Admin · [name]" + session timer + Lock button
- **Bottom safe-area** respected for iPhone notch + Android nav bar

### 7.2 Loading & error states (every screen)
- **Loading:** skeleton cards (not spinners) for lists; centered spinner for forms
- **Error:** red toast at top with retry button; doesn't replace screen content
- **Empty:** illustration + helpful copy + primary action ("No tasks today" / "Add your first vendor")

### 7.3 Offline behaviour
- v1 = WiFi-required. If network drops:
  - Banner: "No connection — actions will retry"
  - Completion uploads queue locally, retry when online
  - Read screens show cached data with "Last updated [X]" stamp

### 7.4 Accessibility
- Tap targets ≥44×44pt
- Contrast ≥WCAG AA
- Text scaling honoured to 200%
- Screen reader labels on all icons
- Keyboard navigation on admin surfaces

### 7.5 Density modes
- Worker surfaces: comfortable density (large cards, big buttons — gloves-friendly)
- Admin surfaces: compact density acceptable on tablet/desktop

---

## 8. Frequency-of-use Map

How often each surface is hit:

| Surface | Worker | Admin | V (read-only) |
|---|---|---|---|
| S02 Today's tasks | many times/day | rare | rare |
| S03 Task detail | several times/day | rare | rare |
| S04–S06 Completion | several times/day | rare | never |
| S07 Yesterday | 1×/day | 1×/week | rare |
| S08 Dashboard | rare | 1×/day | several times/day |
| S09 PIN | never | 1×/day | rare |
| S10–S21 Admin | never | 1–3×/week | rare |
| Modals | per trigger | per trigger | per trigger |

**Implication:** worker surfaces (S02–S07) need fastest, most polished UX. Admin surfaces can be functional and dense; they're used by 1–2 trained people. Dashboard sits between — used daily by 1–2 people.

---

**End of Screen Catalog v1.0**

