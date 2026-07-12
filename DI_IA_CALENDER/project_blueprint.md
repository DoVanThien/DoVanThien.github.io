# Đặc Tả Kiến Trúc Dự Án: Poop Tracker PWA v5.3
> **Tài liệu hướng dẫn tái lập dự án dành cho AI Agent và Lập trình viên**

Tài liệu này đặc tả chi tiết toàn bộ dự án **Poop Tracker** (Hệ thống theo dõi sức khỏe tiêu hóa và nạp nước chéo thiết bị). Mục tiêu là cung cấp đầy đủ thông tin về tính năng, kiến trúc dữ liệu, cấu trúc mã nguồn, thiết kế UI/UX và quy trình đồng bộ hóa để bất kỳ AI Agent nào cũng có thể tái lập lại 100% dự án này từ đầu trên một workspace mới.

---

## 1. Tổng Quan Hệ Thống & Trải Nghiệm Người Dùng (UX)

Poop Tracker là một ứng dụng Web dạng **PWA (Progressive Web App)** chạy offline-first, hỗ trợ đồng bộ hóa trực tuyến qua mạng LAN/Internet.

### 1.1 Các Phân Hệ Chức Năng Chính
1.  **Dashboard (Màn hình chính)**:
    *   **Thống kê nhanh**: Hiển thị số ngày liên tục uống đủ nước (Water Streak), chuỗi ngày tiêu hóa khỏe mạnh (Healthy Streak) và lượng nước nạp vào ngày hôm nay.
    *   **Ghi nhanh**: Nút ghi nhanh đại tiện, ăn uống, uống nước. Nạp nhanh nước với các mốc định sẵn (250ml, 500ml, 750ml, 1000ml) theo từng loại đồ uống (Nước lọc, Nước ngọt, Trà/Cà phê, Bia rượu,...).
2.  **Lịch (Calendar View)**:
    *   Hiển thị theo tháng hoặc năm. Mỗi ô ngày hiển thị chấm tròn màu tương ứng với trạng thái tiêu hóa (Đỏ: táo bón, Xanh lá: lý tưởng, Tím: tiêu chảy, Vàng: rặn không ra).
    *   **Popup Chi tiết ngày**: Xem dòng sự kiện chi tiết của ngày được chọn.
    *   **Khóa tương lai**: Nếu chọn ngày lớn hơn ngày hiện tại, tất cả các nút ghi log và card nạp nước sẽ bị khóa xám (`.disabled-gray`) và không cho phép click.
3.  **Hồ Sơ Thành Viên (Profiles)**:
    *   Cho phép tạo nhiều profile (chỉ Owner của thiết bị mới được thêm/sửa/xóa profile).
    *   **Tính toán tự động**: Nhập Tuổi, Cân nặng, Chiều cao để hệ thống tự tính lượng nước mục tiêu khuyến nghị: $\text{Goal (ml)} = \text{Weight (kg)} \times 35$.
    *   **Ảnh đại diện**: Chọn emoji nhanh hoặc tải ảnh cá nhân từ thư viện (chuyển sang Base64 dưới 250KB để lưu trữ).
    *   **Popup mời thành viên**: Tự động sinh mã mời `PT-XXXXXX`. Khi mở popup, tự động copy mã mời vào clipboard và hiện Toast thông báo.
4.  **Phân Tích & So Sánh (Analytics)**:
    *   Biểu đồ cột biểu diễn lượng nước nạp vào, biểu đồ tròn phân tích loại phân (Bristol Scale).
    *   **So sánh 2 hồ sơ**: Chỉ active khi hệ thống có từ 2 profiles trở lên. Cho phép chọn profile thứ 2 để đối chiếu trực quan các chỉ số tiêu hóa/nạp nước.
    *   **Phân tích AI**: Trình mô phỏng bác sĩ AI phân tích nhật ký ăn uống và đại tiện để đưa ra lời khuyên sức khỏe.
5.  **Hệ Thống Đồng Bộ Hai Chiều (Cloud Sync)**:
    *   Mỗi thiết bị là Owner của profile gốc của mình.
    *   Khi thiết bị B (Guest) nhập mã mời của Owner A: Profile gốc của Guest B sẽ liên kết trực tiếp với Sub-profile của Owner A trên Server DB.
    *   Logs của Guest B sẽ tự động đẩy lên Server và Owner A sẽ nhìn thấy tức thời trên màn hình của mình dưới tên profile phụ đó.

---

