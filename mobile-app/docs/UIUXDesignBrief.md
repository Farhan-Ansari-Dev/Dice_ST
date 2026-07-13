# UI/UX Design Brief
## DICE by Sanyog — Mobile Application

**Version:** 1.0.0  
**Date:** June 2025

---

## 1. Design Philosophy

DICE follows a **"Confident & Calm"** design principle:
- **Confident** — Bold typography, clear hierarchy, decisive color choices
- **Calm** — Generous whitespace, smooth animations, no visual clutter
- **Trustworthy** — Professional appearance fitting for a compliance/legal product
- **Intelligent** — AI-first UX with smart defaults and contextual suggestions

---

## 2. Color System

### 2.1 Dark Theme (Primary)

| Token | Hex | Usage |
|---|---|---|
| `bgDark` | `#0A0B0F` | App background |
| `bgCard` | `#12131A` | Card backgrounds |
| `bgCardLight` | `#1C1E2A` | Elevated cards |
| `primary` | `#6C63FF` | CTAs, active states, primary actions |
| `primaryDark` | `#5A52E0` | Pressed primary, gradients |
| `secondary` | `#00D4FF` | Highlights, secondary actions |
| `secondaryDark` | `#00B8E0` | Pressed secondary |
| `success` | `#10B981` | Approved, active, passed |
| `successDark` | `#059669` | Success pressed |
| `warning` | `#F59E0B` | Expiring, pending, caution |
| `warningDark` | `#D97706` | Warning pressed |
| `error` | `#EF4444` | Failed, rejected, alerts |
| `textPrimary` | `#F1F5F9` | Primary text |
| `textSecondary` | `#94A3B8` | Secondary text, subtitles |
| `textTertiary` | `#64748B` | Placeholder, labels |
| `border` | `rgba(255,255,255,0.08)` | Card borders, dividers |

### 2.2 Light Theme

| Token | Hex | Usage |
|---|---|---|
| `bgDark` | `#F0F4FF` | App background |
| `bgCard` | `#FFFFFF` | Card backgrounds |
| `bgCardLight` | `#F7F8FC` | Elevated cards |
| `primary` | `#6C63FF` | Same — consistent brand color |
| `textPrimary` | `#0F172A` | Dark text on light background |
| `textSecondary` | `#64748B` | Secondary text |
| `textTertiary` | `#94A3B8` | Tertiary text |
| `border` | `#E2E8F0` | Card borders |

### 2.3 Gradient Combinations

| Usage | Colors |
|---|---|
| Hero banners, primary cards | `#1A1560` → `#6C63FF` → `#00D4FF` |
| CTA buttons primary | `#6C63FF` → `#5A52E0` |
| Success highlights | `#10B981` → `#059669` |
| Warning highlights | `#F59E0B` → `#D97706` |
| Feature cards (varied) | `#7C3AED` → `#A855F7`, `#0EA5E9` → `#38BDF8` |

---

## 3. Typography

### 3.1 Type Scale

| Name | Size | Weight | Usage |
|---|---|---|---|
| `display` | 32px | 800 | Hero numbers, stats |
| `h1` | 28px | 800 | Screen titles (full page) |
| `h2` | 24px | 800 | Section titles (tab screens) |
| `h3` | 20px | 700 | Card titles, detail headers |
| `h4` | 18px | 700 | Sub-section titles |
| `body` | 15px | 400–500 | Body text, descriptions |
| `small` | 13px | 400–500 | Labels, secondary info |
| `caption` | 11px | 400–600 | Timestamps, metadata, badges |
| `micro` | 9px | 500–600 | Minimum label size (tab icons) |

### 3.2 Font Family
- System font: **SF Pro** (iOS), **Roboto** (Android)
- No custom font loading to minimize bundle size

---

## 4. Spacing System

```
xs  =  4px
sm  =  8px
md  = 12px
base= 16px  ← standard padding
lg  = 20px  ← horizontal screen padding
xl  = 24px
2xl = 32px
3xl = 40px
4xl = 48px
5xl = 64px
```

---

## 5. Border Radius

```
sm   =  6px  — small chips, micro elements
md   = 10px  — buttons, small cards
base = 12px  — standard buttons, back buttons
lg   = 16px  — main cards, modals
xl   = 20px  — hero sections, feature cards
2xl  = 24px  — large modals, sheets
3xl  = 32px  — splash logo card
full = 9999px — pills, badges, tags
```

---

## 6. Component Library

### 6.1 Buttons

| Variant | Background | Use case |
|---|---|---|
| `primary` | `colors.primary` gradient | Main CTA |
| `outline` | Transparent + border | Secondary action |
| `ghost` | Transparent | Tertiary action |
| `danger` | `colors.error` | Destructive action |

Props: `title`, `variant`, `fullWidth`, `icon`, `loading`, `disabled`, `size`

