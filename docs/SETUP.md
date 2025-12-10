# Zimmeter

Project Zimmeter.

## 開発環境のセットアップ (Docker)

本プロジェクトは Docker Compose を使用して Frontend, Backend, Database を連携させて動作させます。

### 前提条件
- Docker Desktop または Docker Engine
- Docker Compose

### 起動手順

1. **コンテナのビルドと起動**
   初回起動時や構成変更時、またはエラー発生後の復旧時は `--build` フラグを付けて実行することを推奨します。
   ```bash
   docker compose up --build
   ```

2. **アクセス**
   - **Frontend**: http://localhost:9002
   - **Backend API**: http://localhost:9102
   - **Database (PostgreSQL)**: localhost:55002

### 開発時の注意点（再発防止策）

#### 1. Prisma (Database) の設定について
Backend は Alpine Linux ベースの Docker コンテナで動作しています。これが起動エラーの主な原因となりやすいため、以下の点に注意してください。

**必須設定:**
`server/prisma/schema.prisma` の `binaryTargets` には、必ず **`linux-musl-openssl-3.0.x`** を含める必要があります。

```prisma
generator client {
  provider      = "prisma-client-js"
  // native: ホストマシン用, linux-musl-*: Dockerコンテナ(Alpine)用
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}
```

**スキーマ変更時のフロー:**
スキーマを変更した場合は、Prisma Client の再生成が必要です。コンテナ環境にも反映させるため、必ず再ビルドを行ってください。

```bash
docker compose up --build -d
```

#### 2. パッケージの追加
`npm install` で新しいパッケージを追加した場合は、Dockerイメージにも反映させるために再ビルドが必要です。

### トラブルシューティング

**Q. `PrismaClientInitializationError` / `Query Engine not found` エラーが出る**
- **原因**: Dockerコンテナ（Alpine Linux）用のPrismaエンジンが生成されていない、または依存ライブラリが不足しています。
- **対処**:
    1. `server/prisma/schema.prisma` に `binaryTargets = ["native", "linux-musl-openssl-3.0.x"]` があるか確認。
    2. `server/Dockerfile` に `RUN apk add --no-cache openssl` があるか確認。
    3. `docker compose up --build` で再構築。

**Q. ポートが競合している (Bind for 0.0.0.0:9002 failed)**
- **対処**: 以下のコマンドで既存のプロセスを確認し、停止してください。
    ```bash
    # 使用中のポートを確認
    lsof -i :9002
    lsof -i :9102
    
    # または強制的にコンテナを削除して再起動
    docker compose down
    docker compose up --build
    ```