## 2. Kiến Trúc Kỹ Thuật (Tech Stack)

*   **Frontend**: HTML5 (Cấu trúc ngữ nghĩa), Javascript ES6+ (Hướng đối tượng, xử lý bất đồng bộ Async-Await), CSS3 (Vanilla CSS, Custom Variables, Flexbox, CSS Grid).
*   **Icons**: Lucide Icons (Tải qua CDN script).
*   **Backend**: Node.js với `express` và `cors` làm REST API Server.
*   **Database**: JSON file database (`db.json`) lưu trữ trực tiếp trên Server để tối giản việc cài đặt.

### Cấu trúc thư mục dự án
```text
/di_ia_calender
├── index.html          # File giao diện HTML chính
├── styles.css          # Hệ thống CSS Design System & Layout Modals
├── app.js              # Logic ứng dụng Frontend chính (OOP style)
├── firebase-config.js  # Lớp CloudEngine xử lý HTTP Fetch API gửi lên Server
├── server.js           # Server Node.js Express Backend
├── package.json        # Khai báo dependencies của Node.js
└── db.json             # File cơ sở dữ liệu JSON dùng chung (Tự sinh khi chạy server)
```

---

## 3. Đặc Tả Chi Tiết Mã Nguồn Cốt Lõi

Để tái lập dự án, hãy tạo các file với cấu trúc mã nguồn chuẩn dưới đây:

### 3.1 Giao diện `index.html` (Phần Khung Giao Diện & Modals)
File HTML cần nhúng thư viện Lucide Icons và định nghĩa đầy đủ 6 modal overlays.
```html
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Poop Tracker - Sức Khỏe Tiêu Hóa</title>
    <link rel="stylesheet" href="styles.css">
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body>
    <div class="app-container">
        <!-- Sidebar / Navigation -->
        <!-- Tab Panes: Calendar, Analytics, Profiles, Settings -->
    </div>

    <!-- HỆ THỐNG MODAL OVERLAYS (6 Modals) -->
    <!-- 1. profileModal (Thêm/Sửa hồ sơ) -->
    <!-- 2. poopModal (Ghi log đại tiện) -->
    <!-- 3. foodModal (Ghi log ăn uống) -->
    <!-- 4. waterModal (Ghi log nước chi tiết) -->
    <!-- 5. joinGroupModal (Nhập mã kết nối) -->
    <!-- 6. avatarPickerModal (Chọn avatar emoji) -->

    <script src="firebase-config.js"></script>
    <script src="app.js"></script>
</body>
</html>
```

### 3.2 Hệ thống CSS `styles.css` (Hệ thống cuộn Modal & Giao diện)
Đặc biệt chú trọng cơ chế sửa lỗi cuộn Modal khi nội dung body dài.
```css
/* DESIGN SYSTEM VARIABLES */
:root {
    --bg-app: #f8fafc;
    --bg-modal: #ffffff;
    --color-primary: #6366f1;
    --color-border: #e2e8f0;
    --color-text-muted: #64748b;
    --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* KHÓA CUỘN TRANG CHỦ KHI MODAL MỞ */
body.modal-open {
    overflow: hidden !important;
}

/* MODAL CONTAINER LAYOUT (FLEXBOX) */
.modal {
    background: var(--bg-modal);
    border: 1px solid var(--color-border);
    border-radius: 24px;
    width: 90%;
    max-width: 480px;
    max-height: 85vh; /* Khống chế chiều cao modal tối đa */
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: var(--shadow-lg);
    animation: zoomIn 0.25s ease forwards;
}

.modal-header {
    padding: 20px 24px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0; /* Không bao giờ bị co rút */
}

/* PHẦN THÂN MODAL - ÉP CHIỀU CAO TỐI ĐA ĐỂ KÍCH HOẠT THANH CUỘN */
.modal-body {
    padding: 24px;
    overflow-y: auto; /* Kích hoạt scroll dọc */
    max-height: calc(85vh - 140px); /* 140px = chiều cao ước lượng của Header + Footer */
    flex: 1 1 auto;
    -webkit-overflow-scrolling: touch; /* Cuộn mượt trên iOS */
}

.modal-footer {
    padding: 20px 24px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-shrink: 0; /* Cố định footer dưới đáy */
    background: var(--bg-modal);
}
```

