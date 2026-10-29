# Thiết Kế Chi Tiết: Ứng Dụng Quản Lý Sống Chung & Nhà Trọ (Roommate Hub)

- **Ngày tạo:** 2026-10-28
- **Đường dẫn ứng dụng (dự kiến):** `/roommate` (tích hợp thẻ lối vào trên trang chủ Portal `/` của `DoVanThien.github.io`)
- **Quy mô:** Một dự án độc lập (Full Project) nằm trong hệ sinh thái Next.js hiện có.

---

## 1. Mục Đích & Lý Do Xây Dựng (Intent & Why)

Những người sống chung nhà hoặc chung phòng trọ thường gặp hai vấn đề gây mất hòa khí nhất:
1. **Việc nhà không rõ ràng:** Không nhớ tới lượt ai dọn, dọn sót việc nhỏ trong checklist, hoặc người này phải làm hộ người kia nhưng qua tuần sau lịch vẫn xoay vòng như chưa có gì xảy ra.
2. **Tiền nong lắt nhắt & Hóa đơn chồng chéo:** Nhiều người cùng ứng tiền mua đồ chung, cộng thêm hóa đơn điện nước cố định hàng tháng khiến việc tính toán ai nợ ai bao nhiêu trở nên rối rắm.

Ứng dụng **Roommate Hub** giải quyết triệt để hai vấn đề này bằng trải nghiệm tối giản: cả phòng dùng chung một không gian dữ liệu duy nhất, mỗi người mở link trên điện thoại riêng chỉ cần nhập tên một lần đầu, mọi việc nhà xoay tua có kiểm chứng ("tự làm" vs "làm hộ") và mọi khoản chi tiêu + hóa đơn cố định đều được tự động cấn trừ công nợ chéo.

---

## 2. Mục Tiêu, Phi Mục Tiêu & Điều Cần Tránh (Goals, Non-Goals, Anti-Goals)

### Mục tiêu (Goals)
- **Định danh tức thì không cần mật khẩu:** Mở link lần đầu hiển thị màn hình nhập tên $\rightarrow$ đồng bộ vào bảng thành viên trên Supabase (hoặc khớp với thành viên đã có tên trùng) và lưu `member_id` vào `localStorage`. Từ lần sau vào thẳng app; có thể sửa tên, avatar, thông tin VietQR trong Cài đặt.
- **Quản lý việc nhà xoay tua có điều kiện nghiêm ngặt:**
  - Hỗ trợ chu kỳ: **Hàng ngày (Daily)**, **Hàng tuần (Weekly)**, **Hàng tháng (Monthly)**.
  - Mỗi đầu việc lớn có danh sách các công việc nhỏ (checklist) tùy chỉnh thêm/sửa/xóa.
  - Mỗi mục nhỏ trong checklist được gán cho người phụ trách của đợt hiện tại.
  - Ghi nhận rõ ai là người bấm tích hoàn thành từng mục nhỏ (Tự tích vs Tích hộ).
  - **Luật chuyển giao đợt mới:** Chỉ khi toàn bộ checklist của đầu việc đó được hoàn thành **VÀ** không có bất kỳ mục nào bị người khác "tích hộ" thì đợt kế tiếp mới xoay sang thành viên tiếp theo trong vòng xoay. Nếu chưa tích hết hoặc có mục do người khác tích hộ, đợt kế tiếp vẫn giữ nguyên ở người cũ.
- **Chi tiêu chung & Khấu trừ nợ tự động (Debt Simplification):**
  - Ghi chép khoản chi: số tiền, mô tả, ngày, người trả tiền (`paid_by`), và danh sách những người cùng chia (`split_among` - mặc định chọn tất cả thành viên, có thể bỏ chọn từng người để chia đều cho những người được chọn).
  - Tự động tính số dư ròng (Net Balance) của từng người và chạy thuật toán tối giản giao dịch để đưa ra danh sách chuyển khoản ít nhất (ví dụ: *Hùng chuyển cho Minh 420.000đ*).
  - Hỗ trợ nút **"Đã thanh toán / Chốt sổ"** (tạo bản ghi thanh toán bù trừ công nợ) và nút **"Hiện mã VietQR"** (nếu người nhận đã cấu hình ngân hàng + số tài khoản).
