FROM python:3.14.7-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev jpeg-dev zlib-dev

COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir=/wheels -r requirements.txt

FROM python:3.14.7-alpine AS base

WORKDIR /app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --find-links=/wheels /wheels/* && rm -rf /wheels

COPY build.py gallery.py VERSION /app/
COPY ./src/ ./src/
COPY ./config /app/default
COPY ./docker/.sh/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

FROM base AS test

COPY requirements.txt requirements-dev.txt pytest.ini /app/
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY ./tests/ ./tests/
COPY ./demo/ ./demo/

FROM base AS lint

RUN pip install --no-cache-dir ruff==0.16.4
COPY ruff.toml /app/ruff.toml
COPY ./tests/ ./tests/
RUN ruff check . && ruff format --check .

FROM base

ENTRYPOINT ["/app/entrypoint.sh"]