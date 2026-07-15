# Mobile App Guidelines

- Boot environment: `mobile-app/` folder running Expo caching.
- Navigation structure integrates `MainTabs` as the root wrapper with encapsulated stack navigators. Deep links map into this structure.
- Flatlists and VirtualizedLists *cannot* be nested within vertical ScrollViews.
- The UI follows a strict dark/light palette configuration tied to `./src/theme`.