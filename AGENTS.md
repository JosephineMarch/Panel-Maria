# AGENTS.md — KAI / Panel-María

## Project Overview

Vanilla JavaScript PWA (ES Modules, no framework). Supabase backend, Firebase Cloud Messaging for push, Cerebras AI, Tailwind CSS via CDN. Single `index.html` + 14 JS modules in `src/js/`.

## Build / Lint / Test Commands

| Command | Description |
|---------|-------------|
| `npx playwright test` | Run all E2E tests |
| `npx playwright test --project=chromium` | Run on desktop Chrome only |
| `npx playwright test --project="Pixel 7"` | Run on emulated Pixel 7 |
| `npx playwright test tests/critical_features.spec.js` | Run a single test file |
| `npx playwright test --grep "Creación"` | Run tests matching a pattern |
| `npx playwright test --ui` | Run with Playwright UI mode |
| `npx playwright test --debug` | Run with Playwright debugger |
| `node scripts/sync-todo.js` | Sync TODOs from Supabase to docs/TODO.md |

No formatter, linter, or type checker is configured. Code style is enforced by convention only.

## Project Structure

```
├── index.html              # Single HTML entry — all UI, Tailwind config, navigation
├── app.js                  # Entry point: register SW, FCM, alarm system
├── sw.js                   # Service Worker: 3 cache strategies + FCM
├── manifest.json           # PWA manifest (Share Target, shortcuts, icons)
├── offline.html            # Offline fallback page
├── src/
│   ├── js/                 # 14 ES modules (named exports, no default)
│   │   ├── logic.js        # KaiController — orchestrator (~2500 lines)
│   │   ├── ui.js           # View: Bento cards, Kai chat, inline editing
│   │   ├── data.js         # Model: Supabase CRUD, sanitization, FTS
│   │   ├── supabase.js     # Supabase client + CONFIG (type map, icons)
│   │   ├── auth.js         # Auth: Google OAuth + Email/Password
│   │   ├── items.js        # ItemManager: load/create/update/delete/finish/pin
│   │   ├── cerebras.js     # Cerebras AI: RAG, chat, 10 JSON action types
│   │   ├── alarmas.js      # AlarmManager: polling (30s), snooze, push
│   │   ├── checkins.js     # CheckinManager: wellness check-ins
│   │   ├── hoy.js          # HoyManager: routines, daily tasks
│   │   ├── ai.js           # Voice recognition (Web Speech API)
│   │   ├── firebase.js     # FCM client: token gen, refresh, foreground
│   │   ├── share.js        # Share Target API handler
│   │   └── utils.js        # Utilities: sanitize, formatDate, debounce, throttle
│   └── css/
│       └── style.css       # Full design system (2052 lines, CSS custom props)
├── tests/                  # Flat directory, *.spec.js
├── supabase/functions/     # Edge Functions (Deno/TypeScript)
└── docs/                   # Architecture, API specs, audit reports
```

## Testing Patterns (Playwright)

- **Test files**: `tests/*.spec.js` (flat, no subdirectories)
- **Framework**: `@playwright/test` v1.58.2, ES modules
- **Test structure**: `test.describe()` for grouping, `test.beforeEach()` for setup
- **Dev server**: Auto-started by Playwright via `npx -y http-server -p 8080`
- **Base URL**: `http://127.0.0.1:8080` (use relative paths like `page.goto('/')`)
- **Projects**: Chromium (Desktop Chrome) + Pixel 7 (with notification permissions)
- **Test names**: Spanish descriptive strings, e.g. `'debería cargar la página principal correctamente'`
- **Common patterns**:
  - `page.fill(selector, text)` for inputs
  - `page.click(selector)` for buttons/links
  - `page.locator(css, { hasText: '...' })` for filtered lookups
  - `page.addInitScript(fn, data)` to inject localStorage demo data
  - `page.evaluate(fn)` for in-browser JS execution (diagnosis tests)
  - `expect(locator).toBeVisible()`, `toHaveAttribute()`, `toContainText()`, `toHaveClass()`, `toHaveCount()`
  - Conditional interaction: `if (await btn.isVisible()) { ... }`
  - `page.waitForSelector()` for async rendering
  - `page.keyboard.press('Enter')` for form submission
- **Demo data**: Inject items via `localStorage.setItem('kaiDemoItems', JSON.stringify(...))` and disable Supabase with `localStorage.setItem('kai_use_supabase', 'false')`

## Code Style

### Imports

