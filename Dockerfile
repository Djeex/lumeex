FROM python:3.11-alpine

RUN apk add --no-cache --virtual .build-deps \
    build-base \
    jpeg-dev \
    zlib-dev \
    libffi-dev \
    musl-dev \
    && apk add --no-cache \
    jpeg \
    zlib \
    libwebp \
    bash

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt \
    && apk del .build-deps

RUN rm -rf /var/cache/apk/*

# Copy source code and scripts
COPY ./src/ ./src/
COPY ./build.py ./build.py
COPY ./gallery.py ./gallery.py

# Copy default config
COPY ./config /app/default

# Copy entrypoint and make executable
COPY ./docker/.sh/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Add wrapper scripts for convenience commands
RUN printf '#!/bin/sh\n/app/entrypoint.sh build\n' > /usr/local/bin/build && chmod +x /usr/local/bin/build && \
    printf '#!/bin/sh\n/app/entrypoint.sh gallery\n' > /usr/local/bin/gallery && chmod +x /usr/local/bin/gallery


ENTRYPOINT ["/app/entrypoint.sh"]

