# 業務時間計測・管理システム 詳細設計書 (Detailed Design Document)

**Version**: 1.0 (Final)
**Date**: 2024-XX-XX

## 1. プロジェクト概要

### 1.1 目的
業務時間の正確な計測、業務プロセスの可視化（グラフ・CSV）、および厳格なユーザー管理（権限・状態管理）を行うWebアプリケーション。

### 1.2 システム構成
*   **Frontend**: React (Vite) + Tailwind CSS + React Query
    *   Port: `9002`
*   **Backend**: Node.js + Express
    *   Port: `9102`
*   **Database**: PostgreSQL + Prisma
    *   Port: `55002`

### 1.3 認証・識別方針
*   **認証**: 簡易認証。URLパラメータ `?uid={loginId}` またはヘッダー `x-user-id` を使用。
*   **セキュリティ**: ミドルウェアレベルで `User.status` を常に監視し、無効・削除ユーザーのアクセスを遮断する。


## 2. データベース設計 (Prisma Schema)

業務項目名の変更履歴を保持するための「スナップショット」と、ユーザー状態管理用のEnum定義が重要。

```prisma
// schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
}

// --------------------------------------
// Enums
// --------------------------------------

enum UserStatus {
  ACTIVE   // 通常利用可能
  DISABLED // 無効化 (ログイン不可 / 復帰可能 / 画面はグレーアウト)
  DELETED  // 削除 (ログイン不可 / 復帰不可 / 画面は赤色ロック / データ保持)
}

enum CategoryType {
  SYSTEM // 管理者のみ編集可能 (全ユーザー共通)
  CUSTOM // 作成したユーザーのみ編集可能 (個人用)
}

enum Role {
  ADMIN // 管理者
  USER  // 一般ユーザー
}

// --------------------------------------
// Models
// --------------------------------------

model User {
  id        Int        @id @default(autoincrement())
  uid       String     @unique // ログインID
  name      String
  role      Role       @default(USER)
  status    UserStatus @default(ACTIVE)
  
  // 拡張用: コスト計算用単価
  hourlyRate Int?      @default(0)

  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  settings   UserSetting?
  logs       WorkLog[]
  categories Category[] // 自分が作成したカテゴリ (Custom)

  @@map("users")
}

model UserSetting {
  userId      Int      @id
  user        User     @relation(fields: [userId], references: [id])
  
  // ボタン順序や非表示設定 (例: { "order": [1, 5], "hidden": [2] })
  preferences Json?    

  updatedAt   DateTime @updatedAt

  @@map("user_settings")
}

model Category {
  id          Int          @id @default(autoincrement())
  name        String       // 現在の業務項目名
  type        CategoryType
  
  // Systemの場合はNULL、Customの場合は作成者ID
  createdById Int?         
  createdBy   User?        @relation(fields: [createdById], references: [id])
  
  isDeleted   Boolean      @default(false) // 論理削除
  priority    Int          @default(0)     // 表示順序

  logs        WorkLog[]

  @@map("categories")
}

model WorkLog {
  id          Int       @id @default(autoincrement())
  userId      Int
  user        User      @relation(fields: [userId], references: [id])
  
  // マスタ参照 (マスタ削除後もID維持)
  categoryId  Int?      
  category    Category? @relation(fields: [categoryId], references: [id])

  // ★重要: スナップショット
  // ログ作成時点の Category.name をコピー保存する。
  // マスタ名が変更されても、過去ログの表記は変わらないようにする。
  categoryNameSnapshot String 

  startTime   DateTime  @default(now())
  endTime     DateTime?
  duration    Int?      // 秒 (endTime - startTime)

  createdAt   DateTime  @default(now())

  @@index([userId, startTime])
  @@map("work_logs")
}


```

# 業務時間計測・管理システム 実装詳細仕様書 (Backend & Frontend)

## 3. バックエンド実装詳細 (API)

### 3.1 共通 Middleware: Status Guard
*   **目的**: アカウントが無効化・削除されたユーザーのアクセスを即座に遮断する。
*   **処理フロー**:
    1.  全てのリクエストヘッダーまたはクエリから `uid` を取得。
    2.  DBの `User` テーブルを検索。
    3.  `status` が `DISABLED` または `DELETED` の場合、処理を中断し **HTTP 403 Forbidden** を返す。
    4.  Response Body: `{ error: "Account Disabled", status: "DISABLED" }`

### 3.2 ユーザー管理 API (`/api/users`)
*   **PUT `/api/users/:id`** (編集)
    *   **権限**: **Admin Only** (ミドルウェアでRoleチェック)
    *   **機能**: `name`, `role`, `hourlyRate` の更新。
    *   **通知**: 更新成功時、編集されたUserオブジェクトを返し、フロントエンドでToast通知のトリガーとする。
