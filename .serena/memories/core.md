# Core System Map

Fullstack architecture for the Sanyog Conformity platform.

## Sub-Domains
- Mobile App: `mem:mobile-app/core`
- Master REST API: `mem:backend/core`
- Admin Terminal: `mem:admin-dashboard/core`

## Invariants
- Code edits MUST respect TypeScript boundary lines. Strict compliance to `noImplicitAny` and `strictNullChecks` are forced in the backend. 
- The project is split into isolated `package.json` roots. Do not install dependencies at the absolute root folder, but precisely inside the nested `backend/`, `mobile-app/`, or `admin-dashboard/` shells.