- **Hóa đơn cố định & Biểu đồ biến động (Fixed Bills & Charts):**
  - Danh mục hóa đơn cố định có thể tùy chỉnh thêm/sửa/xóa (mặc định gợi ý: Tiền điện, Tiền nước, Tiền phòng, Wifi/Rác).
  - Khi nhập số tiền hóa đơn của tháng mới:
    1. Lưu vào lịch sử hóa đơn cố định để hiển thị trên **Biểu đồ phân tích giữa các tháng** (Chart.js).
    2. **Tự động tạo một khoản chi tiêu tương ứng** (với người ứng tiền trả hóa đơn và những người cùng chia) để cộng thẳng vào bảng công nợ chung.
- **Danh sách đồ cần mua chung (Shopping List):**
  - Ghi nhanh món đồ sắp hết (nước rửa chén, giấy vệ sinh, gas...).
  - Khi một thành viên đi mua và bấm **"Đã mua"**, mở popup nhập nhanh số tiền $\rightarrow$ tự động chuyển thành khoản chi tiêu chung và gạch khỏi danh sách cần mua.

### Phi mục tiêu (Non-Goals)
- Không xây dựng hệ thống đăng nhập phức tạp bằng Email/Password hay OAuth (Google/Facebook).
- Không quản lý nhiều phòng trọ (multi-tenant phức tạp với phân quyền Admin/Owner); mặc định thiết kế xoay quanh 1 phòng chung (tương tự kiến trúc multi-profile dùng chung của `Poop Tracker`).
- Không tích hợp cổng thanh toán ngân hàng tự động (Webhook ngân hàng); việc xác nhận "Đã thanh toán" do thành viên tự bấm xác nhận sau khi chuyển khoản.

### Điều cần tránh (Anti-Goals)
- **Tránh tự ý xoay vòng lịch dọn dẹp khi việc chưa xong hoặc làm đối phó:** Hệ thống tuyệt đối không được chuyển việc sang người mới khi sang ngày/tuần/tháng mới nếu người cũ chưa tích đủ hoặc để người khác phải tích hộ.
- **Tránh mất dữ liệu khi 2 người thao tác cùng lúc:** Không lưu toàn bộ dữ liệu phòng vào một cục JSON duy nhất gây ghi đè chéo.
- **Tránh bắt buộc nhập thông tin nhạy cảm:** Thông tin tài khoản ngân hàng (VietQR) phải hoàn toàn là tùy chọn (Optional).

---

## 3. Ràng Buộc Kỹ Thuật (Constraints)

- **Nền tảng hiện có:** Tích hợp trực tiếp vào repo Next.js (`16.2.10`), React (`19.2.4`), TypeScript, Tailwind CSS v4, Zustand (`5.0.14`), Chart.js (`4.5.1` + `react-chartjs-2`), `lucide-react`, và `@supabase/supabase-js` đã cài sẵn.
- **Quy tắc Next.js:** Tuân thủ cấu trúc App Router hiện tại của dự án (`src/app/...`).
- **Hoạt động Offline / Fallback:** Giống như `src/lib/poop-store.ts`, store Zustand phải hoạt động mượt mà ngay cả khi biến môi trường Supabase chưa cấu hình hoặc bảng trên Supabase chưa được tạo (lưu song song vào `localStorage` và tự động đồng bộ với Supabase khi khả dụng).

---

## 4. Các Phương Án Kiến Trúc Đã Cân Nhắc (Approaches)

### Phương án 1: Bảng Supabase Chuyên Biệt + LocalStorage Fallback + Lazy Rollover (Đã chọn)
- **Cơ chế:** Chia dữ liệu thành các bảng độc lập trên Supabase (`roommate_members`, `roommate_chores`, `roommate_expenses`, `roommate_fixed_bills`, `roommate_shopping_items`). Kiểm tra chuyển chu kỳ việc nhà (Lazy Rollover) ngay khi mở app dựa trên mốc thời gian kỳ hiện tại (`current_period_key`).
- **Ưu điểm:** Không bị xung đột ghi đè khi nhiều người dùng cùng lúc trên nhiều điện thoại; truy vấn rõ ràng; không cần chạy Cronjob phía server; vẫn chạy tốt ở chế độ LocalStorage nếu chưa chạy SQL.
- **Nhược điểm:** Cần viết schema SQL cho các bảng (sẽ cung cấp sẵn file `.sql` để chạy trên Supabase SQL Editor).