*   **PATCH `/api/users/:id/status`** (状態変更)
    *   **権限**: **Admin Only**
    *   **機能**: ステータスを `ACTIVE` / `DISABLED` / `DELETED` に変更。
    *   **注意**: `DELETED` の場合も物理削除（`DELETE FROM`）は行わず、ステータスの更新のみを行う。

### 3.3 業務項目管理 API (`/api/categories`)
*   **POST `/api/categories`** (新規作成)
    *   **ロジック**:
        *   リクエストユーザーが `ADMIN` → `type: SYSTEM` で作成。
        *   リクエストユーザーが `USER` → `type: CUSTOM`, `createdById: userId` で作成。
*   **PUT `/api/categories/:id`** (名称編集)
    *   **権限チェック**:
        *   `type=SYSTEM`: Adminのみ編集可能。
        *   `type=CUSTOM`: 作成者本人のみ編集可能。
    *   **処理**: `name` カラムのみを更新する。
    *   **重要**: 過去の履歴改変を防ぐため、**`WorkLog` テーブルの `categoryNameSnapshot` は更新しない**。
*   **DELETE `/api/categories/:id`** (削除)
    *   **処理**: `isDeleted = true` に更新する（論理削除）。
    *   **影響**: 新規ログ作成時の選択肢からは消えるが、過去の集計データには残る。

### 3.4 業務ログ・分析 API (`/api/logs` & `/api/stats`)
*   **POST `/api/logs/switch`** (記録開始・終了)
    *   **トランザクション処理**:
        1.  現在進行中のタスク（`endTime: null`）があれば終了時刻を記録。
        2.  新しいタスクを `INSERT`。
    *   **スナップショット保存**:
        *   新規タスク作成時、指定された `categoryId` の現在の名称(`Category.name`)を取得。
        *   `WorkLog.categoryNameSnapshot` カラムにその文字列を保存する。
*   **GET `/api/logs/monitor`** (直近監視)
    *   **権限**: **Admin Only**
    *   **条件**: 全ユーザーのログのうち、`createdAt` が24時間以内のもの。
    *   **順序**: `startTime` 降順 (最新が上)。
*   **GET `/api/stats/export`** (CSV出力)
    *   **入力**: `startDate`, `endDate`, `uid` (Adminは任意指定可)。
    *   **出力**: CSV形式のテキストストリーム。
    *   **項目**: 日付, 開始時刻, 終了時刻, ユーザー名, **業務項目名(スナップショット)**, 作業時間(分)。

---

## 4. フロントエンド UI/UX 設計

### 4.1 状態監視と画面ロック (Status Guard)
管理者がユーザーを無効化・削除した際、ユーザー画面を即座に制御不能にする機能。

*   **実装**:
    *   React Query等を使用し、`/api/users/me` を**10秒間隔**でポーリングする。
*   **ステータス別挙動 (Overlay)**:
    1.  **ACTIVE (通常)**:
        *   通常通り操作可能。
    2.  **DISABLED (無効化)**:
        *   **画面**: 全体を `bg-gray-900/90` (ほぼ黒) で覆う。
        *   **Modal**: 「ユーザーを無効化しました。管理者に問い合わせてください。」
        *   **操作**: クリック、スクロール等、一切の操作をブロック。
    3.  **DELETED (削除)**:
        *   **画面**: 全体を `bg-red-900/90` (赤黒い) で覆う。
        *   **Modal**: 「ユーザーを削除しました。」
        *   **操作**: 一切の操作をブロック。

### 4.2 通知機能 (Toast)
*   **ユーザー情報更新時**:
    *   ポーリングで自身の情報の `updatedAt` が更新されたことを検知した場合。
    *   メッセージ: 「管理者により情報が更新されました」
*   **Admin操作時**:
    *   ユーザー編集・ステータス変更APIが成功した場合。
    *   メッセージ: 「[ユーザー名] の情報を更新しました」

### 4.3 グラフ・分析画面
*   **円グラフ**:
    *   ライブラリ: `Recharts` 等を使用。
    *   集計ロジック: 期間内の `duration` 合計を、`categoryNameSnapshot` ごとにグルーピングして描画。
*   **CSVボタン**:
    *   クリックすると `/api/stats/export?start=...&end=...` へ遷移し、ブラウザのダウンロード機能をトリガーする。

### 4.4 ディレクトリ構成

```text
src/
├── components/
│   ├── Admin/
│   │   ├── UserList.tsx       # ユーザー一覧・編集・ステータス変更
│   │   ├── MonitorTable.tsx   # 直近ログ監視 (最新順)
│   │   └── CategoryMaster.tsx # システムカテゴリ管理
│   ├── Category/
│   │   └── CategoryManager.tsx # カスタムカテゴリ管理
│   ├── Common/
│   │   ├── StatusGuard.tsx    # ★画面ロック制御コンポーネント
│   │   └── Toast.tsx
│   └── Stats/
│       ├── WorkChart.tsx      # 円グラフ等
│       └── CSVExport.tsx
├── hooks/
│   ├── useUserStatus.ts       # ポーリング用フック
│   └── useWorkLogs.ts
└── pages/
    ├── DashboardPage.tsx      # 計測・グラフ
    └── AdminPage.tsx          # 管理画面
```
# 開発実装ロードマップ (Development Flow)

