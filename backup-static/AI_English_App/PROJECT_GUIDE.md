# HƯỚNG DẪN TÁI DỰNG DỰ ÁN: AI ENGLISH MENTOR PRO (PHIÊN BẢN 2.0)

Tài liệu này mô tả chi tiết toàn bộ kiến trúc, giao diện, prompts và logic nghiệp vụ của dự án **AI English Mentor Pro** để bất kỳ AI Coding Assistant nào cũng có thể tái dựng lại toàn bộ ứng dụng từ đầu sang một dự án mới mà không bị thiếu sót hay sai lệch tính năng.

---

## 1. Tổng quan kiến trúc ứng dụng
Dự án được xây dựng dưới dạng **Single Page Application (SPA)** chứa trong duy nhất một tệp tin HTML. Không yêu cầu máy chủ phụ trợ (Serverless) mà gọi trực tiếp đến API Gemini của Google từ phía Client.

* **Công nghệ cốt lõi**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (sử dụng thư viện CDN), FontAwesome (cho Icons).
* **AI Model**: `gemini-2.5-flash` làm mô hình ngôn ngữ chính.
* **Cơ chế lưu trữ**: Sử dụng `localStorage` làm cơ sở dữ liệu cục bộ với một lớp bọc an toàn (`safeStorage`) để tránh lỗi phân quyền khi chạy trực tiếp qua giao thức `file:///`.

---

## 2. Đặc tả dữ liệu lưu trữ (Local Storage Schema)

Ứng dụng lưu trữ 4 khóa chính dưới local:
1. `user_gemini_api_key` (Chuỗi): Chứa API Key của người dùng (Bắt buộc bắt đầu bằng `"AIzaSy"`).
2. `ai_english_streak` (Số nguyên): Chuỗi ngày học liên tục trong ngày (Streak), tối đa mở khóa ôn tập là 5.
3. `ai_english_history` (Mảng JSON): Danh sách lịch sử các câu thoại dịch thành công (điểm số $\ge 50$):
   ```json
   [
     {
       "vi": "Câu tiếng Việt gốc",
       "en": "Bản dịch tiếng Anh tối ưu do AI đề xuất",
       "date": "dd/mm/yyyy"
     }
   ]
   ```
4. `ai_english_vocab` (Mảng JSON): Danh sách từ vựng đã lưu từ popup bôi đen (tối đa 300 từ):
   ```json
   [
     {
       "word": "Từ/Cụm từ tiếng Anh",
       "phonetic": "/phiên âm IPA/",
       "translation": "nghĩa tiếng Việt",
       "date": "dd/mm/yyyy"
     }
   ]
   ```

---

## 3. Đặc tả Prompt và các Endpoint AI

Tất cả các cuộc gọi API đến Gemini đều sử dụng endpoint:
`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=YOUR_API_KEY`
Phương thức: `POST`. Headers: `Content-Type: application/json`.
Cơ chế gọi có tích hợp **Retry tối đa 5 lần** với khoảng trễ tăng dần lũy thừa (Exponential Backoff) nếu gặp lỗi mạng.

### A. Định dạng JSON Schema phản hồi bắt buộc
Tất cả các phản hồi từ AI đều được cấu hình định dạng JSON cứng thông qua `generationConfig`:
```json
{
  "responseMimeType": "application/json",
  "responseSchema": {
    "type": "OBJECT",
    "properties": {
      "score": { "type": "NUMBER" },
      "title": { "type": "STRING" },
      "suggestion": { "type": "STRING" },
      "explanation": { "type": "STRING" },
      "vietnamese_content": { "type": "STRING" },
      "phonetic": { "type": "STRING" },
      "translation": { "type": "STRING" }
    },
    "required": ["score", "title", "suggestion", "explanation"]
  }
}
```

### B. Prompts Hệ Thống (System Prompts)

