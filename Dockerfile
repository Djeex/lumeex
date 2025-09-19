FROM python:3.13-alpine AS builder

WORKDIR /app

RUN apk add --no-cache gcc musl-dev jpeg-dev zlib-dev

COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir=/wheels -r requirements.txt

FROM python:3.13-alpine

WORKDIR /app

COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --find-links=/wheels /wheels/* && rm -rf /wheels

COPY build.py gallery.py VERSION /app/
COPY ./src/ ./src/
COPY ./config /app/default
COPY ./docker/.sh/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]