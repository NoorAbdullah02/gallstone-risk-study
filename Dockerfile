# Multi-stage build: compile the Next.js static export, then serve it (plus
# the API) from a single Python/FastAPI image — one Render service for both.

FROM node:22-slim AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# No NEXT_PUBLIC_API_BASE set here on purpose: lib/api.ts defaults to ""
# (same-origin), which is correct once the backend also serves this build.
RUN npm run build

FROM python:3.12-slim AS backend
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY model/ ./model/
COPY --from=frontend-build /app/frontend/out ./frontend/out

EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
