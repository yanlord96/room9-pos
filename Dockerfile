# ── Stage 1: Build React SPA ──────────────────────────────────────────────────
FROM node:20-alpine AS web-builder

WORKDIR /web
COPY web/package.json ./
RUN npm install
COPY web/ ./
RUN npm run build

# ── Stage 2: Build Go binary ──────────────────────────────────────────────────
FROM golang:1.21-alpine AS go-builder

WORKDIR /app
COPY go.mod ./
RUN go mod tidy || true
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o room9 ./cmd/main.go

# ── Stage 3: Runtime ──────────────────────────────────────────────────────────
FROM alpine:3.19

RUN apk add --no-cache tzdata ca-certificates

WORKDIR /app
COPY --from=go-builder /app/room9 .
COPY --from=web-builder /web/dist ./web/dist

RUN mkdir -p /data

EXPOSE 8080
ENV PORT=8080
ENV DB_PATH=/data/room9.db
ENV DIST_DIR=/app/web/dist
ENV GIN_MODE=release

CMD ["./room9"]