### Phương án 2: Lưu trữ Single-Document JSON
- **Cơ chế:** Gom toàn bộ dữ liệu phòng vào 1 dòng JSON duy nhất trên Supabase.
- **Lý do loại bỏ:** Dễ xảy ra race condition (mất dữ liệu của nhau) khi hai thành viên cùng tích việc nhà hoặc thêm chi tiêu trên hai điện thoại riêng biệt.

---

## 5. Chi Tiết Thiết Kế Đã Thống Nhất (Agreed Design Details)

### 5.1. Luồng Định Danh & Quản Lý Thành Viên (Onboarding & Profile)
- Thiết bị kiểm tra `localStorage.getItem('roommate_active_member_id')`.
- **Nếu chưa có:** Hiển thị màn hình **Chào mừng vào phòng**:
  - Ô nhập **Tên của bạn** + chọn nhanh **Avatar/Màu đại diện**.
  - Nếu dưới danh sách đã có sẵn các thành viên trong phòng (tải từ Supabase), người dùng cũng có thể bấm chọn trực tiếp vào tên mình nếu đang đăng nhập từ thiết bị thứ 2, hoặc nhập tên mới để tạo hồ sơ mới.
- **Trong tab Cài đặt (Settings):**
  - Cho phép sửa **Tên**, **Avatar**.
  - Cấu hình **VietQR (Tùy chọn):** Chọn Ngân hàng (mã BIN/shortName theo chuẩn VietQR như `MB`, `VCB`, `TCB`, `ACB`, `BIDV`, `VPB`, `TPB`...), Số tài khoản, Tên chủ tài khoản. Tự động sinh URL ảnh QR qua `https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<INFO>&accountName=<NAME>`.
  - Cho phép thêm thành viên mới vào phòng hoặc chuyển đổi sang tên thành viên khác trên thiết bị hiện tại.

### 5.2. Mô Hình & Logic Việc Nhà Xoay Tua (Chores & Rotation Engine)
Mỗi đầu việc (`ChoreTask`) bao gồm:
- `id`: UUID
- `title`: Tên đầu việc (VD: *"Trực nhật khu vực chung"*, *"Đổ rác & Dọn bếp"*)
- `frequency`: `'daily' | 'weekly' | 'monthly'`
- `member_order`: Mảng `string[]` chứa danh sách `member_id` theo thứ tự xoay vòng (mặc định gồm tất cả thành viên trong phòng, có thể sắp xếp hoặc chọn những ai tham gia đầu việc này).
- `current_assignee_id`: `member_id` của người đang chịu trách nhiệm trong đợt hiện tại.
- `current_period_key`: Chuỗi định danh đợt hiện tại theo múi giờ Việt Nam (`YYYY-MM-DD` cho ngày, `YYYY-Www` cho tuần bắt đầu từ Thứ Hai, `YYYY-MM` cho tháng).
- `checklist`: Mảng các việc nhỏ (`ChoreSubtask`):
  - `id`: UUID
  - `title`: Tên việc nhỏ (VD: *"Quét nhà"*, *"Cọ bồn rửa bát"*)
  - `completed`: `boolean`
  - `completed_by_member_id`: `string | null` (Lưu người thực sự bấm tích)
  - `completed_at`: `string | null`
- `last_rollover_note`: Ghi chú trạng thái từ đợt trước (VD: *"Đợt trước giữ nguyên ở Minh vì chưa hoàn thành hết"* hoặc *"Đợt trước giữ nguyên ở Minh vì Lan đã tích hộ mục Cọ toilet"*).