#### 1. Prompt Sinh Tình Huống Giao Tiếp (`generateNewQuestion`)
* **Mục tiêu**: Tạo ra một câu thoại tiếng Việt giao tiếp đời thực ngắn gọn, tự nhiên, không rập khuôn sách giáo khoa.
* **Prompt**:
  ```text
  Bạn là một giáo viên dạy tiếng Anh giao tiếp cực kỳ thực tế, trẻ trung, dùng ngôn ngữ đời thường năng động.
  Nhiệm vụ của bạn là tạo ra một câu thoại tiếng Việt giao tiếp đời thực, cực kỳ tự nhiên, sinh động và thực tế.
  
  YÊU CẦU ĐẶC BIỆT VỀ CHẤT LIỆU TIẾNG VIỆT:
  - Chủ đề chính: "{chosenTopic}".
  - Sắc thái/Cảm xúc/Bối cảnh giao tiếp: "{chosenSub}".
  - Câu thoại phải NGẮN GỌN, SÚC TÍCH (tối đa 15-20 từ tiếng Việt), là một câu nói trực tiếp mà một người thực sự sẽ thốt ra trong đời sống hàng ngày ngày nay.
  - Tuyệt đối TRÁNH các câu sách giáo khoa sáo rỗng, khô cứng vô hồn (như "Bạn có khỏe không?", "Tôi đi đến rạp chiếu phim để xem phim").
  - Tuyệt đối TRÁNH các câu mang tính kể lể hoàn cảnh, dẫn dắt rườm rà. Chỉ trả về chính xác CÂU THOẠI cần dịch.
  - Sử dụng linh hoạt các thán từ, trợ từ tự nhiên của tiếng Việt đời thường (ví dụ: ê, nha, á, trời ơi, ghê, luôn, hả, đi, cơ...).
  - Phải trả về dữ liệu đúng định dạng JSON có chứa trường "vietnamese_content" mô tả câu thoại tiếng Việt sinh động đó.
  ```

#### 2. Prompt Chấm Điểm & Phân Tích Bản Dịch (`checkAnswer`)
* **Mục tiêu**: Nhận xét bài dịch tiếng Anh của học viên, chấm điểm độ tự nhiên và đề xuất cụm từ hiện đại.
* **Prompt**:
  ```text
  Bạn là chuyên gia chấm điểm tiếng Anh giao tiếp bản ngữ cực kỳ chuyên nghiệp và thực tế.
  Hãy nhận xét và chấm điểm bài dịch từ tiếng Việt sang tiếng Anh của học viên.
  Câu gốc tiếng Việt: "{currentQuestion}"
  
  TIÊU CHÍ CHẤM ĐIỂM:
  1. Điểm số (0-100): Dựa trên ngữ pháp, và đặc biệt là độ tự nhiên, cách dùng từ có giống người bản xứ giao tiếp thực tế hay không.
  2. Tiêu đề ngắn phản ánh chất lượng (ví dụ: "Tuyệt vời", "Cần cải thiện độ tự nhiên").
  3. Trả về đề xuất dịch mẫu đỉnh nhất, áp dụng các cụm từ (collocations, idioms) hiện đại đời thường của người Mỹ/Anh.
  4. Nhận xét chi tiết bằng tiếng Việt: Nêu rõ lỗi sai từ vựng/ngữ pháp và hướng dẫn thay thế các từ vựng trang trọng khô cứng bằng văn phong giao tiếp tự nhiên.
  
  Trả về dữ liệu dưới dạng JSON như cấu trúc yêu cầu.
  ```

#### 3. Prompt Chấm Điểm Ôn Luyện Câu Hỏi (`checkReviewAnswerAI`)
* **Mục tiêu**: Đánh giá bài ôn tập của học viên, chấm điểm mềm dẻo.
* **Prompt**:
  ```text
  Bạn là một giáo viên chấm bài ôn tập tiếng Anh giao tiếp năng động. 
  Học viên đang làm bài ôn luyện lại câu đã học từ lịch sử trước đây.
  Câu gốc tiếng Việt: "{currentQuest.vi}"
  Bản dịch gốc đã đề xuất trước đó: "{currentQuest.en}"
  
  Yêu Cầu Chấm Điểm:
  1. Hãy chấm điểm (0-100) dựa trên độ chính xác và tự nhiên của bản dịch hiện tại của học viên so với câu gốc. Hãy thật linh hoạt, chấp nhận các cách diễn đạt tương đương khác chứ không chỉ so sánh cứng nhắc từng từ.
  2. Đưa ra nhận xét ngắn và giải thích chi tiết vì sao học viên được điểm đó và có chỗ nào cần tinh chỉnh lại từ vựng cho giống người bản xứ hơn không.
  3. Phản hồi đúng cấu trúc JSON quy định.
  ```

#### 4. Prompt Tra Từ Bôi Đen Nhanh (`fetchSelectionDetails`)
* **Mục tiêu**: Tra phiên âm IPA và nghĩa tiếng Việt của từ/cụm từ tiếng Anh cực nhanh.
* **Prompt**:
  ```text
  Bạn là một từ điển Anh-Việt thông thái, nhanh nhẹn. Hãy tra cứu từ/cụm từ sau: "{word}".
  Trả về kết quả dưới định dạng JSON có cấu trúc chính xác sau đây:
  {
      "phonetic": "phiên âm IPA của từ, ví dụ /həˈloʊ/",
      "translation": "nghĩa tiếng Việt ngắn gọn, súc tích và dễ hiểu nhất"
  }
  ```

