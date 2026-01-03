FROM node:24-trixie-slim
WORKDIR /usr/src/app

COPY package.json npm-shrinkwrap.json ./

RUN npm ci --omit=dev

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    CODENAME=$(grep -oP '(?<=VERSION_CODENAME=)[^ ]*' /etc/os-release) && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $CODENAME stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y --no-install-recommends docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

COPY . .
COPY docker/dockerdefault.yaml /usr/src/app/config/default.yaml

ENTRYPOINT ["node", "app.js"]
CMD []