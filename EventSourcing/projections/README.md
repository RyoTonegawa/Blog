# 4. プロジェクション（読み取りモデル）

記事では「イベントを購読してクエリ用のモデルを別途構築する」重要性が述べられている。`event-sourcing/src/projections/order-summary.projection.ts` では、Kafka の `orders.events` を購読して受注サマリをインメモリで構築するシンプルな例を示している。

## 実装のポイント

- `OrderSummaryProjection` は `OnModuleInit` で `KafkaService.consume()` を呼び、`orders.events` をサブスクライブ。
- 受け取ったイベントを `JSON.parse` し、`OrderEventType` ごとに `Map<string, OrderSummary>` を更新する。
- `OrdersService.getSummary()` が HTTP エンドポイント (`GET /orders/:id/summary`) 経由で返却する。

```ts
await this.kafka.consume('orders.events', 'order-summary-projection', async ({ message }) => {
  const event = JSON.parse(message.value.toString());
  this.apply(event); // OrderCreated / OrderItemAdded に応じて Map を更新
});
```

実際のシステムでは、このプロジェクションを書き込み系 DB とは分離したストア（Elasticsearch、Redis など）に保存する。ここでは「イベントから別ビューを再構築できる」という本質に集中するため、インメモリ実装で示している。
