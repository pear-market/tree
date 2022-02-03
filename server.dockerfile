FROM alpine:latest
MAINTAINER Chance Hudson

RUN apk add --no-cache nodejs npm

COPY . /src

WORKDIR /src

RUN npm ci && npm run bootstrap

ENV GETH_URL=wss://goerli2.zkopru.network
ENV DB_PATH=/data/db.sqlite

WORKDIR /src/packages/server
CMD ["npm", "start"]
