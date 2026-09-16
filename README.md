# NearNest

A property listing app for browsing, searching, and saving homes — built with Expo Router, Clerk, and Supabase.

Buyers browse featured and recent listings, filter by type and price, view a property's photos and location on a map, and save the ones they like. Admins get an extra tab for publishing new listings with photos and coordinates.

## Stack

| Layer | Choice |
|---|---|
| Runtime | Expo SDK 57, React Native 0.86, React 19.2 |
| Routing | `expo-router` (file-based, typed routes) |
| Auth | Clerk (`@clerk/expo`) with `expo-secure-store` token cache |
| Data & storage | Supabase (Postgres + Storage) |
| Styling | NativeWind 4 / Tailwind 3, Rubik via `@expo-google-fonts` |
| State | Zustand |

React Compiler is enabled via `experiments.reactCompiler` in `app.json`.

## Getting started

**Prerequisites:** Node 20+, a Clerk application, and a Supabase project.

```bash
git clone https://github.com/danial2910/NearNest.git
cd NearNest
npm install
```

Copy the environment template and fill it in:

```bash
cp .env.example .env
```

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=<anon key>
SUPABASE_DATABASE_PASSWORD=
```

Then run it:

```bash
npm start        # Expo dev server
npm run ios      # iOS simulator
npm run android  # Android emulator
```

Native modules (`expo-location`, `expo-image-picker`, `expo-secure-store`) mean this needs a development build — Expo Go won't work.

## Backend setup

The app expects three tables and one storage bucket in Supabase.

**`users`** — synced from Clerk on first sign-in by `hooks/useUserSync.tsx`
`clerk_id`, `email`, `first_name`, `last_name`, `avatar_url`, `is_admin`

**`properties`**
`id`, `title`, `description`, `price`, `type`, `bedrooms`, `bathrooms`, `area_sqft`, `address`, `city`, `latitude`, `longitude`, `images` (text array), `is_featured`, `is_sold`, `created_at`

**`saved_properties`** — join table
`id`, `user_clerk_id`, `property_id`

**Storage:** a public bucket named `property-images`.

Clerk is wired to Supabase through the `accessToken` option in `lib/supabase.ts`, so the Clerk session JWT reaches Postgres and your RLS policies can read it. Write policies on `properties` should be gated on `is_admin`.

### Granting admin

`is_admin` defaults to false. Flip it directly in Supabase for your own user:

```sql
update users set is_admin = true where email = 'you@example.com';
```

The Add Property tab is hidden for everyone else — on iOS the trigger isn't rendered, on Android `href` is set to `null`.

## Project layout

```
src/app/
  (auth)/              sign-in, sign-up
  (root)/
    (tabs)/            index · search · create · saved · profile
    property/[id]      detail view
    property/map       map view
    support            help screen
components/            FeaturedCard, PropertyCard, FilterModal
hooks/                 useSupabase, useUserSync, useSavedProperty
lib/                   supabase, theme, contact, utils
store/                 userStore (isAdmin), filterStore
types/                 shared Property type
```

## Design system

Two sources define the visual language, and both matter:

- **`tailwind.config.js`** — `primary` (`#0E4D92`), `accent`, and the Rubik family aliased as `font-rubik`, `font-rubik-medium`, `font-rubik-semibold`, `font-rubik-bold`. The aliases exist so they don't collide with Tailwind's own `font-bold` / `font-semibold` weight utilities, which would otherwise win the prefix and silently drop Rubik.
- **`lib/theme.ts`** — the same palette as raw values, for props that can't take a `className` (icon colors, shadows, `RefreshControl`). Import from here rather than inlining a hex.

Navigation is platform-split by design: iOS uses `NativeTabs` with SF Symbols, Android uses the JS `Tabs` with Ionicons. See `src/app/(root)/(tabs)/_layout.tsx`.

## Notes for contributors

A few things that are easy to get wrong in this codebase:

- **Supabase Storage uploads must use `ArrayBuffer`.** `Blob`, `File`, and `FormData` do not work on React Native — `storage-js` documents this in its own source. Pick images with `base64: true` and decode to a `Uint8Array` before calling `.upload()`. See `uploadPhoto` in `create.tsx`.
- **Use `font-rubik-*`, not `font-bold`.** The bare weight utilities render in the system face, which looks fine in isolation and wrong next to every other screen.
- **The app is locked to light mode** (`userInterfaceStyle: "light"`) and portrait in `app.json`. Dark mode is not implemented.

## Status

Working: auth, listing browse and search with filters, property detail, map, save/unsave, profile with avatar upload, and admin listing creation.

Known gaps: no dark mode; photos upload at full capture resolution rather than being downscaled first; no draft persistence on the create form.

## License

`LICENSE` is currently the unmodified MIT file from `create-expo-app` (copyright Expo). Replace it before treating this repo as licensed.