#### Quy tắc Tích Checklist & Xoay Vòng:
1. **Khi người dùng hiện tại (`activeMemberId`) bấm tích một việc nhỏ:**
   - Nếu người bấm chính là `current_assignee_id`: Đánh dấu `completed = true`, `completed_by_member_id = activeMemberId` (Hiển thị nhãn xanh: *"Đã tự làm"*).
   - Nếu người bấm **KHÁC** `current_assignee_id`: Đánh dấu `completed = true`, `completed_by_member_id = activeMemberId` (Hiển thị nhãn vàng: *"⚡ [Tên người bấm] tích hộ"*).
   - Nếu bỏ tích (uncheck): Reset `completed = false`, `completed_by_member_id = null`.
2. **Khi chuyển sang đợt mới** (tự động khi `getPeriodKey(frequency) !== chore.current_period_key` hoặc khi bấm nút *"Kết thúc đợt / Sang kỳ mới"*):
   - Kiểm tra điều kiện xoay vòng (`canRotate`):
     - `checklist.length > 0`
     - Mọi mục trong `checklist` đều có `completed === true`
     - Mọi mục trong `checklist` đều có `completed_by_member_id === current_assignee_id` (tức không có mục nào bị người khác tích hộ).
   - **Nếu `canRotate === true`:**
     - Tìm vị trí của `current_assignee_id` trong `member_order`, chuyển `current_assignee_id` sang người kế tiếp: `(index + 1) % member_order.length`.
     - Đặt `last_rollover_note = "Đã hoàn thành tốt đợt trước — chuyển sang lượt mới"`.
   - **Nếu `canRotate === false`:**
     - **Giữ nguyên** `current_assignee_id` (không xoay sang người mới).
     - Đặt `last_rollover_note` giải thích rõ lý do (chưa tích hết hoặc có người tích hộ ở đợt trước).
   - Sau đó reset toàn bộ `checklist` về `completed = false`, `completed_by_member_id = null` và cập nhật `current_period_key` sang kỳ hiện tại.

### 5.3. Mô Hình Chi Tiêu, Hóa Đơn Cố Định & Khấu Trừ Công Nợ
1. **Khoản chi tiêu (`ExpenseRecord`):**
   - `id`, `title` (mô tả), `amount` (số tiền VNĐ), `date` (`YYYY-MM-DD`), `paid_by_member_id` (ai trả), `split_member_ids` (mảng `member_id` những người cùng chia), `category` (`'daily' | 'fixed_bill' | 'shopping' | 'settlement'`), `fixed_bill_id` (nếu sinh ra từ hóa đơn cố định).
2. **Thuật toán Khấu trừ công nợ tự động (Debt Simplification):**
   - Với mỗi khoản chi `E` (bao gồm cả chi tiêu thường, hóa đơn cố định, và các lần trả nợ `settlement`):
     - Người trả (`paid_by_member_id`) được cộng `+E.amount`.
     - Mỗi người trong `split_member_ids` (gồm $N$ người) bị trừ `- (E.amount / N)`.
   - Tổng hợp lại thành mảng `netBalance` cho từng thành viên (Tổng dương = đang được nợ, Tổng âm = đang mắc nợ).
   - Tách thành danh sách **Chủ nợ (Creditors > 0)** và **Con nợ (Debtors < 0)**, khớp cặp tham lam (Greedy matching) từ khoản lớn nhất để tạo ra số giao dịch chuyển khoản tối thiểu.
   - Khi bấm **"Đã thanh toán"** trên một cặp nợ (*A trả B số tiền X*): Hệ thống tạo một bản ghi `ExpenseRecord` loại `'settlement'` với `paid_by_member_id = A`, `split_member_ids = [B]`, `amount = X`, giúp số dư nợ giữa hai bên lập tức về 0 mà vẫn lưu lại lịch sử minh bạch.
