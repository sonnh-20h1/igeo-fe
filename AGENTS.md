<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Notes

- This project uses Next.js App Router under `src/app`; route files should stay thin and delegate UI to `src/components` and domain logic to `src/features`.
- i18n is dictionary-based via `src/features/i18n/provider.tsx` and `src/features/i18n/dictionaries.ts`. Do not add `locale === 'en'` / `isEnglish` branches in components; add dictionary keys and use `formatMessage` for dynamic text.
- Auth is split against `igeo-be`:
  - Admin: `POST /admin/auth/sign-in`, `GET /admin/auth/refresh`, `GET /admin/auth/me`
  - User: `POST /user/auth/sign-in`, `GET /user/auth/refresh`, `GET /user/auth/me`, `GET|PATCH /user/account`, `PATCH /user/account/password`
- After login:
  - Admin → `/admin/dashboard` + `/admin/users` + `/admin/questions`
  - User → `/dashboard` + `/profile`
- Question bank admin API: `GET|POST /admin/questions`, `GET|PATCH|DELETE /admin/questions/:id`, `GET /admin/questions/import/template`, `POST /admin/questions/import`
- Keep source clean with `yarn lint` and `npx tsc --noEmit` before handing off.
