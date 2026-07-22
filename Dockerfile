FROM python:3.12.3-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates curl xz-utils git \
    gcc g++ make libc6-dev \
  && rm -rf /var/lib/apt/lists/* \
  && curl -fsSL https://nodejs.org/dist/v18.8.0/node-v18.8.0-linux-x64.tar.xz -o /tmp/node.tar.xz \
  && tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 \
  && rm -f /tmp/node.tar.xz

WORKDIR /app
COPY . .

WORKDIR /app/Archipelago-0.6.6
RUN python3 -m venv venv \
  && ./venv/bin/pip install --upgrade pip "setuptools>=75,<81" wheel \
  && ./venv/bin/python ModuleUpdate.py -y \
  && ./venv/bin/cythonize -b -i _speedups.pyx

ENV SKIP_REQUIREMENTS_UPDATE=true

WORKDIR /app/discord-bot
RUN npm ci --omit=dev

CMD ["node", "index.js"]