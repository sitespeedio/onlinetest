FROM node:20-slim

WORKDIR /usr/src/app

COPY package.json npm-shrinkwrap.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .
COPY config/default.yaml /usr/src/app/config/default.yaml

RUN useradd --user-group --create-home --shell /bin/false sitespeed && \
    chown -R sitespeed:sitespeed /usr/src/app

USER sitespeed

EXPOSE 3000

ENTRYPOINT ["node", "app.js"]
CMD []