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
    try {
        return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        return { inviteCodes: {}, logs: {} };
    }
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 1. Đăng ký mã mời từ Owner
app.post('/api/register', (req, res) => {
    const { inviteCode, ownerDeviceId, profileId } = req.body;
    if (!inviteCode || !profileId) {
        return res.status(400).json({ error: 'Thiếu thông tin đăng ký!' });
    }
    const db = readDB();
    db.inviteCodes[inviteCode] = {
        ownerDeviceId,
        profileId,
        isClaimed: db.inviteCodes[inviteCode] ? db.inviteCodes[inviteCode].isClaimed : false,
        claimedBy: db.inviteCodes[inviteCode] ? db.inviteCodes[inviteCode].claimedBy : null
    };
    if (!db.logs[profileId]) {
        db.logs[profileId] = {
            poopLogs: [],
            waterLogs: [],
            foodLogs: []
        };
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
    res.status(404).json({ error: 'Mã mời không chính xác hoặc không tồn tại trên hệ thống!' });
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
app.listen(PORT, () => {
    console.log(`Poop Tracker Server đang chạy tại: http://localhost:${PORT}`);
});
