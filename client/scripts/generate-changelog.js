#!/usr/bin/env node

/**
 * git log から changelog.json を自動生成するスクリプト
 * 対象: feat:, fix:, perf: で始まるコミットメッセージ
 * 出力: client/public/changelog.json
 *
 * - changelog-overrides.json で英語→日本語変換、非表示(null)を設定可能
 * - PR番号 (#XX) やスコープ (ui) を自動除去
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TYPE_MAP = {
  feat: '新機能',
  fix: 'バグ修正',
  perf: 'パフォーマンス改善',
};

// オーバーライドマップを読み込み
function loadOverrides() {
  const overridesPath = join(__dirname, 'changelog-overrides.json');
  if (!existsSync(overridesPath)) return {};
  const raw = readFileSync(overridesPath, 'utf-8');
  const data = JSON.parse(raw);
  delete data._comment;
  return data;
}

// PR番号 (#XX) を除去
function cleanDescription(desc) {
  return desc
    .replace(/\s*\(#\d+\)\s*/g, '')
    .trim();
}

function generateChangelog() {
  const overrides = loadOverrides();

  let gitLog;
  try {
    gitLog = execSync(
      'git log --pretty=format:"%ad|%s" --date=short',
      { encoding: 'utf-8', cwd: resolve(__dirname, '../../') }
    );
  } catch {
    // Docker内などgitリポジトリがない環境では既存のchangelog.jsonを維持
    const existingPath = join(resolve(__dirname, '../public'), 'changelog.json');
    if (existsSync(existingPath)) {
      console.log('gitリポジトリなし: 既存のchangelog.jsonを使用');
    } else {
      mkdirSync(resolve(__dirname, '../public'), { recursive: true });
      writeFileSync(existingPath, '[]', 'utf-8');
      console.log('gitリポジトリなし: 空のchangelog.jsonを生成');
    }
    return;
  }

  const lines = gitLog.trim().split('\n').filter(Boolean);
  const entriesByDate = {};
  let skipped = 0;

  for (const line of lines) {
    const sepIdx = line.indexOf('|');
    if (sepIdx === -1) continue;

    const date = line.slice(0, sepIdx);
    const message = line.slice(sepIdx + 1);

    // "feat: ...", "fix: ...", "perf: ..." を抽出（スコープ付きも対応）
    const match = message.match(/^(feat|fix|perf)(\([^)]*\))?:\s*(.+)/);
    if (!match) continue;

    const type = match[1];
    let description = match[3].trim();

    // オーバーライドを確認（元のdescription、クリーンアップ前で照合）
    if (description in overrides) {
      if (overrides[description] === null) {
        skipped++;
        continue; // null = 非表示
      }
      description = overrides[description];
    } else {
      // クリーンアップ後でも照合
      const cleaned = cleanDescription(description);
      if (cleaned in overrides) {
        if (overrides[cleaned] === null) {
          skipped++;
          continue;
        }
        description = overrides[cleaned];
      } else {
        description = cleaned;
      }
    }

    if (!entriesByDate[date]) {
      entriesByDate[date] = [];
    }

    // 同じ日の同じdescriptionの重複を排除
    const isDuplicate = entriesByDate[date].some(
      e => e.type === type && e.description === description
    );
    if (isDuplicate) continue;

    entriesByDate[date].push({
      type,
      label: TYPE_MAP[type],
      description,
    });
  }

  // 日付順（新しい順）でソート
  const changelog = Object.entries(entriesByDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entries]) => ({ date, entries }));

  // public/ に出力
  const outputDir = resolve(__dirname, '../public');
  mkdirSync(outputDir, { recursive: true });
  const outputPath = join(outputDir, 'changelog.json');
  writeFileSync(outputPath, JSON.stringify(changelog, null, 2), 'utf-8');

  const total = changelog.reduce((s, d) => s + d.entries.length, 0);
  console.log(`changelog.json を生成しました（${changelog.length}日分, ${total}件表示, ${skipped}件スキップ）`);
}

generateChangelog();
