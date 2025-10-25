# 3. アウトボックステーブルとディスパッチャ

`event-sourcing/src/outbox/outbox.service.ts` は、PostgreSQL の `outbox_messages` テーブルから未公開イベントを読み出し、Kafka に送信する役割を担う。Qiita 記事で紹介している「DB とメッセージブローカーを確実に同期させる」実装を NestJS で再現したもの。

## 処理の流れ

1. `EventStoreService.append()` がイベントを永続化すると同じトランザクション内で `outbox_messages` に `published = FALSE` の行を挿入する。
2. `OutboxService` が 2 秒おきに `flushBatch()` を実行。
   - `FOR UPDATE SKIP LOCKED` で未処理行をロックしつつ取得。
   - Kafka の `orders.events` トピックへ key/value 形式で publish。
   - 送信が成功したら `published = TRUE, published_at = NOW()` で更新。
3. 失敗した場合はトランザクションがロールバックされ、次回ポーリングで再送される。

```ts
const count = await this.outbox.flushBatch(100);
// => Kafka へ送った件数。通常は onModuleInit で自動ポーリング。
```

本番では Debezium など CDC ツールで `outbox_messages` を購読する構成にも置き換えられる。サンプルではポーリング + KafkaJS で最小構成を示している。
