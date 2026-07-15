# General Commands & Dev Scripts

## Environment Controls
- `npx expo start -c` : Clear cache and run Metro bundler for React Native (`mobile-app`).
- `npm run dev` : Spin up Vite server for admin panel (`admin-dashboard`).
- `npm run dev` : Boot ts-node Express server (`backend`).

## Type Verification
- Always execute `npx tsc --noEmit` within module subdirectories to verify codebase logic before deployment or massive file modifications.