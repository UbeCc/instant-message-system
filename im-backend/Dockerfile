FROM node:18 AS builder

WORKDIR /build

COPY package.json yarn.lock ./

RUN yarn config set registry https://registry.npmmirror.com && yarn

COPY . .

RUN yarn build

FROM mongo:jammy AS runner

ENV DEPLOY 1
ENV DEBIAN_FRONTEND=noninteractive

WORKDIR /app

SHELL ["/bin/bash", "-c"]

# for node
COPY --from=builder /build .
COPY ./node_init.sh /app/
COPY ./run.sh /app/
RUN chmod +x /app/node_init.sh
RUN /app/node_init.sh

# for mongo
ENV TZ=Europe/London
ENV REPLICA_SET=my-replica-set
COPY mongod.conf /data/configdb
COPY mongod.conf /etc

EXPOSE 80

CMD bash run.sh