3. **Hóa đơn cố định (`FixedBillConfig` & `FixedBillEntry`):**
   - Danh mục hóa đơn cố định (`FixedBillConfig`): `id`, `name` (VD: *Tiền điện*, *Tiền nước*, *Tiền phòng*, *Wifi*), `icon`, `color`, `unit_note` (VD: *kWh*, *m³*, *Tháng*). Có thể thêm/sửa/xóa tự do.
   - Khi nhập hóa đơn tháng mới (`month_key: 'YYYY-MM'`, `amount`, `paid_by_member_id`, `split_member_ids`, `note`):
     - Lưu/cập nhật vào lịch sử tháng đó của danh mục cố định để vẽ biểu đồ (Chart.js: biểu đồ cột chồng hoặc đường so sánh tổng và từng khoản Điện/Nước qua các tháng).
     - Đồng thời tự động tạo (hoặc cập nhật nếu nhập lại cùng tháng) khoản chi tương ứng trong `ExpenseRecord` để cộng thẳng vào công nợ chung.

### 5.4. Bố Cục Giao Diện 4 Tab (Phương Án A)
- **Header chung trên cùng:** Tên phòng, hiển thị thành viên đang đăng nhập trên thiết bị này (kèm nút đổi nhanh hoặc vào Cài đặt), và tóm tắt nhanh trạng thái cá nhân (số việc cần làm & số dư công nợ của bản thân).
- **Tab 1 — Việc Nhà & Lịch (`Chores`):**
  - Bộ lọc xem theo chu kỳ: *Tất cả / Hàng ngày / Hàng tuần / Hàng tháng*.
  - Danh sách thẻ Đầu việc: Hiện rõ người trực đợt này, vòng xoay thành viên, thanh tiến độ checklist, các checkbox việc nhỏ (hiện nhãn người tích / tích hộ), thông báo lý do nếu bị giữ nguyên từ đợt trước, và nút Thêm/Sửa đầu việc + tùy chỉnh checklist.
- **Tab 2 — Chi Tiêu & Công Nợ (`Expenses`):**
  - Khối **Tối giản giao dịch (Ai cần trả ai):** Nút bật Modal mã **VietQR** (tự điền đúng số tiền & nội dung chuyển khoản) và nút **Đã thanh toán**.
  - Nút thêm khoản chi mới (chọn người mua, nhập tiền, mô tả, tick chọn những ai chia tiền).
  - Lịch sử các khoản chi tiêu gần đây (có thể lọc hoặc xóa nếu nhập nhầm).
- **Tab 3 — Điện Nước & Cố Định (`Fixed Bills`):**
  - Biểu đồ trực quan (Chart.js) so sánh chi phí cố định giữa các tháng (xem tổng hoặc lọc theo Điện, Nước, Phòng...).
  - Danh sách các danh mục hóa đơn cố định của tháng đang chọn: Hiển thị số tiền tháng này, % tăng/giảm so với tháng trước, nút **Nhập số tiền kỳ này** (tự đẩy vào công nợ) và nút **Quản lý danh mục cố định** (thêm/sửa/xóa loại hóa đơn).
- **Tab 4 — Cần Mua & Cài Đặt (`Shopping & Settings`):**
  - Phần **Shopping List:** Thêm món đồ sắp hết, bấm *"Đã mua"* $\rightarrow$ nhập giá tiền và người trả $\rightarrow$ tự động đẩy sang Tab 2.
  - Phần **Hồ sơ & Cài đặt phòng:** Sửa tên của mình, avatar, cấu hình ngân hàng VietQR (tùy chọn), quản lý danh sách thành viên trong phòng.

---

