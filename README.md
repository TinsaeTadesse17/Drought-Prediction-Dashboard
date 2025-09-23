## Drought Prediction Dashboard

Next.js 15 App Router dashboard with NextAuth credentials auth, Leaflet map, Recharts, Tailwind/shadcn, and a normalized predictions API.

### Requirements
- Node 18+
- Env vars in `.env`:
	- `NEXTAUTH_URL` (e.g. `http://localhost:3000`)
	- `NEXTAUTH_SECRET` (any strong random string)
	- Optional: `PREDICTIONS_API_URL` for upstream proxy

### Dev
```bash
npm install
npm run dev
```
App at `http://localhost:3000`. Default route requires login (`/auth/login`).

### Build
```bash
npm run build
```

### Run (production)
Two options:
1) Standard server
```bash
npm start -w
```
2) Standalone output
```bash
npm run build
npm run start:standalone
```

### Docker
Build and run using the provided Dockerfile (standalone mode):
```bash
docker build -t deep-dashboard .
docker run --rm -p 3000:3000 ^
	-e NEXTAUTH_URL=http://localhost:3000 ^
	-e NEXTAUTH_SECRET=replace-with-strong-secret ^
	deep-dashboard
```

### Deploy to Render
This repo includes `render.yaml` for Docker deploy. Configure environment variables in the Render dashboard:
- `NEXTAUTH_URL` (Render URL)
- `NEXTAUTH_SECRET` (generate)
- Optional: `PREDICTIONS_API_URL`

### API shape (normalized)
`GET /api/predictions?region=afar&woreda=Bidu` →
```json
{
	"region": "afar",
	"woreda_name": "Bidu",
	"aggregated_prediction": [ /* ... */ ]
}
```

### Auth
NextAuth Credentials with email-only demo users. Session contains `role`, `region`, and optional `woreda`.

### Troubleshooting
- Non-standard `NODE_ENV` can confuse Next.js. Ensure `NODE_ENV=production` in production.
- For standalone builds, prefer `node .next/standalone/server.js` or the Dockerfile provided.
