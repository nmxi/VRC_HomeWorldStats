# VRChat Worlds Stats

![image](https://github.com/user-attachments/assets/1f5ee2d3-e89a-413b-8ddf-a42a0113b5ad)

VRChatのMy Worldsページとユーザープロフィールページにすべてのワールドの統計情報を集計表示するTampermonkeyユーザースクリプトです。

![Version](https://img.shields.io/badge/version-1.1-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 機能

- 👥 **Total Users In-World**: 全ワールドの現在のユーザー数合計
- 📈 **Total Visits**: 全ワールドの訪問回数合計（集計可能な場合）
- ⭐ **Total Favorites**: 全ワールドのお気に入り数合計
- 🌍 **Worlds (Public)**: パブリックワールドの数
- 🎯 **対応サイト**: My Worldsページとユーザープロフィールページの両方で動作

## インストール

### 前提条件
- Google Chrome ブラウザ
- [Tampermonkey](https://www.tampermonkey.net/)ブラウザ拡張機能

### インストール手順

1. **Tampermonkeyをインストール**
   - [Chrome ウェブストア](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)からTampermonkeyをインストール

2. **スクリプトをインストール**
   - このリポジトリの[vrchat-worlds-stats.js](vrchat-worlds-stats.js)を開く
   - スクリプト全体をコピー
   - ブラウザのTampermonkeyアイコンをクリック
   - 「新規スクリプトを作成...」を選択
   - デフォルトの内容をコピーしたスクリプトで置き換える
   - `Ctrl+S`（Macでは`Cmd+S`）で保存

3. **インストールの確認**
   - [VRChat Home](https://vrchat.com/home/content/worlds)にアクセス
   - アカウントにログイン
   - 「My Worlds」またはユーザープロフィールページに移動
   - ページタイトルの下に統計ボックスが表示されることを確認

## 使い方

インストール後、スクリプトは対応するVRChatページで自動的に動作します：

- **My Worldsページ**: `https://vrchat.com/home/content/worlds`
- **ユーザープロフィールページ**: `https://vrchat.com/home/user/usr_*`

「My Worlds」または「[ユーザー名]'s Worlds」タイトルの下に統計ボックスが表示され、以下の情報が確認できます：

- 現在ワールドにいるユーザーの合計数
- 総訪問回数（利用可能な場合）
- 総お気に入り数
- パブリックワールドの数

### 注意事項

- **パブリックワールド**の統計のみをカウントします
- プライベートワールドはすべての計算から自動的に除外されます
- 統計は10秒ごとに自動更新されます
- 初回読み込み時はデータ収集中「Refreshing...」と表示されます
- 一部のユーザープロフィールページでは訪問回数が表示されない場合があります

## 技術詳細

### 動作原理

1. **ページ検出**: URLの変更を監視してワールドページを検出
2. **データ収集**: ページ内のワールドカードをスキャンして統計を抽出
3. **非同期読み込み**: すべてのワールドデータが完全に読み込まれるまで待機
4. **スマート更新**: データが変更された場合のみ更新してパフォーマンスを最適化

### ブラウザ互換性

- ✅ Google Chrome（動作確認済み）
- その他のブラウザは未検証

### パフォーマンス

- ページパフォーマンスへの影響は最小限
- キャッシングを使用した効率的なDOMクエリ
- 不要な更新を避けるスマート更新検出

## カスタマイズ

スクリプト上部の設定を変更することで、様々な項目をカスタマイズできます：

```javascript
const CONFIG = {
    UPDATE_INTERVAL: 10000,     // 更新頻度（ミリ秒）
    CHECK_INTERVAL: 5000,       // チェック間隔（ミリ秒）
    INITIAL_DELAY: 2000,        // 初期読み込み遅延
    // ... その他の設定
};
```

## ライセンス

このプロジェクトはMITライセンスの下でライセンスされています。

## 謝辞

- VRChatコミュニティの皆様に感謝
- [Tampermonkey](https://www.tampermonkey.net/)を使用して構築

## 免責事項

これは非公式ツールです。ご利用は自己責任でお願いします。

---

**注記**: VRChat Homeで表示される各数値は概算であるため、表示される統計に誤差が生じることがあります。
