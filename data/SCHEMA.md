# データスキーマ

アプリが読む静的データの定義。すべて UTF-8 の JSON。`data/` 以下が編集用ソースで、
`npm run data` が `public/data/` に配信用ファイルを生成する。

## 共通ルール

- 年は西暦の整数。紀元前は負数(前490年 → `-490`)。紀元0年は存在しないので前1年は `-1`、後1年は `1`。
- 座標は `lat`(緯度)と `lon`(経度)の10進小数。東経・北緯が正。
- 多言語文字列は `{"ja": "...", "en": "..."}`。`ja` は日本の高校世界史(山川『詳説世界史』系)の教科書表記に合わせる。
  例: 「神聖ローマ帝国」「アッバース朝」「ビザンツ帝国」「ムガル帝国」「清」「ナポレオン=ボナパルト」(人名の区切りは「=」)。
- `wiki` は Wikipedia の記事タイトル(URL エンコード前の生タイトル、スペースはそのまま)。
  `{"ja": "マラトンの戦い", "en": "Battle of Marathon"}`。自信がない場合は省略してよい。
- `id` は英小文字・数字・ハイフンのみ。データセット全体で一意。

## data/names/*.json — 国境データの国名の日本語化

historical-basemaps の `NAME` / `SUBJECTO` の英語名をキーにしたオブジェクト。

```json
{
  "Holy Roman Empire": {"ja": "神聖ローマ帝国"},
  "Abbasid Caliphate": {"ja": "アッバース朝"},
  "Huns": {"ja": "フン人"}
}
```

## data/events/*.json — 事件

配列。各要素:

```json
{
  "id": "battle-of-marathon",
  "type": "battle",
  "year": -490,
  "year_end": null,
  "lat": 38.15,
  "lon": 23.97,
  "name": {"ja": "マラトンの戦い", "en": "Battle of Marathon"},
  "desc": {"ja": "ペルシア戦争中、アテネ軍がペルシア軍を撃退した。", "en": "Athenian hoplites defeated the Persian expedition during the Persian Wars."},
  "importance": 3,
  "persons": ["miltiades"],
  "wiki": {"ja": "マラトンの戦い", "en": "Battle of Marathon"}
}
```

- `type`: `battle`(戦い・戦争) / `treaty`(条約・会議) / `founding`(建国・王朝成立) / `fall`(滅亡・征服) /
  `revolution`(革命・反乱) / `religion`(宗教) / `culture`(文化・技術・思想) / `exploration`(探検・航海) /
  `politics`(改革・制度・事件) / `other`
- `year_end`: 戦争や会議など期間のあるものは終了年。単発なら `null` か省略。
- `importance`: 3 = 教科書太字級、2 = 教科書本文に出る、1 = 脚注・用語集レベル。
- `persons`: 関連人物の `id`(persons データに無くてもよい)。
- `desc.ja` は 1〜2 文、60〜120 字程度。

## data/persons/*.json — 人物

```json
{
  "id": "napoleon",
  "name": {"ja": "ナポレオン=ボナパルト", "en": "Napoleon Bonaparte"},
  "born": 1769,
  "died": 1821,
  "active": [1796, 1815],
  "role": {"ja": "フランス皇帝", "en": "Emperor of the French"},
  "lat": 48.86,
  "lon": 2.35,
  "desc": {"ja": "…", "en": "…"},
  "importance": 3,
  "wiki": {"ja": "ナポレオン・ボナパルト", "en": "Napoleon"},
  "portrait": {"provider": "wikipedia"}
}
```

- `active`: 地図上に表示する期間 `[開始年, 終了年]`。生没年が不明なら活動期間だけでもよい。
- `lat`/`lon`: 主な活動拠点(首都や本拠地)。
- `portrait.provider`: `wikipedia`(実行時に Wikipedia の summary API からサムネイルを取る) /
  `url`(`portrait.url` を直接使う) / `none`。後からイラストに差し替える前提の抽象化。

## data/polities/*.json — 政体(国)の政治状況

```json
{
  "id": "byzantine-empire",
  "name": {"ja": "ビザンツ帝国", "en": "Byzantine Empire"},
  "basemap_names": ["Byzantine Empire", "Eastern Roman Empire"],
  "periods": [
    {
      "from": 395, "to": 1453,
      "government": {"ja": "専制君主政(皇帝)", "en": "Autocratic monarchy"},
      "capital": {"ja": "コンスタンティノープル", "en": "Constantinople"},
      "religion": {"ja": "ギリシア正教", "en": "Eastern Orthodox Christianity"},
      "summary": {"ja": "…", "en": "…"},
      "rulers": [{"from": 527, "to": 565, "name": {"ja": "ユスティニアヌス1世", "en": "Justinian I"}, "person": "justinian-i"}]
    }
  ],
  "wiki": {"ja": "東ローマ帝国", "en": "Byzantine Empire"}
}
```

- `basemap_names`: historical-basemaps 側の `SUBJECTO`/`NAME` 文字列。これでクリックした領域と政体を結びつける。
- `periods` は時代区分ごとに分ける(例: ローマは王政/共和政/帝政)。

## data/changes/*.json — スナップショット間の領土変化(差分)

国境データは数十年おきのスナップショットしかないため、その間の変化を「既存ポリゴンの属性書き換え」で表現する。
ポリゴンの形は変えられないが、帰属(色)・名称・境界の確からしさを年単位で変えられる。

```json
{
  "id": "mexico-independence-1821",
  "year": 1821,
  "match": { "n": "Viceroyalty of New Spain" },
  "set": { "n": "Mexico", "s": "Mexico", "p": 2 },
  "note": { "ja": "メキシコ独立", "en": "Mexican independence" }
}
```

- `year`: この変化が有効になる年。直前のスナップショット年より後、次のスナップショット年以前であること
  (スナップショット年は `public/data/territories/index.json` の `years`)。
- `match`: 書き換え対象。`n`(NAME)または `s`(SUBJECTO)で指定。文字列か文字列の配列。両方指定すれば AND。
  値は対象スナップショットに実在する英語名であること(`data/names/*.json` のキー)。
- `set`: 書き換え後の属性。`n` / `s` / `p`(1〜3)のうち必要なものだけ。`s` を変えると色が変わる。
  `n` や `s` に新しい英語名を使う場合は `data/names/*.json` に日本語名を追加すること。
- `note`: 変化の説明(短く)。該当領域をクリックしたときに表示される。
