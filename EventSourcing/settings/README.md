# /settings — PostgreSQL & Kafka Setup

NestJS サンプルを動かすためのミドルウェア（PostgreSQL と Kafka）の立ち上げ手順をまとめる。

## 1. 事前準備

- Docker / Docker Compose がインストールされていること。
- `EventSourcing/event-sourcing/.env` に接続文字列を記載する（後述の compose 構成に合わせる場合は、サンプルの値のままでも OK）。

## 2. docker-compose でまとめて起動する

`EventSourcing/settings/docker-compose.yml` を作成し、以下の内容を貼り付ける。

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    container_name: event-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: event_sourcing
    ports:
      - '5432:5432'
    volumes:
      - pg-data:/var/lib/postgresql/data

  zookeeper:
    image: bitnami/zookeeper:3.9
    container_name: event-zookeeper
    restart: unless-stopped
    environment:
      ALLOW_ANONYMOUS_LOGIN: 'yes'
    ports:
      - '2181:2181'

  kafka:
    image: bitnami/kafka:3.7
    container_name: event-kafka
    restart: unless-stopped
    depends_on:
      - zookeeper
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_CFG_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092
      KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      ALLOW_PLAINTEXT_LISTENER: 'yes'
    ports:
      - '9092:9092'

volumes:
  pg-data:
```

起動／停止コマンド:

```bash
cd EventSourcing/settings
docker compose up -d
# ... 停止するとき
docker compose down
```

## 3. PostgreSQL の初期化

コンテナ起動後、スキーマを作成する。

```bash
psql postgres://postgres:postgres@localhost:5432/event_sourcing \
  -f ../event-sourcing/schema.sql
```

### 接続確認

```bash
psql postgres://postgres:postgres@localhost:5432/event_sourcing \
  -c '\dt'
```

`aggregates`, `events`, `outbox_messages` の 3 テーブルが表示されれば OK。

## 4. Zookeeper とは？

Zookeeper は Kafka クラスターのメタデータ（ブローカーの一覧、トピック設定、リーダー選出など）を管理する協調サービス。Kafka 3.x 以降は KRaft モードで Zookeeper なしでも動くが、依然として多くのディストリビューションが Zookeeper 連携を前提にしている。今回の Compose では Bitnami イメージが Zookeeper を要求するため、最小構成として `zookeeper` サービスを立ち上げている。

## 4. Kafka の動作確認

Bitnami イメージには `kafka-topics.sh` や `kafka-console-producer.sh` が同梱されている。以下はトピック確認の例。

```bash
docker exec -it event-kafka kafka-topics.sh --bootstrap-server localhost:9092 --list
```

NestJS の Outbox サービスを動かすと自動的に `orders.events` トピックが作成される。手動で作る場合:

```bash
docker exec -it event-kafka kafka-topics.sh \
  --bootstrap-server localhost:9092 \
  --create --topic orders.events --partitions 1 --replication-factor 1
```

## 5. `.env` の設定（サンプル）

`EventSourcing/event-sourcing/.env`:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/event_sourcing
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=event-sourcing-sample
```

これで `npm run start:dev` を実行すると、PostgreSQL と Kafka に接続してサンプルが動作する。
