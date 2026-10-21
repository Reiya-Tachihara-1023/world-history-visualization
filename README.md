# 世界史地球儀 / World History Globe

日本の高校世界史(山川『詳説世界史』程度)の粒度で、世界史を地球儀の上に可視化するプロジェクト。

- 年を動かすと国境・国名が切り替わる(最も近い過去のスナップショットを表示)
- 国境線の見た目で確からしさを表現(実線=確定、破線=概略、ぼかし=勢力圏)
- 事件(戦い・条約・革命…)と人物を地図上に表示。クリックで解説
- 注目モード: カメラを固定して時間を自動で進め、画面内で起きた出来事を流す
- 表示言語: 日本語 / 日英併記 / English

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
- 国名の日本語表記、事件、人物、政体の解説: `data/` 以下の手書き JSON(形式は `data/SCHEMA.md`)
- 肖像: 実行時に Wikipedia の summary API から取得(プロバイダは差し替え可能)
- 地図ラベルのフォント: Noto Sans(OFL)の glyph PBF を `public/fonts` に同梱

## ライセンス

コードは MIT。同梱データのうち `public/data/territories` は historical-basemaps 由来で GPL-3.0、
その他の手書きデータ(`data/`)は CC BY 4.0。
