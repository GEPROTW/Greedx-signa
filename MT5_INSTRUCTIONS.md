# MT5 自動上傳績效 EA 設置指南

為了安全且自動地將 MT5 績效紀錄持續上傳至 Firebase 供您的「前端靜態網頁」 Dashboard 讀取，我們使用 Firebase 的 REST API 來上傳。\n\n*(注意：目前系統已應要求修改為**無密碼測試模式**。您可以直接上傳與觀看網頁，不需要填寫帳密登入)*

## 1. 使用 MQL5 (MT5 EA) 上傳資料
我們為您準備好了一份完整的 EA 源碼。這個 EA 會在啟動時檢查是否曾上傳過，如果沒有則上傳全部歷史，若有則接續上傳，然後並自動設定定時器持續監控歷史交易。

1. 在 MT5 裡開啟 MetaEditor (F4)。
2. 在左側 Navigator 對 MQL5 -> Experts 點擊右鍵 `New` -> 選擇 `Expert Advisor (template)`。
3. 命名為 `FirebaseUploader`。
4. 將我們專案目錄中的 **`FirebaseUploader.mq5`** 內容複製並貼上到編輯器中。 (您可以從側邊欄複製腳本內容)
5. 點擊 **Compile (編譯)**，將會產生 `.ex5` 執行檔。

## 3. 允許 MT5 網路連線 (解決 4014 錯誤)
因為 EA 需要將資料傳送到 Firebase 伺服器，MT5 基於安全預設會阻擋未知的外部連線。
1. 在 MT5 軟體上方選單點擊 **工具 (Tools)** -> **選項 (Options)**，或直接按快捷鍵 `Ctrl+O`。
2. 切換到 **「自動交易」 (Expert Advisors)** 分頁。
3. 勾選 **「允許 WebRequest 用於以下列表的 URL」 (Allow WebRequest for listed URL:)**。
4. 雙擊下方列表的 `+` 號，新增以下兩個網址（請務必輸入完整，包含 https://）：
   - `https://identitytoolkit.googleapis.com`
   - `https://firestore.googleapis.com`
5. 點擊「確定」保存設定。

## 4. 執行與參數設定
將編譯好的 `FirebaseUploader.ex5` 從 Navigator 清單中拖曳到 MT5 的任何圖表上，會跳出參數輸入視窗：
- **FirebaseProjectId**: (已自動填入) `knowledgeable-cinema-nrwfn`
- **DatabaseId**: (已自動填入) `ai-studio-2d3e08bf-8948-4861-b08b-89d8c8b49d07`
- **WebApiKey**: (已自動填入) `AIzaSyBWYePGj3NRpvbT9GaP3DZNI3R_ygSuq-A`
- **UploadIntervalSeconds**: 定時掃描並上傳的時間間隔 (預設: 60 秒)

按下確定後，EA 會讀取歷史紀錄、只上傳未曾被上傳的交易，並產生紀錄檔 (`FirebaseUploader_Record.txt`)，之後每隔指定秒數就會自動巡迴抓取新平倉的訂單上傳！您的網頁儀錶板只要畫面重整即可更新最新庫存。

### 強制重新上傳 (Force Reupload)
若您更換了 Firebase 專案，或是網頁上的資料不同步，需要強制 EA 重新上傳全部的歷史紀錄，您可以點擊圖表右上角的 **「Force Reupload」** 按鈕。這將會刪除本地的確認紀錄，並從頭將所有歷史紀錄傳送至資料庫。
