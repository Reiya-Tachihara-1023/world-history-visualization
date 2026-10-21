# 世界史地球儀 / World History Globe

日本の高校世界史(山川『詳説世界史』程度)の粒度で、世界史を地球儀の上に可視化するプロジェクト。

- 年を動かすと国境・国名が切り替わる(最も近い過去のスナップショットを表示)
- 国境線の見た目で確からしさを表現(実線=確定、破線=概略、ぼかし=勢力圏)
- 事件(戦い・条約・革命…)と人物を地図上に表示。クリックで解説
- 注目モード: カメラを固定して時間を自動で進め、画面内で起きた出来事を流す
- 表示言語: 日本語 / 日英併記 / English
- 検索(`/` キー): 事件・人物・政体名から該当する年と場所へジャンプ
- 「この年の世界」: その年の前後の主な出来事と活動中の人物の一覧
- スナップショット間の変化は `data/changes` の差分(帰属・名称の書き換え)で年単位に補間

## 操作

| 操作 | 内容 |
| --- | --- |
| ドラッグ / スクロール | 地球儀を回す / 拡大 |
| スライダー, `←` `→` | 年を動かす(`Shift` で10年、`Alt` で100年) |
| `Space` | 再生 / 停止 |
| 領域クリック | 政体の政治状況、その地域の出来事・人物 |
| 丸い印 / 顔 | 事件 / 人物の解説 |
| 注目モード | カメラを固定して時間を自動で進め、画面内の出来事を左に流す |

URL のハッシュに年・言語・カメラ位置が入るので、そのまま共有できます。

## 開発

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # dist/ に静的サイトを出力
npm run data       # vendor/ のソースから public/data を再生成
npm run check      # data/ の整合性チェック
```

`public/data` は生成済みのものをコミットしてあるので、データを触らない限り `npm run data` は不要です。
`npm run data` は初回に `vendor/` へ historical-basemaps(git clone)と Natural Earth(curl)を取得します。

## データ

- 国境: [aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)(GPL-3.0)を mapshaper で簡略化
- 海岸線・湖・河川: [Natural Earth](https://www.naturalearthdata.com/)(パブリックドメイン)
- 国名の日本語表記、事件、人物、政体の解説、スナップショット間の領土変化: `data/` 以下の手書き JSON(形式は `data/SCHEMA.md`)
  - 事件 約980件、人物 約420名(8時代)、政体の政治状況は地域別ファイル
  - 内容は Claude が教科書の粒度で書き起こしたもの。年代・座標・表記の誤りは `data/` を直してください
- 肖像: 実行時に Wikipedia の summary API から取得(プロバイダは差し替え可能)
- 地図ラベルのフォント: Noto Sans(OFL)の glyph PBF を `public/fonts` に同梱

## 公開(GitHub Pages)

`.github/workflows/pages.yml` が `main` への push で `dist/` を GitHub Pages に配備します。
リポジトリの Settings → Pages → Source を「GitHub Actions」にしてください。

## 既知の制約・今後

- 国境は historical-basemaps のスナップショット(紀元前1万年〜2010年の約50枚)が基本。間の年は直近のスナップショット + `data/changes` の差分で表示。
  差分は既存ポリゴンの帰属・名称しか変えられないので、分割を伴う変化(ベルギー独立など)は次のスナップショットまで反映されない。
  ヘッダーの注記が橙色のときは、表示中の地図と年の差が大きい。
- 肖像は Wikipedia のサムネイルを実行時に取得。`portrait.provider` を差し替えればイラストに置き換えられる。
- 事件・人物の位置は「その事件が起きた場所 / その人物の活動拠点」の1点のみ。

## ライセンス

コードは MIT。同梱データのうち `public/data/territories` は historical-basemaps 由来で GPL-3.0、
その他の手書きデータ(`data/`)は CC BY 4.0。