本ドキュメントは、業務時間計測・管理システムの開発手順をフェーズごとに定義したものです。
**「ユーザーの無効化（ロック機能）」** と **「ログの整合性（スナップショット）」** という重要要件を確実に実装するため、以下の順序で開発を進めることを推奨します。

---

## Phase 1: データベースとバックエンド基盤
**目的**: データの受け皿を作り、セキュリティの根幹となる「ステータス監視」を実装する。

### Step 1: DBスキーマ構築
*   **Action**: `schema.prisma` の定義とマイグレーション実行。
*   **Checkpoints**:
    *   [ ] `UserStatus` (ACTIVE, DISABLED, DELETED) enumが定義されているか。
    *   [ ] `CategoryType` (SYSTEM, CUSTOM) enumが定義されているか。
    *   [ ] `WorkLog` モデルに `categoryNameSnapshot` (String) が存在するか。

### Step 2: バックエンド基本実装 & セキュリティ
*   **Action**: Expressサーバーの立ち上げと、共通ミドルウェアの実装。
*   **Priority (High)**: **Status Guard Middleware**
    *   全てのリクエストで `uid` をチェックする。
    *   DB上のステータスが `DISABLED` / `DELETED` の場合、即座に `403 Forbidden` を返す実装を行う。
*   **Checkpoints**:
    *   [ ] 無効化ユーザーIDでAPIを叩いた際、確実にエラーが返るか。

---

## Phase 2: フロントエンド基盤と画面ロック
**目的**: 管理者がユーザーを停止した際、ユーザーの画面が即座に操作不能になる仕組みを作る。

### Step 3: フロントエンド構築 & ロック機能 (StatusGuard)
*   **Action**: React (Vite) 環境構築と、監視コンポーネントの実装。
*   **Priority (High)**: **StatusGuard.tsx**
    *   定期的に (`Interval: 10s`) `/api/users/me` をポーリングする。
    *   403エラーまたはステータス異常を検知したら、画面全体をオーバーレイ（グレーまたは赤）で覆う。
*   **Checkpoints**:
    *   [ ] DBを直接操作してステータスを変更した際、ブラウザをリロードせずに画面がロックされるか。

---

## Phase 3: 業務ロジック実装 (カテゴリとログ)
**目的**: 正確な記録を行うためのコアロジックを実装する。

### Step 4: 業務項目 (カテゴリ) 管理
*   **Action**: カテゴリAPI (`/api/categories`) の実装。
*   **Logic**:
    *   `ADMIN` ユーザーは `SYSTEM` カテゴリのみ作成・編集可能。
    *   `USER` ユーザーは自分の `CUSTOM` カテゴリのみ作成・編集可能。
    *   編集 (`PUT`) は `name` のみを更新する。

### Step 5: ログ記録とスナップショット
*   **Action**: ログ切り替えAPI (`/api/logs/switch`) の実装。
*   **Priority (High)**: **Snapshot Logic**
    *   ログ保存 (`INSERT`) の直前に、カテゴリマスタから現在の名称を取得する。
    *   `WorkLog.categoryNameSnapshot` にその名称を文字列として保存する。
*   **Checkpoints**:
    *   [ ] ログ記録後にカテゴリ名を変更しても、過去のログ表示（スナップショット）が変わらないこと。

---

## Phase 4: 管理機能と分析・可視化
**目的**: 管理者が状況を把握し、データを活用できるようにする。

### Step 6: 管理者機能 (Admin Features)
*   **Action**: ユーザー管理画面とモニタリング機能の実装。
*   **Features**:
    *   ユーザー編集・無効化・削除機能（ステータス変更）。
    *   **直近監視 (Monitor)**: 全ユーザーの最新ログを時系列で表示し、異常（長時間放置など）を発見できるようにする。

### Step 7: 分析・エクスポート (Analytics)
*   **Action**: グラフ表示とCSV出力の実装。
*   **Features**:
    *   **円グラフ**: `categoryNameSnapshot` をキーにして集計・表示。
    *   **CSV**: 指定期間のデータをストリーム形式でダウンロード。項目名はスナップショットを使用。

---

## 完了定義 (Definition of Done)
1.  ユーザーを無効化した際、対象ユーザーの画面がロックされること。
2.  業務カテゴリ名を変更しても、過去の履歴データの表示が変わらないこと。
3.  CSVダウンロードができ、グラフが正しく描画されること。
4.  一般ユーザーがシステムカテゴリを削除できないよう権限管理されていること。