### 6.2 Badge

Variants: `success`, `warning`, `error`, `info`, `primary`, `outline`  
Sizes: `sm`, `md`, `lg`  
Props: `label`, `variant`, `size`, `dot`  

Status → variant mapping:
- `approved` / `active` / `completed` → `success`
- `pending` / `under_review` → `warning`
- `rejected` / `failed` / `expired` → `error`
- `draft` / `new` → `info`

### 6.3 Cards

- All cards use `LinearGradient` for background (dark → slightly lighter)
- `borderRadius: lg (16px)`
- `borderWidth: 1`
- `borderColor: rgba(255,255,255,0.06)` (dark) / `colors.border` (light)
- Shadow: `Shadows.sm` applied to the container View

### 6.4 Avatar

- Shows initials if no URI
- `online` prop adds green dot indicator
- Sizes: `sm (32)`, `md (40)`, `lg (52)`, `xl (72)`

### 6.5 ProgressBar

- Height: configurable (default 6px)
- Color: `colors.primary`
- Animated fill
- Used in application cards and detail screens

### 6.6 Timeline

- Vertical connector line
- States: `completed` (filled dot + primary color), `current` (pulsing), `upcoming` (outlined)
- Date shown for completed/current

### 6.7 NotificationBell

- Bell icon with badge counter
- Badge: red circle, `9+` for > 9 unread
- Sourced from `useNotificationStore`

### 6.8 AIWidget

- Gradient background with sparkle icon
- Used for AI-powered features callout

---

## 7. Screen Layout Patterns

### 7.1 Standard Screen

```
SafeAreaView
├── LinearGradient (absoluteFill background)
├── Header (paddingHorizontal: 20, paddingVertical: 12)
│     ├── Back / Menu button (40×40, borderRadius: 12)
│     ├── Title + Subtitle (flex: 1)
│     └── Action button (40×40)
├── Filter chips (horizontal ScrollView, height: 56)
└── ScrollView (contentPadding: 20, paddingTop: 16)
      └── Cards, lists, etc.
```

### 7.2 Detail Screen

```
SafeAreaView
├── LinearGradient background
├── Header (back + title + badge)
├── Hero section (gradient card with key metrics)
├── ProgressBar (horizontal, margin: 20)
├── Tab bar (horizontal scroll)
└── ScrollView
      └── Tab content (cards)
```

### 7.3 Tab Screens (Main Nav)

```
SafeAreaView
├── Header
│     ├── [≡ menu] aligned to title top
│     ├── Title (24px, 800) + Subtitle (13px, secondary)
│     └── Action icons (right)
├── Search bar
├── Filter chips
└── Content list
```

---

## 8. Animation Principles

| Animation | Type | Duration |
|---|---|---|
| Screen transition | Native stack (slide) | 250ms |
| Card expand/collapse | `LayoutAnimation.easeInEaseOut` | 300ms |
| Splash logo in | Spring (tension: 50, friction: 7) | ~400ms |
| Splash tagline in | Timing + translateY | 380ms |
| Button press | `activeOpacity: 0.7` | Instant |
| Tab switch | Immediate | 0ms |
| Pull to refresh | Native spinner | — |

---

## 9. Dark / Light Mode Guidelines

- All colors sourced from `useTheme()` — never hardcoded except pure white `#FFFFFF` on gradient overlays
- Card backgrounds: `LinearGradient` with theme-aware colors
- Borders: `rgba(255,255,255,0.06)` in dark / `colors.border` in light
- Text always from `colors.textPrimary` / `textSecondary` / `textTertiary`
- Status bar: `light-content` in dark / `dark-content` in light (via `ThemedStatusBar`)

---

## 10. Navigation UI

### Bottom Tab Bar
- 5 tabs: Home, Certifications, Applications, Insights, Profile
- Active tab: `colors.primary` icon + label
- Inactive: `colors.textTertiary`
- Badge: red circle (Applications, Insights) showing unread count
- Tab bar background: blurred/frosted glass effect in iOS 26

### Drawer
- Opens from left (swipe or avatar tap on Home / hamburger on other screens)
- Contains: Profile summary, main navigation, settings links, logout

---

## 11. Empty States

Each empty state should have:
1. Centered illustration or icon (48–64px, `colors.textTertiary`)
2. Title: 16px, 600 weight
3. Subtitle: 13px, secondary color
4. Optional CTA button

Examples:
- No applications: "No applications yet" + "Start your first application" button
- No certifications: "Add your first certificate"
- No insights: "Nothing new today — check back later"

---

## 12. Accessibility

- Minimum touch target: **44×44pt**
- All interactive elements: `accessibilityRole` + `accessibilityLabel`
- Color contrast: minimum 4.5:1 for text
- Font scaling: supports Dynamic Type (iOS) / Font Scale (Android)
- No color-only status indicators — always paired with text or icon
