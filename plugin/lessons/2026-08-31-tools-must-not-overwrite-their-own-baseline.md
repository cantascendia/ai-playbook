# Learned Rule: 「基準」を書き出す道具は、部分実行で自分の基準を潰す

**学到的教训**: robotemi.jp の取り込みで、**同じ形の事故を 1 セッションに 2 回**やった。

- `mirror.mjs --only /author/` … 台帳 `_index.json` が **339 件 → 4 件**に化けた
- `baseline-capture.mjs`（再開実行）… 集計 `capture-summary.json` が **395 件 → 17 件**に化けた

どちらも「その回に処理したぶんだけを集めて、最後に丸ごと `writeFile`」という同じ設計。
`--only` / `--limit` / 再開（resume）で**一部だけ**回した瞬間に、
過去の実測値が消える。

**特に悪いのは、消えるのが「二度と取り直せない実測値」だったこと。**
台帳には頁送りの深さ（`lastPage`）が入っており、これは稼働中の WordPress を
叩いて測ったもの。消えたら測り直しになる（この時はまだ動いていたので助かった）。

## 触发场景

- `--only` / `--limit` / `--resume` / スキップ機能を持つ収集系の道具
- 出力が「全件の台帳・集計・索引」で、入力が「今回処理したぶん」
- 出力先が `_baseline/` `_harvest/` `docs/` など**正本を置く場所**

## 应该怎么做

1. **書き出す前に既存を読んで合わせる**:
   ```js
   const before = existsSync(P) ? JSON.parse(await readFile(P, 'utf8')) : []
   const merged = [...new Map([...before, ...current].map(r => [r.url, r])).values()]
   await writeFile(P, JSON.stringify(merged, null, 2))
   if (merged.length !== current.length) console.log(`既存 ${before.length} 件に足して ${merged.length} 件`)
   ```
2. **件数が減ったら黙らない。** 「既存 N 件に足して M 件」を必ず出す。
   減少は事故のサインなので、`M < before.length` なら警告する
3. **一意キーを決めておく**（URL / key）。無いと足し込めない
4. **部分実行の option を足すときは、出力側もセットで見直す**。
   `--only` を足した commit で `writeFile` を見ていなければ、その時点で埋まっている
5. **1 つ見つけたら同種の道具を全部掃く**（[[2026-05-12-windows-path-pattern-generalization]] と同型）:
   ```bash
   grep -ln "writeFile.*summary\|writeFile.*index\|writeFile.*ledger" tools/*.mjs
   ```

## 避免什么

- ❌ 「毎回全件回すから大丈夫」と仮定する（`--only` を足した時点で前提が崩れる）
- ❌ 再開機能（skip 済み）と全件集計を同じ変数で持つ
- ❌ 実測値の入った正本を、確認せずに上書きする
- ❌ 1 つ直して終わりにする（このセッションでは 2 本目が別ファイルにいた）

## 来源

- robotemi.jp Phase 0 取り込み 2026-08-31
- commit `23b2874`（mirror.mjs の台帳を足し込みに）
- commit `6ff31ea`（baseline-capture.mjs の集計を足し込みに）
- 関連 [[2026-05-12-windows-path-pattern-generalization]]（一箇所見つけたら全掃き）

## 冷却

- 作成日: 2026-08-31
- 30 日以内に同種の「部分実行が正本を潰す」pattern を再提案しない
- 月次: 収集系の道具に `--only` / `--limit` が増えていないか、増えていたら出力側を確認
