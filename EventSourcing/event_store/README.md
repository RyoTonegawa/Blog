# 2. イベントストアとコマンドハンドラ

`nest-app/src/event-store/event-store.service.ts` では、集約が溜めた `pendingEvents` を PostgreSQL の **イベントストア** に追記しつつ、同時にアウトボックスへ書き込むところまでを担う。

## 役割

1. `EventStoreService.append(aggregate)`
   - 集約の未コミットイベントを 1 件ずつ `events` テーブルに挿入し、バージョンを採番。
   - 同一トランザクション内で `outbox_messages` にも JSONB で書き込み、`published = FALSE` の状態で置いておく。
   - `aggregates` テーブルのバージョンを `SELECT ... FOR UPDATE` でロックしつつ更新することで、楽観ロックを実現。
2. `load(aggregateId)`
   - 過去イベントをロードして `OrderAggregate.rehydrate()` に渡すためのヘルパ。

## コード断片

```ts
const store = app.get(EventStoreService);
const order = new OrderAggregate();
order.create('order-1001', 'customer-42');
order.addItem('SKU-RED', 2);
await store.append(order); // PostgreSQL への書き込みとアウトボックス作成が同一トランザクションで完了
```

記事で述べられている「DB への書き込みとメッセージの発行を確実に同一トランザクションで行う」ための下準備がここ。
