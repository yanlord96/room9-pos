# Room 9 POS — Development Guide

## Tech Stack
- **Backend**: Go + Gin + SQLite
- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Deploy**: Docker + Docker Hub + Biznet GIO VPS

---

## 1. Development Workflow

### 1.1 Mulai fitur baru — buat branch

```bash
# Pastikan main sudah up to date
git checkout main
git pull origin main

# Buat branch baru
git checkout -b feature/nama-fitur
```

Contoh nama branch:
- `feature/member-loyalty`
- `feature/discount`
- `fix/timer-bug`
- `hotfix/login-error`

### 1.2 Jalankan di lokal

```bash
cd /path/to/room9
docker-compose up --build
```

Akses di: `http://localhost:8080`

> **Catatan:** Setiap ada perubahan code, restart docker-compose dengan `--build`.

### 1.3 Commit perubahan

```bash
git add web/src/pages/NamaFile.tsx internal/handlers/nama.go
git commit -m "feat: deskripsi singkat perubahan"
```

Prefix commit:
- `feat:` — fitur baru
- `fix:` — bug fix
- `refactor:` — refactor tanpa fitur baru
- `style:` — perubahan UI/CSS
- `docs:` — dokumentasi

---

## 2. Buat Pull Request

### 2.1 Push branch ke GitHub

```bash
git push -u origin feature/nama-fitur
```

### 2.2 Buat PR di GitHub

Buka link yang muncul di terminal setelah push, atau buka manual:

```
https://github.com/yanlord96/room9-pos/pull/new/feature/nama-fitur
```

Isi PR:
- **Title**: singkat dan jelas, contoh: `Add member loyalty system`
- **Description**: apa yang diubah, cara test

### 2.3 Review & Merge

1. Review perubahan di GitHub
2. Klik **Rebase and merge**
3. Hapus branch setelah merge (opsional)

---

## 3. Deploy ke Docker Hub

Jalankan di lokal setelah PR di-merge ke main:

```bash
# Pindah ke main dan pull perubahan terbaru
git checkout main
git pull origin main

# Build Docker image
docker build -t yanlord20/room9-pos .

# Push ke Docker Hub
docker push yanlord20/room9-pos
```

> **Pastikan sudah login Docker Hub:**
> ```bash
> docker login
> ```

---

## 4. Deploy ke VPS

Buka Console Biznet GIO, lalu jalankan:

```bash
cd ~/room9-pos

# Pull image terbaru dari Docker Hub
sudo docker-compose pull

# Restart container dengan image terbaru
sudo docker-compose up -d
```

Cek container berjalan:
```bash
sudo docker ps
```

Cek log:
```bash
sudo docker logs room9-pos
```

Akses app di: `http://103.103.22.89:8080`

---

## 5. Ringkasan Alur Lengkap

```
buat branch → development → commit → push → PR → rebase merge
     ↓
git pull main → docker build → docker push
     ↓
VPS: docker-compose pull → docker-compose up -d
```

---

## 6. Default Credentials

| Role  | Username | Password  |
|-------|----------|-----------|
| Admin | admin    | admin123  |
| Staff | staff    | admin123  |

> Ganti password setelah deploy pertama kali via halaman **Users**.

---

## 7. Info Server

| Info        | Value                    |
|-------------|--------------------------|
| VPS IP      | 103.103.22.89            |
| Port        | 8080                     |
| App URL     | http://103.103.22.89:8080 |
| DB Path     | ~/room9-pos/data/room9.db |
| Docker Hub  | yanlord20/room9-pos      |
| GitHub      | yanlord96/room9-pos      |
