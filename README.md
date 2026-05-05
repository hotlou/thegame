# TheGame

College D-I 2026 #TheGame pick'em app for Ultiworld.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, `AUTH_SECRET`, and email settings.
3. Install dependencies with `npm install`.
4. Run `npm run db:migrate`.
5. Seed a starter event with `npm run db:seed`.
6. Start the app with `npm run dev`.

The default seed creates a College D-I 2026 event and a small set of sample teams, bonus questions, and games so the UI can be exercised locally.

When using a shared Neon database, keep TheGame isolated in its own Postgres schema by adding `schema=thegame` to `DATABASE_URL`. For example, if Neon gives you a URL with existing query params, append `&schema=thegame`; otherwise append `?schema=thegame`.

Vercel dashboard values should be entered without shell-style outer quotes. Use `ADMIN_EMAILS=hotlou@gmail.com,ob@unbenchable.com` and `AUTH_EMAIL_FROM=The Game via Unbenchable <ob@unbenchable.com>`.

## Scripts

- `npm run dev` - start Next.js in development mode
- `npm run build` - build the app
- `npm run lint` - run ESLint
- `npm run test` - run Vitest
- `npm run db:migrate` - apply Prisma migrations using `.env.local`
- `npm run db:seed` - seed local starter data
