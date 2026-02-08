# Innopark

Attendance and RMA (Rapport Mensuel d'Activit&eacute;) management platform for Swiss reintegration centers.

## Features

- **Attendance tracking** — Simplified form with date, location (Lausanne, Fribourg, Geneva), and presence selection (morning, afternoon, whole day)
- **RMA management** — Monthly activity reports with calendar grid, mandate details, absence tracking, and feedback
- **Review workflow** — Staff can approve or request revisions; participants can edit and resubmit approved RMAs
- **Reconciliation** — Compare RMA entries against actual attendance records
- **Multi-language** — French, English, and German (FR/EN/DE)
- **Role-based access** — Admin, Center Staff, and Participant roles

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Validation**: Zod

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database

### Installation

```bash
npm install
```

### Environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

### Database

```bash
npx prisma db push
npx prisma db seed
```

### Development

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
  app/
    (auth)/          # Login, registration pages
    (dashboard)/     # Main app pages
      attendance/    # Attendance tracking
      dashboard/     # Home dashboards (admin/staff/participant)
      rma/           # RMA form, history
      admin/         # Admin views (participants, reconciliation, reports, holidays)
    api/             # API routes
  components/        # Shared components (sidebar, topbar, UI primitives)
  lib/               # Auth, Prisma client, i18n, validations, utilities
prisma/
  schema.prisma      # Database schema
```
