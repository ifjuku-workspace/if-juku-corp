# if塾株式会社 コーポレートサイト（サンプル）

秋田発のAIネイティブ開発会社「if塾株式会社」（2027年4月設立予定）のホームページ案。

- 静的サイト（HTML / CSS / JS のみ、ビルド不要）
- 公開先: GitHub Pages と Vercel（main への push で両方に反映）
- 写真はすべて実際の活動記録、キャラはアシュラくん・モブ太・Kitazuna。画面の図は HTML/CSS で組む（AI生成の写真・図解は使わない方針。旧版は `_src/ai-images/`）
- 会社案内は奥義スライドメーカーで制作
- 元の高解像度画像は `_src/`（git 管理外）

## ローカル確認

```
python3 -m http.server 8765
```

## 構成

- `index.html` アバター版トップ。ナビゲーター「アイ」（Live2Dメーカーで作成）と話すだけで、案内から申し込みまで完結。`api/chat.js`（Gemini、使えないときは画面側の会話の流れで応答）と `api/lead.js`（申し込みを Discord へ）
- `home.html` 普通のホームページ（1ページ構成（つくり方 / 事業内容 / 導入例 / プラットフォーム / 自社ツール / ゲーム / 実績 / 人材育成 / 料金 / 会社概要 / 会社案内 / お問い合わせ）。スマホでは1画面1セクションの縦スワイプ）
- `assets/css/style.css` 日本語向けに本文17px・行間1.9・字間0.04em
- `assets/js/main.js` 実行ログのデモ、数字のカウントアップ、会社案内のスライド表示
- `assets/doc/if-juku-company-profile.pdf` 会社案内（10ページ）

## セキュリティの決まり（2026-11-20）

- `vercel.json` で CSP などのヘッダーを付けている（Vercel の本番だけに効く。GitHub Pages には付かない）
  - 外から読んでよいのは Google Fonts・cdnjs（Font Awesome）・jsDelivr（BudouX）だけ。ほかの CDN や外部の画像・動画を足すときは CSP にも足す
  - `index.html` と `home.html` の `<head>` にある短い `<script>` は、CSP にハッシュで登録している。**中身を 1 文字でも変えたら、ハッシュを計算し直して `vercel.json` を書き換える**（変えないと、その script が動かなくなる）
    `python3 -c 'import re,sys,hashlib,base64;[print("sha256-"+base64.b64encode(hashlib.sha256(m.encode()).digest()).decode()) for m in re.findall(r"<script>(.*?)</script>",open(sys.argv[1]).read(),re.S)]' index.html`
  - 新しい script は、埋め込みにせず `assets/js/` のファイルにする
- `api/chat.js`・`api/lead.js` は、自分のサイトの画面からの POST だけを受け付け、同じ IP からの回数を制限する（`api/_guard.js`）。制限はインスタンスごとの目安なので、確実に止めるには Vercel の Firewall のレート制限も使う
- 公開のワークフローは、Actions をコミットの SHA、Vercel CLI を版の番号で固定している。上げるときは `.github/workflows/vercel.yml` を書き換える
