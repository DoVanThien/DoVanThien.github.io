# Kế Hoạch Triển Khai (Implementation Plan): Roommate Hub — Quản Lý Sống Chung & Nhà Trọ

- **Tài liệu thiết kế gốc:** [2026-10-28-roommate-app-design.md](file:///d:/ThienDV/AI_Generation_App/DoVanThien.github.io/docs/superpowers/specs/2026-10-28-roommate-app-design.md)
- **Ngày lập kế hoạch:** 2026-10-28
- **Ngôn ngữ thiết kế:** Lấy cảm hứng từ **Structured - Daily Planner** (Tone màu kem ấm `#FAF6F0`, accent pastel san hô `#E88D72` / xanh sage `#84A59D` / vàng dịu `#F6BD60`, trục dọc Timeline Spine, pill-strip chọn kỳ, tương thích hoàn hảo cả Mobile & Web).

---

## Giai Đoạn 1: Cơ Sở Dữ Liệu (Supabase SQL Schema) & Zustand Store (`src/lib/roommate-store.ts`)

1. **Tạo file SQL Schema (`supabase/roommate_schema.sql`):**
   - Bảng `roommate_members`: `id` (UUID), `name`, `avatar`, `color`, `bank_bin`, `bank_short_name`, `bank_account_no`, `bank_account_name`, `created_at`.
   - Bảng `roommate_chores`: `id` (UUID), `title`, `icon`, `color`, `frequency` (`daily` | `weekly` | `monthly`), `member_order` (JSONB `string[]`), `current_assignee_id`, `current_period_key`, `checklist` (JSONB `ChoreSubtask[]`), `last_rollover_note`, `created_at`.
   - Bảng `roommate_expenses`: `id` (UUID), `title`, `amount` (numeric), `date`, `paid_by_member_id`, `split_member_ids` (JSONB `string[]`), `category` (`daily` | `fixed_bill` | `shopping` | `settlement`), `fixed_bill_id`, `month_key`, `note`, `created_at`.
   - Bảng `roommate_fixed_bills`: `id` (UUID), `name`, `icon`, `color`, `unit_note`, `history` (JSONB `FixedBillMonthEntry[]`), `created_at`.
   - Bảng `roommate_shopping_items`: `id` (UUID), `title`, `added_by_member_id`, `note`, `is_bought`, `created_at`.

2. **Xây dựng Store & Logic Nghiệp Vụ (`src/lib/roommate-store.ts`):**
   - **Đồng bộ Kép (Supabase + LocalStorage Fallback):** Hoạt động tức thì ngay cả khi chưa chạy SQL trên Supabase, tự động đồng bộ đám mây khi bảng tồn tại.
   - **Seed Data Mặc Định:**
     - **Hóa đơn cố định mẫu:** Tiền điện (`kWh`), Tiền nước (`m³`), Tiền phòng (`Tháng`), Wifi / Internet (`Tháng`), Phí vệ sinh / Rác (`Tháng`).
     - **Đầu việc nhà mẫu:**
       1. *Trực nhật bếp & Đổ rác* (Hàng ngày)
       2. *Tổng vệ sinh phòng & Nhà tắm* (Hàng tuần)
       3. *Vệ sinh định kỳ cuối tháng* (Hàng tháng)
   - **Engine Xoay Tua Việc Nhà (Rotation & Tick-hộ Engine):**
     - Hàm `getPeriodKey(frequency)` lấy mốc `YYYY-MM-DD`, `YYYY-Www` (từ Thứ Hai), `YYYY-MM`.
     - Hàm `toggleSubtask(choreId, subtaskId)` ghi nhận `completed_by_member_id = activeMemberId`. Nếu `activeMemberId !== current_assignee_id` $\rightarrow$ đánh dấu trạng thái **Tích hộ**.
     - Hàm `checkAndRolloverChores()` và `rolloverSingleChore(choreId)`: Kiểm tra nếu `checklist` hoàn thành 100% **VÀ** mọi mục đều do chính `current_assignee_id` tự tích $\rightarrow$ chuyển `current_assignee_id` sang người kế tiếp trong `member_order`. Ngược lại $\rightarrow$ giữ nguyên `current_assignee_id` và lưu lý do vào `last_rollover_note`.
   - **Engine Khấu Trừ Công Nợ (Debt Simplification):**
     - Hàm `calculateNetBalances(members, expenses)` và `simplifyDebts(balances)` trả về danh sách giao dịch chuyển khoản tối giản nhất (`fromMemberId`, `toMemberId`, `amount`).

---

## Giai Đoạn 2: Hệ Thống Giao Diện Theo Phong Cách "Structured" (`src/app/roommate/`)

1. **Tạo Style & Theme (`src/app/roommate/styles.css`):**
   - Định nghĩa biến màu Structured (`--st-bg: #FAF6F0`, `--st-card: #FFFFFF`, `--st-coral: #E88D72`, `--st-sage: #84A59D`, `--st-amber: #F6BD60`, `--st-lavender: #9D8189`, `--st-blue: #7EA8BE`, `--st-ink: #2C2623`) cùng chế độ Dark Mode tùy chọn.
   - Đường trục dọc Timeline (`timeline-spine`), thẻ bo góc lớn (`24px`), nút checkbox tròn có hiệu ứng nảy mềm mại.

2. **Màn Hình Định Danh Lần Đầu (Onboarding Modal / Screen):**
   - Khi thiết bị chưa có `activeMemberId` trong `localStorage`: hiển thị màn hình nhập tên (hoặc chọn tên đã có trên hệ thống phòng), chọn avatar & màu sắc pastel, lưu vào DB + `localStorage`.

3. **Bố Cục 4 Tab Chính (Responsive Mobile Bottom Bar + Desktop Sidebar):**
   - **Tab 1 — Việc Nhà & Lịch (`ChoresTimelineView`):**
     - Thanh chọn chu kỳ ngang (Pill Strip: *Tất cả • Hàng ngày • Hàng tuần • Hàng tháng*).
     - Trục dọc **Structured Timeline**: Mỗi đầu việc có vòng tròn icon màu pastel bên trái, thẻ công việc bên phải hiển thị người phụ trách đợt này, vòng xoay thành viên, cảnh báo giữ nguyên lượt nếu đợt trước chưa xong/tích hộ, danh sách checkbox việc nhỏ (hiện rõ nhãn *"Đã tự làm"* hoặc *"⚡ [Tên] tích hộ"*), nút chuyển kỳ/chốt đợt, và Modal Thêm/Sửa đầu việc + tùy chỉnh checklist.
   - **Tab 2 — Chi Tiêu & Công Nợ (`ExpensesAndDebtsView`):**
     - Khối **Tối giản giao dịch (Ai trả ai)**: Hiển thị các khoản cần chuyển sau khi đã cấn trừ chéo, nút **Hiện mã VietQR** (tự sinh mã QR đúng số tiền & nội dung nếu người nhận đã cài ngân hàng) và nút **Đã thanh toán**.
     - Trục timeline lịch sử các khoản chi tiêu (ghi rõ số tiền, mô tả, ai mua, chia cho những ai) + Modal Thêm khoản chi mới.
   - **Tab 3 — Hóa Đơn Cố Định & Biểu Đồ (`FixedBillsChartView`):**
     - Biểu đồ `Chart.js` (Bar / Line chart) phân tích biến động tiền điện, nước, chi phí cố định giữa các tháng.
     - Danh sách thẻ Hóa đơn cố định (thêm/sửa/xóa danh mục tùy ý): nút **Nhập hóa đơn kỳ mới** $\rightarrow$ tự động lưu vào biểu đồ tháng đó **VÀ** tự động tạo khoản chi cộng thẳng vào công nợ chung.
   - **Tab 4 — Cần Mua & Cài Đặt (`ShoppingAndSettingsView`):**
     - **Danh sách đồ cần mua chung (Shopping List):** Thêm món đồ sắp hết, bấm *"Đã mua"* $\rightarrow$ nhập nhanh số tiền $\rightarrow$ tự động chuyển thành mục chi tiêu chung.
     - **Cài đặt cá nhân & Phòng:** Đổi tên, đổi avatar/màu, cài đặt thông tin ngân hàng **VietQR** (tùy chọn không bắt buộc), quản lý danh sách thành viên trong phòng.

---

## Giai Đoạn 3: Tích Hợp Trang Chủ Portal & Kiểm Thử

1. **Cập nhật Trang Chủ (`src/app/page.tsx`):**
   - Thêm thẻ ứng dụng **Roommate Hub (Sống Chung & Nhà Trọ)** vào danh sách ứng dụng độc bản trên trang chủ.
2. **Kiểm tra Lỗi Biên dịch & Linter:**
   - Chạy kiểm tra TypeScript / Next.js build để đảm bảo không có lỗi cú pháp hoặc xung đột kiểu dữ liệu.