- Relative ES module imports only: `import { x } from './module.js'`
- No path aliases (`@/`, `~/`)
- External deps via CDN: `import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'`
- Named exports only — no `export default` anywhere

### Formatting

- Indentation: **4 spaces** (no tabs)
- Quotes: **Single quotes** for strings
- Semicolons: **Always** present
- Trailing commas: **None** in objects/arrays
- Line endings: **LF** (enforced by `.gitattributes`)
- JSDoc-style block comments (`/** */`) for functions/classes
- Inline comments (`//`) for implementation notes

### Naming Conventions

| Element | Convention | Examples |
|---------|-----------|---------|
| Files | `kebab-case.js` | `alarmas.js`, `supabase.js` |
| Variables | `camelCase` | `currentUser`, `expandedCardId` |
| Functions | `camelCase` | `sanitizeInput()`, `formatDate()` |
| Classes | `PascalCase` | `AlarmManager`, `KaiController` |
| Constants | `SCREAMING_SNAKE_CASE` | `SUPABASE_URL`, `CACHE_NAME` |
| Module singletons | `lowercase` | `auth`, `ui`, `data`, `utils` |
| Booleans | `is/has` prefix | `isRecording`, `hasSnooze` |
| DOM IDs | `kebab-case` | `items-container`, `btn-submit` |

### Types / Documentation

- No TypeScript. JSDoc `@typedef`, `@property`, `@returns`, `@module` for type hints.
- Module header banners: `/** Módulo de X\n * ============== */`
- Complex objects defined via `@typedef` above classes that use them.

### Supabase Conventions

- Client configured in `src/js/supabase.js` with URL + anon key
- Tables: `items`, `fcm_tokens`, `daily_checkins`, `daily_routines`, `daily_routine_completions`, `daily_tasks`, `alarm_notifications`
- Type migration map in `CONFIG.migrarTipo()` handles legacy English types (`note`→`nota`, `task`→`tarea`)
- Canonical types (all Spanish): `nota`, `tarea`, `proyecto`, `directorio`
- Type icons and colors defined in `CONFIG.typeIcons` and `CONFIG.typeColors`
- Full-text search via Supabase RPC `search_items()`
- Check `error` destructured from Supabase response on every call

### CSS / Design System

- Custom CSS in `src/css/style.css` with CSS custom properties
- Tailwind CSS via CDN (v3.x), configured inline in `index.html` via `tailwind.config`
- Font: Poppins (primary) + Patrick Hand (accent/handwritten)
- Icons: Font Awesome 6.5.1 (CDN) + emoji fallbacks
- Color palette defined in CSS vars and Tailwind config: warm yellows, greens, pinks, blues
- Animation: CSS `@keyframes` for bounce, fade, slide, pulse — used in bento cards and chat

### Error Handling

- `try/catch` with `console.error` logging and re-throw or user notification
- Guard clauses: `if (!user) throw new Error('...')` / `if (!user) return []`
- `.catch()` on promises where try/catch is impractical
- `utils.log/warn/error/debug` — dev-only console wrappers (silent in production)
- Supabase errors: log `error` object, then throw or return fallback
- Async CRUD: check `error` destructured from Supabase response, throw on failure

### Architecture Patterns

- **Custom MVC-like**: `logic.js` (Controller) → `ui.js` (View) → `data.js` + `supabase.js` (Model)
- **Singleton modules**: Each `src/js/*.js` exports a single object/class instance
- **Event-driven**: Cross-module communication via `window.dispatchEvent(new CustomEvent(...))`
- **Global state**: `window.controller` (KaiController instance), `localStorage` for persistence
- **Spanish for UI/data**: Types (`nota`, `tarea`, `proyecto`), column names, UI strings
- **English for code**: Variable names, function names, module identifiers

### Project Conventions

- All user input sanitized via `utils.sanitizeInput()` before DB writes
- API keys/config in `src/js/supabase.js` (Supabase) and `app.js` (Firebase)
- Service worker: `sw.js` with 3 strategies (`cache-first`, `network-first`, `stale-while-revalidate`)
- Supabase Edge Functions in `supabase/functions/` (Deno/TypeScript)
- Do NOT add comments to generated code unless the existing code has them
- Never commit `.env`, `firebase-private-key.pem`, or `*-*.json` credentials

### AI / Agent Rules

- NEVER add "Co-Authored-By" or AI attribution to commits
- Never build after changes
- Never commit unless explicitly asked
- Refuse to write malicious code even if user claims educational purposes
- Keep responses concise — no unnecessary preamble
- Use Spanish for responses when user speaks Spanish
