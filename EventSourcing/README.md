# Event Sourcing × Outbox Pattern

このディレクトリでは、Qiita 記事「イベントソーシング＋アウトボックスパターン」(https://qiita.com/R-Tone/items/2fa5a0dddcc9e8af88a1) の内容に沿って、NestJS + PostgreSQL + Kafka で動く実装手順とサンプルコードをトピックごとに整理する。

## トピック構成

1. `domain/README.md` — 集約とドメインイベントの設計
2. `event_store/README.md` — イベントストアとコマンドハンドラ
3. `outbox/README.md` — アウトボックステーブルとディスパッチャ
4. `projections/README.md` — 投影（クエリモデル）とイベント購読
5. `event-sourcing/` — NestJS で PostgreSQL と Kafka を組み合わせた実装一式（`npm install && npm run start:dev`）
6. `settings/README.md` — PostgreSQL と Kafka のセットアップ手順

各 README には考え方とコード断片を記し、`event-sourcing/` 以下のコードはそのまま Nest CLI (`npx nest start`) で実行できるようになっている。
