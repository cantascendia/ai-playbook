# Learned Rule: 「手元では通る」は再現性の証明にならない — 新しい checkout で 1 回通す

**学到的教训**: robotemi.jp の生成器は手元で検証 21 本が全 PASS だったが、
**新しく checkout した場所では 2 つの理由で再現しなかった**。
どちらも並行作業の担当者が worktree を切った瞬間に踏んで見つかった（2026-09-02）。

1. `.gitignore` の `dist/`（先頭スラッシュ無し）が**どの階層の dist/ にも当たる**。
   `_baseline/assets/…/wp-includes/js/dist/` の凍結資産 8 本が commit されておらず、
   新しい clone では公開前点検が 1746 件 NG。
2. `.gitattributes` の `*.html text eol=lf` `*.css text eol=lf` が、旧サイトから取った
   **凍結ファイル**（CRLF や混在を含む）まで正規化していた。手元の作業木には元の
   バイトが残るので検証が通り、`git status` も clean と言う。**新しく checkout すると
   LF に化けて** verify-foot / verify-dist が落ちる。

## 触发场景

- 「実物のバイトを 1 文字も変えない」ことが要件のファイル（凍結資産・ミラー・vendor CSS/JS）を git で持つ
- `.gitignore` に `dist/` `build/` `out/` のような**汎用の名前**を先頭スラッシュ無しで書いている
- 検証が手元でしか走っていない（worktree / 別マシン / CI で 1 度も通していない）
- 複数人（複数 agent）が同じ repo で worktree を切り始めるとき

## 应该怎么做

1. **凍結物は `-text`。** 正規化する規則より**後ろ**に書く（後の行が勝つ）:
   ```
   *.html text eol=lf
   _baseline/assets/** -text
   src/scripts/vendor/** -text
   build/templates/chrome/** -text
   ```
   そのうえで `git add --renormalize <dir>` で**元のバイトを index に入れ直す**。
2. **`.gitignore` の汎用名は先頭スラッシュを付ける**: `/dist/`。
   確認: `git ls-files --others --ignored --exclude-standard <凍結dir> | wc -l` が 0。
3. **再現性は機械で見る**:
   ```bash
   git ls-files --eol | grep -E "^i/lf\s+w/(crlf|mixed)" | wc -l   # 0 でなければ壊れている
   git worktree add ../wt-fresh HEAD && (cd ../wt-fresh && node build && node verify-all)
   ```
   「作業木の bytes ≠ index の bytes」を許したまま進めない。
4. 大きな移行の**節目ごとに** fresh checkout で 1 回通す。手元の PASS を根拠に「上げてよい」と言わない。

## 避免什么

- ❌ `git status` が clean だから index と作業木が同じだと思う（正規化は差を隠す）
- ❌ `.gitignore` に `dist/` を書いて、同名の下位ディレクトリまで消えていることに気づかない
- ❌ 手元の検証だけで「配信物は再現できる」と結論する
- ❌ 1 か所（`*.js`）だけ直して、他の凍結物（css/html/svg）を見ない（発見一処必須全掃き）

## 来源

- robotemi.jp Phase 5 2026-09-02: commit `4b4f6e8`（.gitignore）/ `42562a0`（.gitattributes）
- 発見: 段 2+3 と段 6 の担当が worktree で同時に踏んだ
- 関連 [[2026-05-12-windows-path-pattern-generalization]]（1 か所見つけたら全掃き）
- 関連 [[2026-09-02-verifier-normalizes-away-the-bug]]（正規化が差を隠す、の同型）

## 冷却

- 作成日: 2026-09-02 / 30 日以内に同種の再現性 pattern を再提案しない
- 月次: 凍結物を持つ repo で `git ls-files --eol` の i/lf w/crlf を数える