### 3.3 Backend API `server.js` (Express Server)
Server Node.js siêu nhẹ thực hiện trung chuyển dữ liệu chéo thiết bị qua internet.
```javascript
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');

// Khởi tạo DB nếu chưa tồn tại
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ inviteCodes: {}, logs: {} }, null, 2));
}

function readDB() {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Đăng ký mã mời từ Owner
app.post('/api/register', (req, res) => {
    const { inviteCode, ownerDeviceId, profileId } = req.body;
    const db = readDB();
    db.inviteCodes[inviteCode] = { ownerDeviceId, profileId, isClaimed: false, claimedBy: null };
    if (!db.logs[profileId]) {
        db.logs[profileId] = { poopLogs: [], waterLogs: [], foodLogs: [] };
    }
    writeDB(db);
    res.json({ success: true });
});

// 2. Guest liên kết mã mời
app.post('/api/claim', (req, res) => {
    const { inviteCode, guestDeviceId } = req.body;
    const db = readDB();
    const info = db.inviteCodes[inviteCode];
    if (info) {
        info.isClaimed = true;
        info.claimedBy = guestDeviceId;
        writeDB(db);
        return res.json({ success: true, profileId: info.profileId });
    }
    res.status(404).json({ error: 'Mã không tồn tại!' });
});

// 3. Đọc dữ liệu logs của profile nhóm
app.get('/api/logs/:inviteCode', (req, res) => {
    const { inviteCode } = req.params;
    const db = readDB();
    const info = db.inviteCodes[inviteCode];
    if (info) {
        const logs = db.logs[info.profileId] || { poopLogs: [], waterLogs: [], foodLogs: [] };
        return res.json({ success: true, logs });
    }
    res.status(404).json({ error: 'Không tìm thấy nhóm!' });
});

// 4. Đẩy logs của nhóm lên server
app.post('/api/logs/:inviteCode', (req, res) => {
    const { inviteCode } = req.params;
    const { poopLogs, waterLogs, foodLogs } = req.body;
    const db = readDB();
    const info = db.inviteCodes[inviteCode];
    if (info) {
        db.logs[info.profileId] = { poopLogs, waterLogs, foodLogs };
        writeDB(db);
        return res.json({ success: true });
    }
    res.status(404).json({ error: 'Không tìm thấy nhóm!' });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
```

