# はじめかた(ド素人向け)

## 1. いちばん簡単: ブラウザで開くだけ

インストール不要です。公開ページを開くだけで動きます。

**https://reiya-tachihara-1023.github.io/world-history-visualization/**

- **Windows**: Chrome か Edge で上の URL を開く。Firefox でも動きます。
- **Android**: Chrome で開く。画面右上の「⋮」→「ホーム画面に追加」でアプリのように使えます。
- **iPad**: Safari で開く。共有ボタン(□↑)→「ホーム画面に追加」で同じようにできます。

初回だけ地図データ(数 MB)を読み込むので数秒かかります。2回目以降は速くなります。
`main` ブランチに変更を push すると、2〜3分で自動的に公開ページが更新されます。

### 操作

| やりたいこと | 操作 |
| --- | --- |
| 地球儀を回す / 拡大 | ドラッグ / マウスホイール(スマホはピンチ) |
| 年を動かす | 画面下のスライダー、または `←` `→` キー(`Shift` で10年、`Alt` で100年) |
| 自動再生 | ▶ ボタン、または `Space` キー |
| 年を直接指定 | 年の数字をクリックして「1600」「前500」などと入力して Enter |
| 国の情報を見る | 色の付いた領域をクリック |
| 事件・人物を見る | 丸い印(事件)や顔(人物)をクリック |
| 名前で探す | 上の検索欄(`/` キー)に「レパント」「ナポレオン」など |
| その年の主な出来事 | 「この年の世界」ボタン |
| ある地域の変化を眺める | 見たい場所に寄せてから「注目モード」ボタン |
| 重いとき | 「地球儀」ボタンを押して平面表示にする |
| 言語 | 「日本語 / 併記 / EN」 |

国境線の見た目は「確からしさ」です。実線は国際法で確定した国境、破線はおおよその線、ぼかしは勢力圏程度のあいまいな範囲です。
ヘッダーの「地図は○年の状態」が橙色のときは、表示中の地図と選んだ年の差が大きい、という注意です。

## 2. 自分のパソコンで動かす(データを直したい人向け)

公開ページを見るだけなら不要です。データを編集して自分で確認したいときだけ。

1. **Node.js を入れる**: https://nodejs.org/ から「LTS」をダウンロードしてインストール(全部「次へ」で OK)。
2. **Git を入れる**: https://git-scm.com/download/win からインストール(これも「次へ」で OK)。
3. スタートメニューで「PowerShell」を開き、次を1行ずつ打つ:

```powershell
cd $HOME\Documents
git clone https://github.com/Reiya-Tachihara-1023/world-history-visualization.git
cd world-history-visualization
npm install
npm run dev
```

4. 画面に `http://localhost:5173/` のような URL が出るので、ブラウザで開く。
5. 終わるときは PowerShell で `Ctrl + C`。

### データを直す

- 事件: `data/events/*.json`、人物: `data/persons/*.json`、国の解説: `data/polities/*.json`、国境の変化: `data/changes/*.json`。
  書き方は `data/SCHEMA.md` にあります。メモ帳でも直せますが、VS Code(https://code.visualstudio.com/)が楽です。
- 直したら PowerShell で:

```powershell
npm run check     # 書き間違いのチェック(0 errors なら OK)
npm run data      # 配信用データを作り直す
npm run dev       # ブラウザで確認
```

- 公開ページにも反映したいとき:

```powershell
git add -A
git commit -m "ワーテルローの戦いの座標を修正"
git push
```

push から2〜3分で公開ページが更新されます(GitHub の「Actions」タブで進み具合が見られます)。

## 3. うまくいかないとき

- **ページが真っ暗で何も出ない**: ブラウザが古い可能性があります。Chrome / Edge / Safari を最新にしてください。WebGL2 が必要です。
- **カクカクする**: 「地球儀」ボタンで平面表示にする、「人物」「事件」のボタンで表示を減らす。
- **肖像が出ない**: Wikipedia から画像を取っているので、ネットにつながっていないと出ません。名前の頭文字が代わりに出ます。
- **`npm` が見つからないと言われる**: Node.js のインストール後に PowerShell を開き直してください。
