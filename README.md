# POS Application

Aplikasi Point of Sale dengan React + Express + Neon PostgreSQL.

## Deployment dengan Docker (Hostinger)

### 1. Siapkan Environment Variables

Copy `.env.example` ke `.env` dan isi dengan DATABASE_URL dari Neon:

```bash
cp .env.example .env
```

Edit `.env`:
```
DATABASE_URL=postgresql://username:password@your-host.neon.tech/neondb?sslmode=require
```

### 2. Build dan Jalankan dengan Docker Compose

```bash
# Build image
docker-compose build

# Jalankan container
docker-compose up -d
```

Aplikasi akan berjalan di `http://localhost:3001`

### 3. Inisialisasi Database

Setelah container berjalan, akses endpoint untuk membuat tabel:

```bash
curl -X POST http://localhost:3001/api/init-db
```

### Perintah Docker Lainnya

```bash
# Lihat logs
docker-compose logs -f

# Stop container
docker-compose down

# Rebuild setelah perubahan
docker-compose up -d --build
```

## Development Lokal

```bash
# Install dependencies
npm install

# Jalankan frontend (development)
npm run dev

# Jalankan server (di terminal terpisah)
DATABASE_URL=your_connection_string npx ts-node server/index.ts
```

## Struktur Folder

```
├── src/                  # Frontend React
├── server/               # Backend Express
│   └── index.ts          # API server
├── Dockerfile            # Docker build
├── docker-compose.yml    # Docker orchestration
└── dist/                 # Built frontend (generated)
```

---

## Original Lovable Info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

### Technologies

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Express.js (backend)
- PostgreSQL (Neon)
