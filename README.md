# Stags

Interactive itinerary sites for two stag trips — Barcelona (3–7 June 2026) and Stockholm (11–14 June 2026).

## Stack

- **Web** — React + TypeScript + Vite, hosted on GitHub Pages
- **API** — PocketBase (single binary, SQLite, realtime), hosted on Railway

## Local development

### Start PocketBase

```powershell
cd pocketbase
./pocketbase.exe serve
```

Runs at `http://127.0.0.1:8090`. Open `/_/` to access the admin UI.

### Start the web app

```powershell
cd web
npm install
npm run dev
```

Runs at `http://localhost:5173`. Set `VITE_PB_URL` in `web/.env.local` to point at your PocketBase instance.

### Run tests

```powershell
cd web
npm run test
```

## Deployment

- **Web**: pushing to `main` triggers `.github/workflows/deploy-web.yml`, which builds and publishes to GitHub Pages. Set the `VITE_PB_URL` secret in repo settings.
- **API**: Railway watches the repo and rebuilds `pocketbase/Dockerfile` on push. Mount a persistent volume at `/pb/pb_data` so the SQLite file survives redeploys.

## After first deploy

1. Visit `https://<railway-url>/_/` and create the admin account
2. Collections → users → set the passphrases for `bcn-editor@stags.local` and `sthlm-editor@stags.local`
3. Share the GitHub Pages URL (`https://<user>.github.io/stags/bcn/` or `/sthlm/`) and the passphrase with the lads

## Editing the schedule

Either:
- Use the in-app edit mode (click Edit, enter passphrase)
- Or use the PocketBase admin UI directly at `/_/`
