FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY ./src/ ./src/
COPY ./build.py ./build.py
COPY ./gallery.py ./gallery.py
COPY ./config /app/default
COPY ./docker/.sh/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

RUN printf '#!/bin/sh\n/app/entrypoint.sh build\n' > /usr/local/bin/build && chmod +x /usr/local/bin/build && \
    printf '#!/bin/sh\n/app/entrypoint.sh gallery\n' > /usr/local/bin/gallery && chmod +x /usr/local/bin/gallery

ENTRYPOINT ["/app/entrypoint.sh"]