# Hourly Halo

Freelancer time tracking and invoicing app. Stack: Vite + React 18 + TypeScript + Tailwind CSS + Shadcn/ui + Supabase.

## Planned Improvements

### Fix broken/missing features first
- [x] **Timer rounding** — already implemented in `useRunningTimer.tsx`
- [ ] **Password reset flow** — no way for users to recover their account
- [ ] **Idle detection prompt** — `activity_prompt_minutes` is in settings/DB but never fires

### Growth & retention
- [ ] **Google/GitHub OAuth** — reduces signup friction
- [ ] **Onboarding flow** — first-time users land on empty dashboard; add a setup wizard (add first client → start timer)
- [ ] **Invoice due dates + overdue reminders** — invoices currently have no due date field

### Power user features
- [ ] **Bulk operations on time entries** — select multiple entries to delete, mark billable/unbillable, or assign to a project
- [ ] **Recurring time entry templates** — freelancers often log the same work weekly
- [ ] **Payment tracking** — record payment date/method when marking an invoice paid
- [ ] **Timezone preference** — user-configurable timezone setting

### Polish
- [ ] **Empty states** — pages with no data should show a helpful prompt, not a blank table
- [ ] **Mobile timer experience** — ensure timer works well as PWA on mobile