### 3.4 Lớp Giao Tiếp `firebase-config.js` (Cloud Engine REST Client)
Class trung gian thực hiện fetch kết nối trực tuyến tới server API.
```javascript
class LocalCloudMock {
    constructor() {
        this.isMock = true;
        this.listeners = [];
        this.serverUrl = 'http://localhost:3000'; // Có thể thay bằng IP LAN mạng Wifi
    }

    async registerInviteCode(inviteCode, ownerDeviceId, profileId) {
        try {
            await fetch(`${this.serverUrl}/api/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode, ownerDeviceId, profileId })
            });
        } catch (e) {
            console.warn('Kết nối server thất bại: registerInviteCode', e);
        }
    }

    async claimInviteCode(inviteCode, guestDeviceId) {
        try {
            const res = await fetch(`${this.serverUrl}/api/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteCode, guestDeviceId })
            });
            if (!res.ok) return null;
            return await res.json(); // Trả về { success: true, profileId }
        } catch (e) {
            console.error('Kết nối server thất bại: claimInviteCode', e);
            return null;
        }
    }

    async getCloudLogs(inviteCode) {
        try {
            const res = await fetch(`${this.serverUrl}/api/logs/${inviteCode}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.logs;
        } catch (e) {
            console.warn('Kết nối server thất bại: getCloudLogs', e);
            return null;
        }
    }

    async pushCloudLogs(inviteCode, poopLogs, waterLogs, foodLogs) {
        try {
            await fetch(`${this.serverUrl}/api/logs/${inviteCode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poopLogs, waterLogs, foodLogs })
            });
        } catch (e) {
            console.warn('Kết nối server thất bại: pushCloudLogs', e);
        }
    }
}
window.CloudEngine = new LocalCloudMock();
```

### 3.5 Logic Xử Lý `app.js` (Trích xuất các hàm Đồng Bộ & Khóa Modal)
```javascript
class PoopTrackerApp {
    constructor() {
        // Khởi tạo mảng logs, settings, profiles
        this.init();
    }

    async init() {
        this.loadDataFromStorage();
        await this.setupDefaultProfileIfNeeded();
        // Setup listeners, render UI...
    }

    // HELPER KHÓA MỞ VÀ TỰ ĐỘNG KHÓA SCROLL BODY CHÍNH
    openModal(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    closeModal(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.remove('show');
            const openModals = document.querySelectorAll('.modal.show, .modal-overlay.show');
            if (openModals.length === 0) {
                document.body.classList.remove('modal-open');
            }
        }
    }

    // ĐỒNG BỘ ĐẨY LOGS LÊN CLOUD SERVER (Async)
    async pushLogsToCloud() {
        const activeProfile = this.getActiveProfile();
        if (activeProfile && activeProfile.inviteCode) {
            const poop = this.poopLogs.filter(l => l.profileId === activeProfile.id);
            const water = this.waterLogs.filter(l => l.profileId === activeProfile.id);
            const food = this.foodLogs.filter(l => l.profileId === activeProfile.id);
            await window.CloudEngine.pushCloudLogs(activeProfile.inviteCode, poop, water, food);
        }
    }

    // ĐỒNG BỘ KÉO LOGS TỪ CLOUD SERVER VỀ CỤC BỘ (Async)
    async pullLogsFromCloud() {
        let changed = false;
        for (const profile of this.profiles) {
            if (profile.inviteCode) {
                const cloudData = await window.CloudEngine.getCloudLogs(profile.inviteCode);
                if (cloudData) {
                    this.poopLogs = this.poopLogs.filter(l => l.profileId !== profile.id).concat(cloudData.poopLogs || []);
                    this.waterLogs = this.waterLogs.filter(l => l.profileId !== profile.id).concat(cloudData.waterLogs || []);
                    this.foodLogs = this.foodLogs.filter(l => l.profileId !== profile.id).concat(cloudData.foodLogs || []);
                    changed = true;
                }
            }
        }
        if (changed) {
            this.saveDataToStorage();
            this.renderCalendar();
        }
    }

    // GUEST NHẬP MÃ MỜI VÀ THỰC THI ÁNH XẠ PROFILE ID (Async)
    async joinGroup(e) {
        e.preventDefault();
        const code = document.getElementById('joinGroupCodeInput').value.trim().toUpperCase();
        if (!code) return;

        const cloudInfo = await window.CloudEngine.claimInviteCode(code, 'device_guest_current');
        if (cloudInfo) {
            const oldProfileId = this.profiles[0].id;
            const newProfileId = cloudInfo.profileId;

            // Ánh xạ ID profile gốc sang ID của Owner tạo ra
            this.profiles[0].id = newProfileId;
            this.profiles[0].inviteCode = code;
            this.profiles[0].name = `Thành viên nhóm (${code})`;

            // Chuyển toàn bộ logs cũ sang ID mới
            this.poopLogs.forEach(l => { if (l.profileId === oldProfileId) l.profileId = newProfileId; });
            this.waterLogs.forEach(l => { if (l.profileId === oldProfileId) l.profileId = newProfileId; });
            this.foodLogs.forEach(l => { if (l.profileId === oldProfileId) l.profileId = newProfileId; });

            this.activeProfileId = newProfileId;
            this.saveDataToStorage();
            await this.pushLogsToCloud(); // Đẩy đồng bộ logs của Guest lên Server

            this.closeModal('joinGroupModal');
            this.showToast('Gia nhập nhóm và đồng bộ dữ liệu trực tuyến thành công!', 'success');
        } else {
            this.showToast('Mã mời không chính xác hoặc đã được liên kết!', 'error');
        }
    }
}
```

---

## 4. Các Quy Tắc UI/UX & logic Thiết Kế Cần Tuân Thủ Khi Xây Dựng Lại

1.  **Luôn Lock Scroll Body**: Bắt buộc thêm `body.modal-open` khi mở modal để khóa thanh cuộn nền của trình duyệt, tập trung trải nghiệm cuộn vào trong modal.
2.  **Khóa Ngày Tương Lai**: Bất kỳ popup chi tiết lịch nào mở ra cho ngày lớn hơn ngày hiện tại, thuộc tính `finalCanWrite` phải chuyển thành `false`, thêm class `disabled-gray` cho các nút và khóa sự kiện click mở nhanh modal ghi nước.
3.  **Tự Động Tính Mục Tiêu Nước**: Khi người dùng nhập Cân nặng trong màn hình sửa/tạo hồ sơ, ô nạp nước mục tiêu phải tự động cập nhật ngay lập tức theo công thức khuyến khuyến nghị ($35\text{ml} / \text{kg}$).
4.  **Đồng bộ CORS**: File backend `server.js` luôn phải khai báo `cors()` cho phép truy cập chéo tên miền để tránh việc các trình duyệt khách bị chặn API chéo cổng local.