#### 5. Prompt Chấm Điểm Cụm Từ Vựng Dài (`checkVocabAnswerAI`)
* **Mục tiêu**: Chấm điểm ôn luyện đối với cụm từ vựng dài khi người dùng gõ nghĩa tương đương.
* **Prompt**:
  ```text
  Bạn là giáo viên tiếng Anh giao tiếp hỗ trợ ôn tập từ vựng/cụm từ.
  Học viên được yêu cầu dịch nghĩa tiếng Việt "{currentQuest.translation}" sang cụm từ tiếng Anh chuẩn: "{correctWord}".
  Học viên dịch là: "${userAnswer}"
  
  Yêu cầu:
  1. Đánh giá xem bản dịch của học viên có hoàn toàn tương đương, tự nhiên và đúng ngữ cảnh với cụm từ đích hay không.
  2. Chấm điểm (0-100). Nếu chỉ khác biệt nhỏ về mạo từ hoặc từ viết tắt mà vẫn đúng nghĩa, hãy cho điểm cao (>=80).
  3. Giải thích ngắn gọn bằng tiếng Việt vì sao được điểm đó.
  4. Trả về cấu trúc JSON đúng quy định.
  ```

---

## 4. Đặc tả Giao diện & Layout Responsive

Ứng dụng chia làm 2 vùng chính: **Header** và **Main Workspace (2 cột)**.

### A. Giao diện Header tối giản
* **Trạng thái**: Luôn nằm trên một hàng ngang (`flex justify-between items-center`), không được xuống hàng trên di động.
* **Logo**: Nằm bên trái, gồm biểu tượng mũ tốt nghiệp và text tiêu đề. Dòng chữ mô tả phụ bị ẩn trên di động (`hidden md:block`).
* **Cụm điều khiển**:
  * Nút **API Key**: Trên di động tự động ẩn chữ, chỉ hiển thị icon chìa khóa (`🔑`) để tiết kiệm chỗ.
  * Các nút bấm phụ (Tải Offline, Xuất, Nhập): Ẩn hoàn toàn trên di động (`hidden sm:flex`).
  * Nút **Cài đặt** (Icon bánh răng `fas fa-cog`): Chỉ hiển thị trên di động (`sm:hidden`). Khi click, hiển thị một **Dropdown Menu** định vị tuyệt đối bên dưới nút bấm.
  * Dropdown Menu chứa 3 nút thao tác phụ: Tải offline, Xuất file `.json`, Nhập file `.json`. Có cơ chế bấm ra ngoài để tự ẩn dropdown.

### B. Layout Main Workspace
* Chia dạng lưới: Trên di động là 1 cột xếp chồng, trên máy tính là grid 12 cột (Cột trái học tập chiếm 7/12, Cột phải tiện ích/lịch sử chiếm 5/12).
* **Cột trái**: Chứa các Workspace thay đổi động qua class `hidden`:
  1. `#learnModeSection` (Giao diện dịch câu hỏi chính).
  2. `#reviewModeSection` (Giao diện ôn tập câu thoại cũ).
  3. `#vocabReviewSection` (Giao diện ôn tập từ vựng).
* **Cột phải**:
  * Khối Tiến độ ngày học (Streak) kèm thanh Progress bar và các nút bắt đầu ôn tập.
  * Khối thống kê "Bảng vàng tích lũy".
  * Khối **Sổ tay & Lịch sử học tập (Dạng Tabs)**:
    * Có 2 tab: **"Câu thoại"** và **"Sổ tay từ"**.
    * Khi click vào mỗi tab, ẩn nội dung tab kia đi và hiển thị nội dung tab được chọn.
    * Mặc định cả câu tiếng Anh và nghĩa từ vựng đều bị ẩn trong danh sách để người dùng tự nhẩm ôn tập (bấm icon mắt để hiển thị đơn lẻ, hoặc bấm "Hiện tất cả").

---

## 5. Logic JavaScript Cốt Lõi

