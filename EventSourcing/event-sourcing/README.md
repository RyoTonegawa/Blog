# Event Sourcing + Outbox (NestJS / PostgreSQL / Kafka)

このアプリは Qiita 記事 [イベントソーシング＋アウトボックスパターン](https://qiita.com/R-Tone/items/2fa5a0dddcc9e8af88a1) を NestJS で実装した最小構成である。HTTP 経由で注文を作成すると、ドメインイベントが PostgreSQL に追記され、同じトランザクションで `outbox_messages` に書き込まれる。別スレッドで動く `OutboxService` が Kafka に転送し、`OrderSummaryProjection` が購読して読み取りモデルを更新する。

## セットアップ

```bash
cd EventSourcing/event-sourcing
npm install
cp .env.example .env
psql "$DATABASE_URL" -f schema.sql   # 初回だけ
```

`.env` では以下を設定：

- `DATABASE_URL` … PostgreSQL への接続文字列
- `KAFKA_BROKERS` … `host:port` のカンマ区切り（ローカルなら `localhost:9092`）
- `KAFKA_CLIENT_ID` … 任意。省略時は `event-sourcing-sample`

## 起動と動作確認

```bash
npm run start:dev
```

### 1. 注文を作成

```bash
curl -X POST http://localhost:3000/orders \
  -H 'Content-Type: application/json' \
  -d '{"orderId": "order-1001", "customerId": "customer-42"}'
```

### 2. アイテムを追加

```bash
curl -X POST http://localhost:3000/orders/order-1001/items \
  -H 'Content-Type: application/json' \
  -d '{"sku": "SKU-RED", "quantity": 2}'
```

### 3. プロジェクションを取得

```bash
curl http://localhost:3000/orders/order-1001/summary
```

Kafka への publish → consume → プロジェクション更新が完了していれば、`totalQuantity` を含むサマリが返る。

## ディレクトリ構成

- `src/domain` … `OrderAggregate` とドメインイベント定義
- `src/event-store` … PostgreSQL にイベントを記録し、アウトボックスへ書き込むサービス
- `src/outbox` … 未公開イベントを Kafka へ送信するポーリングディスパッチャ
- `src/projections` … Kafka を購読して読み取りモデル（ここでは in-memory）を構築
- `src/orders` … HTTP API（コマンド／クエリ）、アプリケーションサービス

## 主要テーブル

`schema.sql` には以下が含まれる：

| table             | purpose                                   |
|-------------------|-------------------------------------------|
| `aggregates`      | バージョン管理（楽観ロック）              |
| `events`          | append-only のイベントストア              |
| `outbox_messages` | Kafka 配信前のバッファ（published flag） |

実運用では Outbox テーブルを CDC で購読／削除する形にも拡張できる。
