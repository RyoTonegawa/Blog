# 1. ドメイン層 — 集約とドメインイベント

Qiita 記事ではまず、状態を書き換えず「イベントとして記録する」ことが強調されている。`nest-app/src/domain/order.aggregate.ts` と `nest-app/src/domain/events/domain-event.interface.ts` にその方針をそのまま落とし込んだ `OrderAggregate` とドメインイベントを定義している。

## モデルのポイント

- `OrderEventType` と `DomainEvent` インターフェースで「イベント名」「負荷する payload」「集約タイプ」を明示した。
- `OrderAggregate` は `create()` や `addItem()` など **コマンドを受け取りイベントを発行** するだけで、実際の状態は `apply()` を通じてイベントを反映している。
- 過去イベントからのリプレイ用に `OrderAggregate.rehydrate(events)` を用意し、イベントソーシングの基本である「再構成」を確認できる。

```ts
const order = new OrderAggregate();
order.create('order-1001', 'customer-42');
order.addItem('SKU-RED', 2);
console.log(order.orderState.items); // { "SKU-RED": 2 }
console.log(order.pendingEvents.length); // 2
```

## シリアライズ／デシリアライズ

- `recordEvent()` で発行するイベントは ISO8601 の `occurredAt` を含むプレーンなオブジェクト。
- 永続化時は JSONB へそのまま保存し、Kafka 配信時も同じ構造を使うため追加のマッピングコストがない。

この層はビジネスロジックに専念させ、永続化や配信は後述のトピックに委ねる。
