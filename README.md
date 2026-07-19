# 流亡攻略庫（PoE Guide Vault）

個人使用的《Path of Exile》流派攻略閱讀器。將一份攻略拆成固定階段，集中呈現目前目標、轉型條件、技能連線、裝備升級、PoB、個人筆記與圖片。

線上版本：[poe-guide-vault.lulu0723.chatgpt.site](https://poe-guide-vault.lulu0723.chatgpt.site)

## 主要功能

- 總覽、劇情、初入輿圖、低／中／高預算及終局階段導覽
- 目標與轉型條件核取進度
- 攻略名稱、技能寶石、裝備、筆記與來源的編輯模式
- PoB／pobb.in 外部連結
- 從剪貼簿貼上攻略圖片
- 新增多份流派攻略
- JSON 匯入與匯出備份
- 桌面與手機版介面

資料預設保存在瀏覽器本機，不需要帳號或資料庫。清除瀏覽器資料或更換裝置前，請先匯出 JSON 備份。

## 使用方式

1. 開啟網站並選擇攻略階段。
2. 勾選已完成的目標與轉型條件。
3. 點擊「編輯模式」修改攻略內容、技能、裝備、PoB 與筆記。
4. 使用「匯出」保存完整攻略庫；使用「匯入」還原 JSON。

目前匯入會以檔案內的 `guides` 清單取代瀏覽器現有清單，匯入前請先備份。

## AI 攻略轉換

`guide-spec/` 提供一套可交給 ChatGPT、Claude 或其他模型使用的標準格式：

- `AI轉換專案指令.md`：攻略整理及繁中翻譯規則
- `guide-schema.json`：可匯入 JSON 的正式 Schema
- `empty-template.json`：七階段空白範本
- `AI轉換使用說明.md`：建立 AI 專案與合併攻略的流程

將攻略網站、PDF、影片字幕、PoB Notes 與空白範本交給 AI，即可要求它輸出 `poe-guide-v1` JSON，再匯入網站。

## 本機開發

需求：Node.js `>=22.13.0`

```bash
npm ci
npm run dev
```

正式建置與檢查：

```bash
npm run lint
npm run build
```

## 專案結構

```text
app/                 網站畫面與互動
guide-spec/          AI 轉換指令、Schema 與空白範本
docs/                Roadmap 與版本紀錄
examples/            可匯入攻略範例
public/              靜態資源
scripts/             建置與檢查工具
```

## 資料與圖片注意事項

- 攻略與進度存在 `localStorage`。
- 貼上的圖片會以 Data URL 存在瀏覽器；大量高解析圖片可能超過容量。
- 公開儲存庫只包含程式與範例，不包含使用者瀏覽器中的私人資料。

## 狀態

目前為可用的第一版。後續規劃請參考 [Roadmap](docs/roadmap.md)，版本變更請參考 [Changelog](docs/changelog.md)。
