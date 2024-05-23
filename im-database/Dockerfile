# ENV MONGODB_INITDB_ROOT_USERNAME ubecwang@163.com
# ENV MONGODB_INITDB_ROOT_PASSWORD !DGgc6vF!8Z2TvZ
# 使用 MongoDB 官方镜像
FROM mongo:latest

ENV DEPLOY 1

RUN apt-get update && apt-get install -y libcap2-bin && \
    setcap 'cap_net_bind_service=+ep' /usr/bin/mongod

# 设置时区
ENV TZ=Europe/London

# 设置 MongoDB 副本集名称
ENV REPLICA_SET=my-replica-set

# 设置 MongoDB 的配置文件路径
COPY mongod.conf /data/configdb
COPY mongod.conf /etc

EXPOSE 80

# 启动 MongoDB 服务，并指定配置文件
CMD ["mongod", "--config", "/etc/mongod.conf"]
