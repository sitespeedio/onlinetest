FROM node:20-slim

WORKDIR /usr/src/app

COPY package.json npm-shrinkwrap.json ./

RUN npm ci --omit=dev

COPY . .
COPY docker/start.sh /usr/src/app/start.sh

RUN useradd --user-group --create-home --shell /bin/false sitespeed && \
    chown -R sitespeed:sitespeed /usr/src/app && \
    chmod +x /usr/src/app/start.sh

USER sitespeed

EXPOSE 3000

ENTRYPOINT ["/usr/src/app/start.sh"]
