# Coding Conventions

- Types over interfaces unless classes are utilized natively.
- Export all components natively instead of default-exporting closures inline.
- Maintain error boundary wrappers inside controllers (e.g., Express asynchronous wrappers) instead of dropping logic.
- Admin dashboard logic is reliant globally on `zustand`—avoid bleeding React Context API everywhere.