### 5.5. Ngôn Ngữ Thiết Kế (Design System): Lấy Cảm Hứng Từ "Structured - Daily Planner"
Tham khảo trực tiếp từ ứng dụng **[Structured: Daily Planner Todo App](https://apps.apple.com/us/app/structured-daily-planner-todo/id1499198946)** cho cả giao diện **Mobile** và **Web (Desktop)**:
- **Bảng màu (Color Palette) Ấm Áp & Tinh Tế:**
  - Nền chính màu kem/giấy ấm sáng (`#FAF6F0` / `#F5EFE6` ở chế độ sáng hoặc nền tối dịu `#18181B` / `#1F1F23` nếu bật Dark Mode, ưu tiên mặc định tone kem sáng ấm áp đặc trưng của Structured).
  - Màu nhấn (Accent Colors) dạng Pastel bão hòa vừa phải cho từng danh mục/đầu việc: Hồng đào/Cam san hô (`#E88D72` / `#F28482` - màu thương hiệu của Structured), Xanh Mint/Sage (`#84A59D`), Vàng Mù Tạt dịu (`#F6BD60`), Tím Lavender (`#9D8189`), Xanh Dương Pastel (`#7EA8BE`).
- **Trục Thời Gian Trực Quan (Visual Vertical Timeline):**
  - Ở Tab **Việc nhà & Lịch** (và lịch sử chi tiêu), các đầu việc không xếp dạng bảng khô khan mà nối với nhau dọc theo **một trục đường kẻ dọc bên trái (Vertical Timeline Spine)**:
    - Mỗi đầu việc có vòng tròn icon màu pastel nằm trên trục dọc, nối bằng đường kẻ liền hoặc nét đứt tới đầu việc tiếp theo.
    - Bên phải trục là thẻ công việc bo góc tròn lớn (`rounded-3xl` / `24px`), hiển thị rõ người trực, tiến độ (`2/3 việc nhỏ`) và các checkbox hình tròn mềm mại.
- **Lịch Ngang Đầu Trang (Horizontal Date/Period Strip):**
  - Phía trên khu vực nội dung có thanh chọn kỳ/ngày dạng dải ngang (Pill Strip) giống thanh chọn ngày trong tuần của Structured, kết hợp bộ lọc Ngày / Tuần / Tháng với hiệu ứng trượt mượt mà.
- **Tương Thích Mobile & Web (Responsive Adaptation):**
  - **Mobile (< 768px):** Khung nhìn chuẩn ứng dụng iOS của Structured với Header ngày/kỳ lớn, trục timeline dọc ở trung tâm, nút dấu cộng nổi (`+` Floating Action Button màu san hô `#E88D72`) và thanh **Bottom Tab Bar** bo tròn dạng pill nổi ở đáy.
  - **Web / Desktop (≥ 768px):** Mở rộng theo phong cách Structured trên iPad/Mac — thanh Sidebar bo tròn bên trái chứa điều hướng + thông tin thành viên hiện tại, phần chính chia bố cục 2 cột thoáng đãng (cột trái là trục Timeline chính / Danh sách, cột phải là bảng chi tiết Checklist, Khấu trừ công nợ hoặc Biểu đồ phân tích).

- **Dữ liệu khởi tạo mặc định (Default Seed Data) khi phòng mới tinh:**
  - **Các danh mục hóa đơn cố định mẫu:** Tiền điện (`kWh`), Tiền nước (`m³`), Tiền phòng (`Tháng`), Wifi / Internet (`Tháng`), Phí vệ sinh / Rác (`Tháng`) — tất cả đều có thể sửa hoặc xóa tùy ý.
  - **Một số đầu việc nhà cơ bản mẫu:**
    1. *Trực nhật bếp & Đổ rác* (Hàng ngày): Rửa bát/dọn bồn rửa, Lau bàn ăn & bếp, Buộc và mang rác đi đổ.
    2. *Tổng vệ sinh phòng & Nhà tắm* (Hàng tuần): Quét và lau sàn nhà, Cọ bồn cầu & lavabo, Lau gương & kệ đồ.
    3. *Vệ sinh định kỳ cuối tháng* (Hàng tháng): Lau quạt / lưới lọc điều hòa, Dọn tủ lạnh & bỏ đồ hết hạn.

---

## 6. Những Phần Dành Cho Người Triển Khai Quyết Định (Left to the Builder)

- Chi tiết micro-interactions, hiệu ứng chuyển cảnh (Framer Motion mượt mà theo phong cách iOS/Structured, đồng bộ hài hòa với ngôn ngữ thiết kế hiện tại) và bộ icon minh họa cho từng đầu việc/hóa đơn.
- Cấu trúc chia nhỏ các file component bên trong `src/app/roommate/` và `src/lib/roommate-store.ts`.
- Xử lý làm tròn tiền VNĐ khi chia lẻ (làm tròn đến hàng đơn vị đồng để hiển thị đẹp mắt).