### A. Cơ chế bôi đen tra từ & Bottom Sheet (`handleTextSelection`)
```javascript
function handleTextSelection(e) {
    const popup = document.getElementById('selectionPopup');
    if (popup.contains(e.target)) return;

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    // Giới hạn chỉ tra từ 1 đến 5 từ tiếng Anh hợp lệ
    if (selectedText.length > 0 && selectedText.split(/\s+/).length <= 5 && /^[a-zA-Z\s,.'"-]+$/.test(selectedText)) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const isMobile = window.innerWidth < 640;
        
        if (isMobile) {
            // Tối ưu Mobile: Hiển thị Bottom Sheet cố định ở đáy màn hình
            popup.style.position = 'fixed';
            popup.style.bottom = '16px';
            popup.style.left = '16px';
            popup.style.right = '16px';
            popup.style.top = 'auto';
            popup.style.width = 'calc(100% - 32px)';
            popup.style.maxWidth = 'none';
            popup.querySelector('.absolute.-bottom-2')?.classList.add('hidden'); // Ẩn mũi tên
        } else {
            // Desktop: Popover nằm ngay trên đầu đoạn text bôi đen
            popup.style.position = 'fixed';
            popup.style.top = `${rect.top + window.scrollY - popup.offsetHeight - 12}px`;
            popup.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (popup.offsetWidth / 2)}px`;
            popup.style.bottom = 'auto';
            popup.style.right = 'auto';
            popup.style.width = '';
            popup.style.maxWidth = '280px';
            popup.querySelector('.absolute.-bottom-2')?.classList.remove('hidden'); // Hiện mũi tên
        }
        
        document.getElementById('popupWord').innerText = selectedText;
        document.getElementById('popupLoading').classList.remove('hidden');
        document.getElementById('popupResult').classList.add('hidden');
        popup.classList.remove('hidden');
        
        fetchSelectionDetails(selectedText);
    } else {
        // Nhấn chuột ra chỗ khác thì ẩn popup
        if (!popup.classList.contains('hidden') && 
            e.target.id !== 'popupTtsBtn' && !e.target.closest('#popupTtsBtn') && 
            e.target.id !== 'popupSaveBtn' && !e.target.closest('#popupSaveBtn')) {
            closeSelectionPopup();
        }
    }
}
```

### B. Logic chấm điểm Ôn tập từ vựng (`checkVocabAnswerAI`)
```javascript
async function checkVocabAnswerAI() {
    const userAnswer = document.getElementById('vocabReviewEnInput').value.trim();
    if (!userAnswer) return;

    const currentQuest = activeVocabReviews[currentVocabReviewIndex];
    const correctWord = currentQuest.word.trim();

    // 1. So khớp tuyệt đối nhanh không phân biệt hoa thường
    if (userAnswer.toLowerCase() === correctWord.toLowerCase()) {
        showVocabResult(100, "Chính xác tuyệt đối!", correctWord, "Rất tốt! Bạn đã dịch đúng hoàn toàn.");
        return;
    }

    // 2. Nếu là từ đơn/cụm từ ngắn (<= 2 từ): So khớp trực tiếp và kết luận sai ngay (tiết kiệm token)
    const isShortWord = correctWord.split(/\s+/).length <= 2;
    if (isShortWord) {
        showVocabResult(0, "Chưa chính xác!", correctWord, `Đáp án chính xác là: "${correctWord}".`);
        return;
    }

    // 3. Nếu là cụm từ dài: Gửi yêu cầu chấm điểm linh hoạt bằng AI Gemini
    try {
        const result = await callGemini(
            `Học viên dịch cụm từ là: "${userAnswer}"`,
            systemPromptForVocabReview // (Chứa prompt chấm điểm từ vựng ở mục 3.B.5)
        );
        showVocabResult(result.score || 0, result.title || "Kết quả", correctWord, result.explanation || "");
    } catch (error) {
        showVocabResult(0, "Chưa chính xác!", correctWord, `Lỗi kết nối AI. Đáp án chuẩn: "${correctWord}".`);
    }
}
```

### C. Cơ chế phát âm TTS (`speakText`)
Sử dụng `SpeechSynthesisUtterance` với ngôn ngữ `'en-US'`. Tinh chỉnh tốc độ đọc `utterance.rate = 0.95`. Lọc tìm kiếm giọng đọc US Google premium hoặc nội địa trong hệ thống để phát âm chân thực nhất. Khi phát âm, hiển thị thanh wavebar nổi kèm nút dừng (`window.speechSynthesis.cancel()`).

---

## 6. Danh sách kiểm tra chất lượng khi triển khai mới (Checklist)
* [ ] **API Key**: Modal cấu hình API Key phải kiểm tra chuỗi nhập vào bắt đầu bằng `"AIzaSy"`, nếu sai định dạng phải hiện cảnh báo màu đỏ.
* [ ] **Chạy Offline**: Hàm `downloadSelf()` phải lưu toàn bộ tài liệu HTML (`document.documentElement.outerHTML`) để người dùng tải về chạy ngoại tuyến bình thường.
* [ ] **An toàn Storage**: Phải bọc toàn bộ mã `localStorage` bằng khối `try-catch` để ứng dụng không bị sập (crash) khi chạy trực tiếp trên file cục bộ (`file://`).
* [ ] **Mobile-First Layout**: Xác thực Header luôn nằm trên 1 hàng ở mọi dòng điện thoại thông minh, không được làm vỡ cấu trúc CSS hay tạo thanh cuộn ngang.
