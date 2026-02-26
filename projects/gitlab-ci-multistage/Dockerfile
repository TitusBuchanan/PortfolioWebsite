# ============================================================
# Stage 1: Base — shared runtime dependencies
# ============================================================
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# ============================================================
# Stage 2: Dependencies — install Python packages
# ============================================================
FROM base AS deps

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --prefix=/install -r requirements.txt

# ============================================================
# Stage 3: Test — run linting and tests (CI-only target)
# ============================================================
FROM deps AS test

COPY requirements-dev.txt ./
RUN pip install -r requirements-dev.txt

COPY . .

RUN ruff check src/ tests/ && \
    pytest tests/unit/ -v --tb=short

# ============================================================
# Stage 4: Production — minimal runtime image
# ============================================================
FROM base AS production

LABEL maintainer="platform-team@example.com"
LABEL org.opencontainers.image.source="https://github.com/org/gitlab-fastapi-app"

COPY --from=deps /install /usr/local

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

COPY src/ ./src/
COPY alembic/ ./alembic/
COPY alembic.ini ./

RUN chown -R appuser:appuser /app

USER appuser

ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
