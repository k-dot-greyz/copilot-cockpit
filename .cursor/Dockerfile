FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      git \
      curl \
      ca-certificates \
      build-essential \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# Python 3.14+ via uv — banned below 3.14 per .env-doctor.conf
ENV PATH="/root/.local/bin:${PATH}"
RUN curl -LsSf https://astral.sh/uv/install.sh | sh \
    && uv python install 3.14 \
    && ln -sf "$(uv python find 3.14)" /usr/local/bin/python3.14 \
    && ln -sf /usr/local/bin/python3.14 /usr/local/bin/python3

USER ubuntu
ENV PATH="/home/ubuntu/.local/bin:/usr/local/bin:${PATH}"
