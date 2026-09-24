# Learned Rule: ヒアドキュメントで書いたコードは `\` が半分に削れる — 正規表現が静かに壊れる

**学到的教训**: `bash -c 'node - <<EOF ... EOF'` 経由で JavaScript を書くと、この環境では
バックスラッシュが**半分に削られる**。`\\b` と書いたものが `\b` としてファイルに落ち、
JS の文字列リテラルの中では `\b` = **U+0008 BACKSPACE**（制御文字）になる。
結果、`/<img\b[^>]*>/` は「img のあとに制御文字 U+0008 が来る」正規表現になり、**一度も一致しない**。

同じ事故が同一セッションで 2 か所に入っていた:
- `tools/content-diff.mjs` … `\b` → U+0008（画像の検出が全滅、44 件の誤検出）
- `build/build.mjs` … 後方参照 `\1` → U+0001（script/style の除去が効かない）

## なぜ気づきにくいか

- **エディタでも `git diff` でも `sed` でも正しく見える**（制御文字は表示されない）
- `Function.prototype.toString()` は正しいソースを返す → 「コードは合っているのに動かない」
- `node --check` は通る（構文としては正当）
- 単体で同じ処理を書き直すと動く → 「キャッシュか？」と誤診する

## 応該怎么做

1. **バックスラッシュを含むコードはヒアドキュメントで書かない。** Write / Edit ツールを使う。
   どうしても shell から書くなら `String.fromCharCode(92)` で組み立てる。
2. **一箇所見つけたら全ファイルを掃く**（[[2026-05-12-windows-path-pattern-generalization]] と同型）:
   ```bash
   node -e 'const fs=require("fs");for(const f of process.argv.slice(1)){
     const s=fs.readFileSync(f,"utf8");
     s.split(/\r?\n/).forEach((l,i)=>{
       const bad=[...l].filter(c=>{const x=c.codePointAt(0);return x<32&&x!==9});
       if(bad.length)console.log(f+":"+(i+1)+" U+"+bad.map(c=>c.codePointAt(0).toString(16)).join(","));
     });}' tools/*.mjs build/**/*.mjs
   ```
3. **意図的な制御文字とは区別する。** プレースホルダの番兵（`U+0001` … `U+0002` 等）は正当な用途。
   ペアで出てくるか、コメントで説明されているかで見分ける。
4. **「ソースは正しいのに動かない」ときは制御文字を疑う** — キャッシュやモジュール解決を疑う前に。

## 避免什么

- ❌ `<<'EOF'` なら安全だと仮定する（クォートしても削られた）
- ❌ 目視・`git diff`・`sed` の出力で「コードは正しい」と結論する
- ❌ 一箇所直して終わりにする（同一セッションの他の編集にも入っている）
- ❌ 「同じコードを単体で書くと動くからキャッシュだ」と診断する

## 来源

- hapi-robo.com 移行 2026-08-20: content-diff の `<img>` 検出が動かず、
  実在する画像 44 件を「欠落」と誤報。原因特定に相当の往復を要した
- 同セッションの掃き出しで `build/build.mjs` の後方参照 `\1` → U+0001 も発見
- commit 2263d31

## 冷却

- 作成日: 2026-08-20
- 30 日以内に同種の shell エスケープ pattern を再提案しない
- 月次: 新規 `.mjs` / `.js` / `.py` に制御文字が混入していないか掃く
