# Hướng Dẫn Deploy Lên Vercel & Đồng Bộ Đa Thiết Bị

Để ứng dụng có thể chạy trực tuyến và truy cập được từ mọi thiết bị (iPhone, Android, Máy tính khác...) với đầy đủ tính năng AI và Cloud Sync, bạn cần deploy dự án Next.js này lên **Vercel** (miễn phí và tối ưu nhất cho Next.js).

---

## Bước 1: Chuẩn bị Repository trên GitHub
1. Đảm bảo bạn đã đẩy toàn bộ code Next.js mới này lên kho chứa GitHub của bạn:
   ```bash
   git add .
   git commit -m "Migrate to Next.js with Supabase profile sync"
   git push origin main
   ```

---

## Bước 2: Đăng ký & Liên kết tài khoản Vercel
1. Truy cập vào trang web [Vercel.com](https://vercel.com/) và bấm **Sign Up**.
2. Chọn đăng ký bằng tài khoản **GitHub** của bạn để Vercel tự động liên kết danh sách repository.

---

## Bước 3: Tạo dự án mới trên Vercel
1. Sau khi đăng nhập vào Vercel Dashboard, nhấn nút **Add New...** -> **Project**.
2. Tìm kiếm repository tên là `DoVanThien.github.io` (hoặc tên repository của bạn) trong danh sách và bấm **Import**.

---

## Bước 4: Cấu hình Biến môi trường (Quan trọng)
Trước khi bấm nút Deploy, bạn cần cấu hình các biến môi trường để Vercel chạy được AI và kết nối Database:
1. Cuộn xuống phần **Environment Variables**.
2. Thêm các biến sau (tùy theo dịch vụ bạn sử dụng):
   - **Tên:** `NEXT_PUBLIC_SUPABASE_URL` -> **Giá trị:** *(URL supabase của bạn)*
   - **Tên:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` -> **Giá trị:** *(Anon key supabase của bạn)*
   - **Tên:** `GEMINI_API_KEY` -> **Giá trị:** *(API key Gemini của bạn - bắt đầu bằng AIza...)*
   - **Tên:** `AGENTROUTER_API_KEY` -> **Giá trị:** *(API key từ agentrouter.org/console/token - bắt đầu bằng sk-...)*
   - *(Tùy chọn)* **Tên:** `AGENTROUTER_MODEL` -> **Giá trị:** `deepseek-chat` (hoặc `gpt-4o-mini`, `claude-3-5-sonnet`)
   - *(Tùy chọn nâng cao)* **Tên:** `AI_API_KEYS` -> Chứa nhiều API key xoay vòng cách nhau bởi dấu phẩy hoặc xuống dòng (hỗ trợ cả `agentrouter:sk-...`, `gsk_...`, `AIza...`, `csk-...`, v.v.).
3. Bấm **Add** (hoặc **Save**) cho từng biến.

---

## Bước 5: Tiến hành Deploy
1. Sau khi cấu hình xong các biến, bấm nút **Deploy**.
2. Chờ khoảng 1-2 phút để Vercel tự động biên dịch và triển khai ứng dụng.
3. Khi hoàn tất, Vercel sẽ cấp cho bạn một đường dẫn URL miễn phí (ví dụ: `https://dovanthien-github-io.vercel.app` hoặc tương tự).

---

## Bước 6: Truy cập & Trải nghiệm trên mọi thiết bị
1. **Truy cập:** Mở trình duyệt trên bất kỳ thiết bị nào (điện thoại, tablet, máy tính) và truy cập đường dẫn URL Vercel cung cấp ở trên.
2. **Cài đặt PWA lên iPhone (Add to Home Screen):**
   - Mở URL trên bằng trình duyệt **Safari** của iPhone.
   - Bấm vào nút **Chia sẻ (Share)** ở thanh menu phía dưới của Safari.
   - Chọn **Thêm vào MH chính (Add to Home Screen)**.
   - Ứng dụng sẽ xuất hiện trên màn hình chính như một app native thực thụ!
3. **Sử dụng:** Chọn cùng một **Tên hồ sơ (Profile)** trên các thiết bị, dữ liệu dịch bài và từ vựng sẽ tự động đồng bộ qua đám mây ngay lập tức nhờ Supabase.

---

## Roommate Hub (`/roommate`) — Bật đồng bộ cho cả phòng

Roommate Hub dùng chung Supabase của dự án (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

1. Mở **Supabase Dashboard → SQL Editor → New query**.
2. Dán toàn bộ nội dung file `supabase/roommate_schema.sql` và bấm **Run**.
   - File chạy lại nhiều lần vẫn an toàn.
   - Nếu trước đây đã chạy bản schema cũ (id kiểu UUID, mảng JSONB), file sẽ **tự nâng cấp bảng mà vẫn giữ nguyên dữ liệu**.
3. (Khuyến nghị) **Database → Replication**: kiểm tra 6 bảng `roommate_*` đã nằm trong publication `supabase_realtime` — file SQL đã tự thêm, mục này chỉ để kiểm tra. Nếu Realtime tắt, app vẫn tự đồng bộ mỗi 45 giây và khi mở lại app.
4. Mở `/roommate`, vào **Cần mua & cài đặt → Đồng bộ & dữ liệu**: dòng trạng thái phải là **“Đã đồng bộ với cả phòng”**.

Ghi chú:
- App hoạt động ngoại tuyến: thay đổi được lưu trên máy và tự gửi lên khi có mạng.
- Không có đăng nhập (đúng thiết kế): ai có link app đều vào được phòng. Không nên chia sẻ link công khai.
- Có thể “Thêm vào màn hình chính” trên iPhone/Android để dùng như một app (manifest riêng: `/roommate-manifest.json`).
