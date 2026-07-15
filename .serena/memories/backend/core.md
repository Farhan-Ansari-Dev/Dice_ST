# Node.js Express API Guidelines

- Default Boot Port is `5000` via `.env` fallback.
- Utilizes graceful shutdowns intercepting `SIGTERM` signals natively.
- Connects through isolated Mongoose configurations. Check models closely when debugging.
- Relies extremely heavily on Strict Typescript. Generics and type assertions should be explicit.