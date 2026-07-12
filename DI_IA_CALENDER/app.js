// APP STATE MANAGEMENT v3.0
class PoopTrackerApp {
    constructor() {
        this.profiles = [];
        this.activeProfileId = null;
        this.poopLogs = []; // Array of { id, profileId, date, time, success, bristolType, symptoms: [], notes }
        this.waterLogs = []; // Array of { id, profileId, date, amount }
        this.foodLogs = []; // Array of { id, profileId, date, time, foodName, mealType, portionSize }
        this.settings = {
            theme: 'light',
            waterReminder: false,
            reminderInterval: 120, // minutes
            smartwatchSync: false
        };

        // Navigation state
        this.currentTab = 'calendar';
        this.calendarViewMode = 'month'; // month, week, year
        this.calendarDate = new Date(); // Date cursor

        // Chart instances
        this.bowelChart = null;
        this.waterChart = null;

        // Emoji list for avatar picker
        this.avatarList = [
            '🍎', '🍏', '🍋', '🍇', '🍑', '🥑', '🥦', '🥕', '💧', '🥗', 
            '🍲', '👶', '🧔', '👩', '👵', '👴', '🐶', '🐱', '🦁', '🐻', 
            '🐼', '🐨', '🦊', '🐯', '🐸', '🐷', '🦖', '🦄', '💪', '❤️'
        ];

        // Badge system definitions
        this.badgeDefinitions = [
            {
                id: 'discipline',
                title: 'Chiến Binh Kỷ Luật 🛡️',
                desc: 'Sử dụng ứng dụng liên tiếp và có ghi nhật ký bất kỳ trong 7 ngày.',
                icon: '🛡️'
            },
            {
                id: 'anti_consti',
                title: 'Dũng Sĩ Diệt Táo 🍏',
                desc: 'Đạt chuỗi tiêu hóa khỏe mạnh lý tưởng (táo xanh) liên tục 3 ngày.',
                icon: '⚔️'
            },
            {
                id: 'hydrate_king',
                title: 'Nhà Vô Địch Hydrate 💧',
                desc: 'Đạt mục tiêu nước uống liên tiếp trong 5 ngày.',
                icon: '👑'
            },
            {
                id: 'healthy_food',
                title: 'Thực Thần Lành Mạnh 🥗',
                desc: 'Ghi nhật ký ăn uống 10 bữa ăn lành mạnh vừa no và không bị sự cố.',
                icon: '🥗'
            },
            {
                id: 'early_bird',
                title: 'Thần Y Dậy Sớm 🌅',
                desc: 'Đi đại tiện thành công vào khung giờ vàng (5h - 8h sáng) ít nhất 3 lần.',
                icon: '🌅'
            },
            {
                id: 'water_pro',
                title: 'Đại Dương Bao La 🌊',
                desc: 'Uống đạt mốc 3000ml nước trở lên trong một ngày duy nhất.',
                icon: '🌊'
            },
            {
                id: 'fiber_expert',
                title: 'Bậc Thầy Chất Xơ 🥦',
                desc: 'Ăn các thực phẩm nhiều xơ (rau, quả, yến mạch...) ít nhất 5 lần.',
                icon: '🥦'
            },
            {
                id: 'perfect_month',
                title: 'Tháng Vàng Tiêu Hóa 🏆',
                desc: 'Ghi nhận 15 ngày phân lý tưởng (táo xanh) trong 30 ngày gần đây.',
                icon: '🏆'
            }
        ];

        // Initialize App
        this.init();
    }

    // Initialize data and load events (async)
    async init() {
        this.loadDataFromStorage();
        await this.setupDefaultProfileIfNeeded();
        this.applyTheme(this.settings.theme);
        
        // Render UI
        this.renderProfileSelectors();
        this.updateActiveProfileUI();
        this.renderAvatarPickerOptions();
        this.setupDefaultAnalyticsPickers();
        this.setupEventListeners();
        await this.switchTab(this.currentTab);
        this.renderCalendar();
        this.checkHealthAlerts();
        this.updateSmartwatchWidget();
        this.updatePermissionsUI();
        
        // Set default value for Mock Role Selector in Settings
        const user = window.CloudEngine.getAuthUser();
        const mockSel = document.getElementById('mockRoleSelector');
        if (mockSel) mockSel.value = user.role;
        
        // Initialize Lucide Icons
        lucide.createIcons();
    }

    // Load data from LocalStorage
    loadDataFromStorage() {
        try {
            const profilesData = localStorage.getItem('pt_profiles');
            const poopLogsData = localStorage.getItem('pt_poop_logs');
            const waterLogsData = localStorage.getItem('pt_water_logs');
            const foodLogsData = localStorage.getItem('pt_food_logs');
            const settingsData = localStorage.getItem('pt_settings');
            const activeProfileIdData = localStorage.getItem('pt_active_profile_id');

            if (profilesData) this.profiles = JSON.parse(profilesData);
            if (poopLogsData) this.poopLogs = JSON.parse(poopLogsData);
            if (waterLogsData) this.waterLogs = JSON.parse(waterLogsData);
            if (foodLogsData) this.foodLogs = JSON.parse(foodLogsData);
            if (settingsData) this.settings = { ...this.settings, ...JSON.parse(settingsData) };
            if (activeProfileIdData) this.activeProfileId = activeProfileIdData;
        } catch (e) {
            console.error('Lỗi khi đọc dữ liệu từ localStorage', e);
        }
    }

    // Save data to LocalStorage
    saveDataToStorage() {
        localStorage.setItem('pt_profiles', JSON.stringify(this.profiles));
        localStorage.setItem('pt_poop_logs', JSON.stringify(this.poopLogs));
        localStorage.setItem('pt_water_logs', JSON.stringify(this.waterLogs));
        localStorage.setItem('pt_food_logs', JSON.stringify(this.foodLogs));
        localStorage.setItem('pt_settings', JSON.stringify(this.settings));
        localStorage.setItem('pt_active_profile_id', this.activeProfileId);
    }

    // Setup a default profile if none exists (async)
    async setupDefaultProfileIfNeeded() {
        if (this.profiles.length === 0) {
            const defaultProfile = {
                id: 'p_' + Date.now(),
                name: 'Người dùng',
                avatar: '🍎',
                gender: 'male',
                age: 25,
                weight: 60,
                height: 165,
                waterGoal: 2300,
                badges: [],
                inviteCode: 'PT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                isClaimed: false,
                maxWaterStreak: 0,
                maxHealthyStreak: 0
            };
            this.profiles.push(defaultProfile);
            this.activeProfileId = defaultProfile.id;
            this.saveDataToStorage();
            
            // Đăng ký profile mặc định lên Cloud
            await window.CloudEngine.registerInviteCode(defaultProfile.inviteCode, 'device_owner', defaultProfile.id);
        }

        if (!this.activeProfileId || !this.profiles.find(p => p.id === this.activeProfileId)) {
            this.activeProfileId = this.profiles[0].id;
            this.saveDataToStorage();
        }

        // Backward compatibility: ensure all properties exist and register them on Cloud Mock
        for (const p of this.profiles) {
            if (!p.badges) p.badges = [];
            if (!p.inviteCode) p.inviteCode = 'PT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            if (p.isClaimed === undefined) p.isClaimed = false;
            if (p.maxWaterStreak === undefined) p.maxWaterStreak = 0;
            if (p.maxHealthyStreak === undefined) p.maxHealthyStreak = 0;
            
            // Đăng ký mã mời lên Cloud DB
            await window.CloudEngine.registerInviteCode(p.inviteCode, 'device_owner', p.id);
        }

        // Tải logs đồng bộ từ Cloud DB về cục bộ
        await this.pullLogsFromCloud();
    }

    // Helper to get HTML display of avatar (either emoji or Base64 image)
    getAvatarHTML(avatar) {
        if (avatar && avatar.startsWith('data:image/')) {
            return `<img src="${avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%; display:block;">`;
        }
        return avatar || '🍎';
    }

    // Helper to show generic custom Toast notifications
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type} shadow-blur`;
        toast.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            padding: 12px 24px;
            border-radius: 12px;
            color: white;
            font-weight: 700;
            font-size: 0.85rem;
            z-index: 9999;
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            text-align: center;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            pointer-events: none;
            width: 90%;
            max-width: 360px;
        `;
        if (type === 'success') {
            toast.style.background = 'linear-gradient(135deg, var(--color-apple-green) 0%, var(--color-apple-green-dark) 100%)';
        } else if (type === 'error') {
            toast.style.background = 'linear-gradient(135deg, var(--color-apple-red) 0%, var(--color-apple-red-dark) 100%)';
        } else {
            toast.style.background = 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)';
        }
        toast.innerText = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.transform = 'translateX(-50%) translateY(0)';
            toast.style.opacity = '1';
        }, 50);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Push current active profile logs to Mock Cloud DB
    async pushLogsToCloud() {
        const activeProfile = this.getActiveProfile();
        if (activeProfile && activeProfile.inviteCode) {
            const poop = this.poopLogs.filter(l => l.profileId === activeProfile.id);
            const water = this.waterLogs.filter(l => l.profileId === activeProfile.id);
            const food = this.foodLogs.filter(l => l.profileId === activeProfile.id);
            await window.CloudEngine.pushCloudLogs(activeProfile.inviteCode, poop, water, food);
        }
    }

    // Pull logs of all linked profiles from Mock Cloud DB to local storage (Two-Way merge)
    async pullLogsFromCloud() {
        let changed = false;
        for (const profile of this.profiles) {
            if (profile.inviteCode) {
                const cloudData = await window.CloudEngine.getCloudLogs(profile.inviteCode);
                if (cloudData) {
                    const localPoops = this.poopLogs.filter(l => l.profileId === profile.id);
                    const localWaters = this.waterLogs.filter(l => l.profileId === profile.id);
                    const localFoods = this.foodLogs.filter(l => l.profileId === profile.id);
                    
                    const cloudPoops = cloudData.poopLogs || [];
                    const cloudWaters = cloudData.waterLogs || [];
                    const cloudFoods = cloudData.foodLogs || [];

                    if (localPoops.length !== cloudPoops.length || 
                        localWaters.length !== cloudWaters.length || 
                        localFoods.length !== cloudFoods.length) {
                        
                        // Merge/replace local with cloud data for this profile
                        this.poopLogs = this.poopLogs.filter(l => l.profileId !== profile.id).concat(cloudPoops);
                        this.waterLogs = this.waterLogs.filter(l => l.profileId !== profile.id).concat(cloudWaters);
                        this.foodLogs = this.foodLogs.filter(l => l.profileId !== profile.id).concat(cloudFoods);
                        changed = true;
                    }
                }
            }
        }
        if (changed) {
            this.saveDataToStorage();
            if (this.currentTab === 'calendar') {
                this.renderCalendar();
                this.updateWaterProgressBar();
                this.updateStreaksUI();
            } else if (this.currentTab === 'analytics') {
                this.renderAnalyticsTab();
            }
        }
    }

    // Helper to open modal with body scroll locking
    openModal(id) {
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('show');
            document.body.classList.add('modal-open');
        }
    }

    // Helper to close modal with body scroll locking check
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

    // Get Active Profile Object
    getActiveProfile() {
        return this.profiles.find(p => p.id === this.activeProfileId) || this.profiles[0];
    }

    // Apply Theme (light / dark)
    applyTheme(theme) {
        this.settings.theme = theme;
        const body = document.body;
        if (theme === 'dark') {
            body.classList.remove('theme-light');
            body.classList.add('theme-dark');
            document.getElementById('themeToggleText').innerText = 'Chế độ sáng';
            document.getElementById('settingsThemeToggle').innerText = 'Chế độ sáng';
        } else {
            body.classList.remove('theme-dark');
            body.classList.add('theme-light');
            document.getElementById('themeToggleText').innerText = 'Chế độ tối';
            document.getElementById('settingsThemeToggle').innerText = 'Chế độ tối';
        }
        this.saveDataToStorage();
    }

    // Setup default values for month & year pickers on load
    setupDefaultAnalyticsPickers() {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        document.getElementById('analyticsMonthPicker').value = `${yyyy}-${mm}`;
        this.populateYearPicker(yyyy);
    }

    // Populate year picker options dynamically based on logs
    populateYearPicker(currentYear) {
        const yearSelect = document.getElementById('analyticsYearPicker');
        if (!yearSelect) return;
        yearSelect.innerHTML = '';
        
        const years = [currentYear];
        const allLogs = [...this.poopLogs, ...this.waterLogs, ...this.foodLogs];
        allLogs.forEach(log => {
            if (log.date) {
                const y = parseInt(log.date.split('-')[0]);
                if (y && !years.includes(y)) years.push(y);
            }
        });
        
        years.sort((a, b) => b - a);
        years.forEach(y => {
            const option = document.createElement('option');
            option.value = y;
            option.innerText = `Năm ${y}`;
            yearSelect.appendChild(option);
        });
    }

    // Setup Avatar Picker Modal Grid
    renderAvatarPickerOptions() {
        const grid = document.getElementById('avatarPickerGrid');
        grid.innerHTML = '';

        this.avatarList.forEach(emoji => {
            const item = document.createElement('div');
            item.className = 'avatar-option-large';
            item.innerText = emoji;
            
            item.addEventListener('click', () => {
                grid.querySelectorAll('.avatar-option-large').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                
                document.getElementById('profileSelectedAvatarPreview').innerText = emoji;
                document.getElementById('profileAvatarField').value = emoji;
                document.getElementById('avatarPickerModal').classList.remove('show');
            });

            grid.appendChild(item);
        });
    }

    // Setup Navigation Tabs switcher
    async switchTab(tabName) {
        await this.pullLogsFromCloud();
        this.currentTab = tabName;
        
        // Update nav items UI
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.getAttribute('data-tab') === tabName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Show/hide tab panels
        document.querySelectorAll('.tab-pane').forEach(pane => {
            if (pane.id === `tab-${tabName}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('active');
            }
        });

        document.getElementById('pageTitle').innerText = {
            'calendar': 'Lịch Theo Dõi',
            'analytics': 'Thống Kê Tiêu Hóa',
            'profiles': 'Hồ Sơ Thành Viên',
            'settings': 'Cài Đặt Hệ Thống'
        }[tabName] || 'Poop Tracker';

        if (tabName === 'calendar') {
            this.renderCalendar();
            this.updateWaterProgressBar();
            this.updateStreaksUI();
        } else if (tabName === 'analytics') {
            this.renderAnalyticsTab();
        } else if (tabName === 'profiles') {
            this.renderProfilesTabList();
            this.renderBadgesShelf();
        } else if (tabName === 'settings') {
            this.loadSettingsTabValues();
        }
        
        this.updatePermissionsUI();
    }

    // Render Profile Switcher List in dropdown
    renderProfileSelectors() {
        const list = document.getElementById('profileDropdownList');
        list.innerHTML = '';

        this.profiles.forEach(profile => {
            const item = document.createElement('div');
            item.className = `profile-dropdown-item ${profile.id === this.activeProfileId ? 'active' : ''}`;
            item.innerHTML = `
                <div class="profile-avatar">${profile.avatar}</div>
                <div class="profile-name">${profile.name}</div>
            `;
            item.addEventListener('click', async () => {
                await this.pullLogsFromCloud();
                this.activeProfileId = profile.id;
                this.saveDataToStorage();
                this.updateActiveProfileUI();
                this.renderProfileSelectors();
                this.updatePermissionsUI();
                
                if (this.currentTab === 'calendar') {
                    this.renderCalendar();
                    this.updateWaterProgressBar();
                    this.updateStreaksUI();
                } else if (this.currentTab === 'analytics') {
                    this.renderAnalyticsTab();
                }
                this.checkHealthAlerts();
                this.updateSmartwatchWidget();
                
                document.getElementById('profileDropdown').classList.remove('show');
            });
            list.appendChild(item);
        });

        this.updateCompareProfileDropdown();
    }

    // Populate comparison dropdown in analytics
    updateCompareProfileDropdown() {
        const select = document.getElementById('compareProfileSelect');
        const compareCheckbox = document.getElementById('compareProfilesCheckbox');
        const compareGroup = document.getElementById('compareProfileSelectGroup');
        
        if (!select || !compareCheckbox || !compareGroup) return;
        select.innerHTML = '';
        
        const otherProfiles = this.profiles.filter(p => p.id !== this.activeProfileId);
        if (otherProfiles.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.innerText = 'Không có hồ sơ khác';
            select.appendChild(option);
            
            compareCheckbox.disabled = true;
            compareCheckbox.checked = false;
            compareGroup.classList.add('hide');
        } else if (otherProfiles.length === 1) {
            // Có 2 profiles (1 profile khác)
            compareCheckbox.disabled = false;
            compareGroup.classList.add('hide'); // Ẩn dropdown vì chỉ có duy nhất 1 đối tác so sánh
            
            const profile = otherProfiles[0];
            const option = document.createElement('option');
            option.value = profile.id;
            option.innerText = profile.name;
            select.appendChild(option);
        } else {
            // Có từ 3 profiles trở lên (nhiều hơn 2 profiles)
            compareCheckbox.disabled = false;
            if (compareCheckbox.checked) {
                compareGroup.classList.remove('hide');
            } else {
                compareGroup.classList.add('hide');
            }
            
            otherProfiles.forEach(profile => {
                const option = document.createElement('option');
                option.value = profile.id;
                option.innerText = profile.name;
                select.appendChild(option);
            });
        }
    }

    // Update active profile display info in header & water stats
    updateActiveProfileUI() {
        const profile = this.getActiveProfile();
        document.getElementById('activeName').innerText = profile.name;
        document.getElementById('activeAvatar').innerHTML = this.getAvatarHTML(profile.avatar);
        this.updateWaterProgressBar();
        this.updateStreaksUI();
    }

    // Calculate daily water stats for progress bar
    updateWaterProgressBar() {
        const profile = this.getActiveProfile();
        const todayStr = this.formatDateStr(new Date());
        
        const todayWater = this.waterLogs
            .filter(log => log.profileId === profile.id && log.date === todayStr)
            .reduce((sum, log) => sum + this.getEffectiveWater(log.amount, log.beverageType), 0);
        
        const goal = profile.waterGoal || 2000;
        const percent = Math.min(Math.round((todayWater / goal) * 100), 100);

        document.getElementById('headerWaterText').innerText = `${todayWater}/${goal} ml`;
        document.getElementById('waterCurrentVal').innerText = todayWater;
        document.getElementById('waterGoalVal').innerText = `/ ${goal} ml`;
        document.getElementById('waterPercentText').innerText = `${percent}%`;
        document.getElementById('waterProgressBar').style.height = `${percent}%`;

        // Hiệu ứng fill nước dạng chất lỏng cho pill nước ở header
        const statsPill = document.getElementById('headerWaterStats');
        if (statsPill) {
            if (percent > 0) {
                statsPill.style.background = `linear-gradient(to right, rgba(59, 130, 246, 0.22) ${percent}%, var(--bg-card) ${percent}%)`;
                statsPill.style.borderColor = `rgba(59, 130, 246, 0.4)`;
            } else {
                statsPill.style.background = 'var(--bg-card)';
                statsPill.style.borderColor = 'var(--color-border)';
            }
        }
    }

    // Check access permission of current device role on a profile
    checkPermissions(profileId, action = 'edit') {
        const user = window.CloudEngine.getAuthUser();
        
        // Owner có toàn quyền trên mọi profile
        if (user.role === 'owner') return true;
        
        // Guest Co-Owner có toàn quyền chỉnh sửa và ghi chép, nhưng không có quyền xóa profile / mời user
        if (user.role === 'guest_co_owner') {
            if (action === 'delete_profile' || action === 'invite') return false;
            return true;
        }
        
        // Guest Standard chỉ được chỉnh sửa dữ liệu của chính mình
        if (user.role === 'guest_standard') {
            let associatedId = localStorage.getItem('guestAssociatedProfileId');
            if (!associatedId && this.profiles.length > 0) {
                // Mặc định gán profile thứ 2 (nếu có) hoặc thứ 1 cho Guest Standard
                associatedId = this.profiles[1] ? this.profiles[1].id : this.profiles[0].id;
                localStorage.setItem('guestAssociatedProfileId', associatedId);
            }
            
            // Guest standard chỉ được chỉnh sửa profile của chính mình
            const isOwnProfile = (profileId === associatedId);
            if (isOwnProfile) {
                if (action === 'delete_profile' || action === 'invite') return false;
                return true;
            }
            return false;
        }
        
        return false;
    }

    // Update UI elements based on active profile permissions
    updatePermissionsUI() {
        const user = window.CloudEngine.getAuthUser();
        const activeProfileId = this.activeProfileId;
        
        // Kiểm tra quyền ghi dữ liệu đối với profile đang hoạt động
        const canWrite = this.checkPermissions(activeProfileId, 'write_data');
        
        // 1. Dashboard quick buttons
        const btnPoop = document.getElementById('btnLogPoop');
        const btnFood = document.getElementById('btnLogFood');
        const btnWater = document.getElementById('btnLogWater');
        
        if (btnPoop) {
            if (canWrite) btnPoop.classList.remove('disabled-gray');
            else btnPoop.classList.add('disabled-gray');
        }
        if (btnFood) {
            if (canWrite) btnFood.classList.remove('disabled-gray');
            else btnFood.classList.add('disabled-gray');
        }
        if (btnWater) {
            if (canWrite) btnWater.classList.remove('disabled-gray');
            else btnWater.classList.add('disabled-gray');
        }
        
        // 2. Water quick adds
        document.querySelectorAll('.water-quick-adds button').forEach(btn => {
            if (canWrite) btn.classList.remove('disabled-gray');
            else btn.classList.add('disabled-gray');
        });
        
        // 3. Widget smartwatch sync force button
        const btnSync = document.getElementById('btnForceSmartwatchSync');
        if (btnSync) {
            if (canWrite) btnSync.classList.remove('disabled-gray');
            else btnSync.classList.add('disabled-gray');
        }
    }

    // Render Profiles under the Profiles Tab
    renderProfilesTabList() {
        const grid = document.getElementById('profilesGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const user = window.CloudEngine.getAuthUser();
        const btnAdd = document.getElementById('btnAddNewProfileMain');
        const btnJoin = document.getElementById('btnOpenJoinGroupModal');
        
        // Điều chỉnh hiển thị nút trên Profiles Header tùy theo vai trò
        if (btnAdd) {
            if (user.role === 'owner') {
                btnAdd.classList.remove('hide');
            } else {
                btnAdd.classList.add('hide');
            }
        }
        
        // Nút kết nối mã mời - Hiển thị với tất cả các user
        if (btnJoin) {
            btnJoin.classList.remove('hide');
        }

        this.profiles.forEach((profile, index) => {
            const genderVN = profile.gender === 'male' ? 'Nam' : (profile.gender === 'female' ? 'Nữ' : 'Khác');
            
            // Hồ sơ đầu tiên luôn là hồ sơ gốc của Owner
            const isOwnerProfile = (index === 0);
            
            // Kiểm tra quyền chỉnh sửa profile này
            const canEdit = this.checkPermissions(profile.id, 'edit_profile');
            const canDelete = !isOwnerProfile && this.checkPermissions(profile.id, 'delete_profile');

            const card = document.createElement('div');
            card.className = 'card profile-card shadow-blur';
            
            // Xây dựng phần điều khiển quyền dành riêng cho Owner (chỉ hiển thị cho các sub-profile, ẩn ở Owner Profile)
            let ownerControlsHTML = '';
            if (user.role === 'owner' && !isOwnerProfile) {
                const currentPerm = window.CloudEngine.getGuestProfilePermission(profile.id);
                ownerControlsHTML = `
                    <div class="profile-permission-control" style="margin-top: 10px; width: 100%; border-top: 1px solid var(--color-border); padding-top: 10px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; margin-bottom:8px;">
                            <span style="font-weight:600; color:var(--color-text-muted);">Cấp quyền:</span>
                            <select class="guest-permission-select form-control" data-profile-id="${profile.id}" style="width:auto; padding: 2px 6px; font-size:0.75rem; height:auto; border-radius:6px;">
                                <option value="standard" ${currentPerm === 'standard' ? 'selected' : ''}>Chỉ sửa chính mình</option>
                                <option value="co_owner" ${currentPerm === 'co_owner' ? 'selected' : ''}>Toàn quyền sửa</option>
                            </select>
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px; margin-top:8px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem;">
                                <span style="color:var(--color-text-muted);">Mã mời:</span>
                                <strong style="font-family:monospace; color:var(--color-primary);">${profile.inviteCode}</strong>
                            </div>
                            <button class="btn btn-outline btn-invite-member" data-profile-id="${profile.id}" style="width:100%; font-size:0.75rem; padding: 6px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:4px;">
                                <i data-lucide="share-2" style="width:12px; height:12px;"></i> Sao chép mã mời
                            </button>
                        </div>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="profile-avatar" style="display:flex; align-items:center; justify-content:center; overflow:hidden;">${this.getAvatarHTML(profile.avatar)}</div>
                <div class="profile-name">${profile.name}</div>
                <div class="profile-details-list">
                    <div class="profile-detail-row">
                        <span>Giới tính / Tuổi:</span>
                        <span>${genderVN} / ${profile.age || 25} tuổi</span>
                    </div>
                    <div class="profile-detail-row">
                        <span>Chiều cao / Cân nặng:</span>
                        <span>${profile.height || 165} cm / ${profile.weight} kg</span>
                    </div>
                    <div class="profile-detail-row">
                        <span>Mục tiêu nước:</span>
                        <span>${profile.waterGoal} ml</span>
                    </div>
                    <div class="profile-detail-row">
                        <span>Lần đi đại tiện cuối:</span>
                        <span>${this.getLastPoopTimeStr(profile.id)}</span>
                    </div>
                    
                    <!-- Kỷ lục chuỗi (Max Streaks) -->
                    <div class="profile-detail-row" style="border-top:1px dashed var(--color-border); padding-top:6px; margin-top:6px; display:flex; flex-direction:column; gap:4px; align-items:stretch;">
                        <span style="font-weight:700; color:var(--color-primary); font-size:0.75rem; display:block;">Kỷ lục chuỗi (Max Streaks)</span>
                        <div style="display:flex; justify-content:space-between; font-size:0.72rem;">
                            <span>💧 Nước uống: <strong>${profile.maxWaterStreak || 0} ngày</strong></span>
                            <span>🔥 Tiêu hóa: <strong>${profile.maxHealthyStreak || 0} ngày</strong></span>
                        </div>
                    </div>
                </div>
                <div class="profile-actions">
                    <button class="btn btn-outline btn-edit-profile ${canEdit ? '' : 'disabled-gray'}" data-id="${profile.id}">
                        <i data-lucide="edit"></i> Sửa
                    </button>
                    ${!isOwnerProfile ? `
                        <button class="btn btn-outline btn-danger btn-delete-profile ${canDelete ? '' : 'disabled-gray'}" data-id="${profile.id}">
                            <i data-lucide="trash-2"></i> Xóa
                        </button>
                    ` : ''}
                </div>
                ${ownerControlsHTML}
            `;
            grid.appendChild(card);
        });

        lucide.createIcons();

        // Bind click events inside Profile Grid
        grid.querySelectorAll('.btn-edit-profile').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled-gray')) return;
                const id = btn.getAttribute('data-id');
                this.openProfileModal(id);
            });
        });

        grid.querySelectorAll('.btn-delete-profile').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled-gray')) return;
                const id = btn.getAttribute('data-id');
                this.deleteProfile(id);
            });
        });

        // Owner-only bindings
        if (user.role === 'owner') {
            grid.querySelectorAll('.guest-permission-select').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const profileId = sel.getAttribute('data-profile-id');
                    const val = e.target.value;
                    window.CloudEngine.setGuestProfilePermission(profileId, val);
                    this.showToast(`Đã cập nhật quyền cho profile này thành: ${val === 'co_owner' ? 'Toàn quyền chỉnh sửa' : 'Chỉ chỉnh sửa chính mình'}`, 'success');
                });
            });

            grid.querySelectorAll('.btn-invite-member').forEach(btn => {
                btn.addEventListener('click', () => {
                    const profileId = btn.getAttribute('data-profile-id');
                    const profile = this.profiles.find(p => p.id === profileId);
                    if (profile) {
                        const code = profile.inviteCode;
                        navigator.clipboard.writeText(code).then(() => {
                            this.showToast(`Đã sao chép mã mời [${code}] của hồ sơ "${profile.name}" vào bộ nhớ tạm!`, 'success');
                        }).catch(() => {
                            alert(`Mã mời của hồ sơ "${profile.name}": ${code}`);
                        });
                    }
                });
            });
        }
    }

    // Get time elapsed since last bowel movement for profile
    getLastPoopTimeStr(profileId) {
        const logs = this.poopLogs
            .filter(log => log.profileId === profileId && log.success !== false)
            .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
        
        if (logs.length === 0) return 'Chưa ghi nhận';
        
        const lastLogDate = new Date(`${logs[0].date}T${logs[0].time}`);
        const diffMs = new Date() - lastLogDate;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Hôm nay lúc ${logs[0].time}`;
        } else if (diffDays === 1) {
            return `Hôm qua lúc ${logs[0].time}`;
        } else {
            return `${diffDays} ngày trước`;
        }
    }

    // Delete a Profile
    deleteProfile(profileId) {
        if (this.profiles.length <= 1) {
            alert('Bạn cần giữ lại ít nhất 1 hồ sơ người dùng.');
            return;
        }

        if (confirm('Bạn có chắc chắn muốn xóa hồ sơ này và toàn bộ nhật ký liên quan?')) {
            this.profiles = this.profiles.filter(p => p.id !== profileId);
            this.poopLogs = this.poopLogs.filter(log => log.profileId !== profileId);
            this.waterLogs = this.waterLogs.filter(log => log.profileId !== profileId);
            this.foodLogs = this.foodLogs.filter(log => log.profileId !== profileId);

            if (this.activeProfileId === profileId) {
                this.activeProfileId = this.profiles[0].id;
            }

            this.saveDataToStorage();
            this.renderProfileSelectors();
            this.updateActiveProfileUI();
            this.renderProfilesTabList();
            this.checkHealthAlerts();
        }
    }

    // Open Add/Edit Profile modal
    openProfileModal(profileId = null) {
        const modal = document.getElementById('profileModal');
        const form = document.getElementById('profileForm');
        const title = document.getElementById('profileModalTitle');
        
        form.reset();

        if (profileId) {
            title.innerText = 'Sửa hồ sơ';
            const profile = this.profiles.find(p => p.id === profileId);
            if (profile) {
                document.getElementById('profileIdField').value = profile.id;
                document.getElementById('profileNameInput').value = profile.name;
                document.getElementById('profileSelectedAvatarPreview').innerHTML = this.getAvatarHTML(profile.avatar);
                document.getElementById('profileAvatarField').value = profile.avatar;
                document.getElementById('profileGenderInput').value = profile.gender || 'male';
                document.getElementById('profileAgeInput').value = profile.age || 25;
                document.getElementById('profileWeightInput').value = profile.weight;
                document.getElementById('profileHeightInput').value = profile.height || 165;
                document.getElementById('profileWaterGoalInput').value = profile.waterGoal;
            }
        } else {
            title.innerText = 'Tạo hồ sơ mới';
            document.getElementById('profileIdField').value = '';
            document.getElementById('profileSelectedAvatarPreview').innerHTML = this.getAvatarHTML('🍎');
            document.getElementById('profileAvatarField').value = '🍎';
            document.getElementById('profileGenderInput').value = 'male';
            document.getElementById('profileAgeInput').value = 25;
            document.getElementById('profileWeightInput').value = 60;
            document.getElementById('profileHeightInput').value = 165;
            document.getElementById('profileWaterGoalInput').value = 2100;
        }

        this.openModal('profileModal');
    }

    // Auto-calculate advanced water goal recommendation
    calculateRecommendedWater() {
        const weight = parseInt(document.getElementById('profileWeightInput').value) || 0;
        const age = parseInt(document.getElementById('profileAgeInput').value) || 25;
        const gender = document.getElementById('profileGenderInput').value || 'male';

        if (weight <= 0) return;

        let ageMultiplier = 35;
        if (age < 30) {
            ageMultiplier = 40;
        } else if (age > 55) {
            ageMultiplier = 30;
        }

        let recommended = weight * ageMultiplier;

        if (gender === 'male') {
            recommended += 200;
        }

        document.getElementById('profileWaterGoalInput').value = recommended;
    }

    // Save Profile (async)
    async saveProfile(e) {
        e.preventDefault();
        const id = document.getElementById('profileIdField').value;
        const name = document.getElementById('profileNameInput').value.trim();
        const avatar = document.getElementById('profileAvatarField').value || '🍎';
        const gender = document.getElementById('profileGenderInput').value;
        const age = parseInt(document.getElementById('profileAgeInput').value) || 25;
        const weight = parseInt(document.getElementById('profileWeightInput').value) || 60;
        const height = parseInt(document.getElementById('profileHeightInput').value) || 165;
        const waterGoal = parseInt(document.getElementById('profileWaterGoalInput').value) || (weight * 35);

        if (!name) return;

        if (id) {
            const index = this.profiles.findIndex(p => p.id === id);
            if (index !== -1) {
                this.profiles[index] = { 
                    ...this.profiles[index], 
                    name, 
                    avatar, 
                    gender, 
                    age, 
                    weight, 
                    height, 
                    waterGoal 
                };
            }
        } else {
            const newProfile = {
                id: 'p_' + Date.now(),
                name,
                avatar,
                gender,
                age,
                weight,
                height,
                waterGoal,
                badges: [],
                inviteCode: 'PT-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                isClaimed: false,
                maxWaterStreak: 0,
                maxHealthyStreak: 0
            };
            this.profiles.push(newProfile);
            if (this.profiles.length === 1) {
                this.activeProfileId = newProfile.id;
            }
            // Đăng ký mã mời của profile phụ mới lên Cloud
            await window.CloudEngine.registerInviteCode(newProfile.inviteCode, 'device_owner', newProfile.id);
        }

        this.saveDataToStorage();
        this.renderProfileSelectors();
        this.updateActiveProfileUI();
        
        this.closeModal('profileModal');

        if (this.currentTab === 'profiles') {
            this.renderProfilesTabList();
        }
        this.checkHealthAlerts();
    }

    // Join profile group by invite code (Guest claim connection & sync data - async)
    async joinGroup(e) {
        e.preventDefault();
        const codeInput = document.getElementById('joinGroupCodeInput');
        if (!codeInput) return;
        const code = codeInput.value.trim().toUpperCase();
        if (!code) return;

        // 1. Thử claim mã mời trên Cloud DB trực tuyến
        const cloudInfo = await window.CloudEngine.claimInviteCode(code, 'device_guest_current');
        
        if (cloudInfo) {
            // Hỏi quyền giả lập Guest Co-owner hay Standard
            const isCoOwner = confirm(`Bạn có muốn kết nối với Nhóm qua mã mời "${code}" dưới vai trò Co-Owner (Toàn quyền chỉnh sửa) không? \n\nBấm OK để nhận quyền Co-Owner.\nBấm Cancel để nhận Standard Guest (Chỉ được sửa chính mình).`);
            const guestRole = isCoOwner ? 'guest_co_owner' : 'guest_standard';
            
            // Đổi vai trò thiết bị hiện tại
            window.CloudEngine.setMockUserRole(guestRole);
            
            // Lưu liên kết cục bộ
            const oldProfileId = this.profiles[0].id;
            const newProfileId = cloudInfo.profileId;
            
            // Cập nhật profile gốc của Guest để ánh xạ sang profile Owner tạo
            this.profiles[0].id = newProfileId;
            this.profiles[0].inviteCode = code;
            this.profiles[0].name = `Thành viên nhóm (${code})`;
            
            // Hợp nhất dữ liệu logs cũ của Guest sang profileId mới
            this.poopLogs.forEach(l => { if (l.profileId === oldProfileId) l.profileId = newProfileId; });
            this.waterLogs.forEach(l => { if (l.profileId === oldProfileId) l.profileId = newProfileId; });
            this.foodLogs.forEach(l => { if (l.profileId === oldProfileId) l.profileId = newProfileId; });
            
            this.activeProfileId = newProfileId;
            this.saveDataToStorage();

            // Đẩy toàn bộ dữ liệu của Guest lên Cloud
            await this.pushLogsToCloud();

            this.closeModal('joinGroupModal');
            document.getElementById('joinGroupForm').reset();
            
            this.updatePermissionsUI();
            this.renderProfilesTabList();
            this.updateActiveProfileUI();
            this.renderCalendar();
            
            this.showToast(`Liên kết thành công! Dữ liệu của bạn đã được đồng bộ với nhóm [${code}] dưới vai trò ${guestRole.toUpperCase()}`, 'success');
        } else {
            this.showToast('Lỗi: Mã mời không hợp lệ hoặc đã được thiết bị khác sử dụng!', 'error');
        }
    }

    // Open poop logging modal
    openPoopModal() {
        const modal = document.getElementById('poopModal');
        const form = document.getElementById('poopForm');
        form.reset();

        const now = new Date();
        const todayStr = this.formatDateStr(now);
        document.getElementById('poopDateInput').value = todayStr;
        document.getElementById('poopDateInput').max = todayStr; // Khóa không cho chọn ngày tương lai
        
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('poopTimeInput').value = `${hours}:${mins}`;

        document.getElementById('poopSuccessCheckbox').checked = true;
        document.getElementById('bristolSelectorGroup').classList.remove('hide');
        
        document.querySelectorAll('.bristol-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-type') === '4') opt.classList.add('active');
        });
        document.getElementById('bristolTypeField').value = '4';

        this.openModal('poopModal');
    }

    // Save Bowel log
    savePoop(e) {
        e.preventDefault();
        const date = document.getElementById('poopDateInput').value;
        const time = document.getElementById('poopTimeInput').value;
        const success = document.getElementById('poopSuccessCheckbox').checked;
        const notes = document.getElementById('poopNotesInput').value.trim();
        
        // Chặn ghi log tương lai
        const todayStr = this.formatDateStr(new Date());
        if (date > todayStr) {
            alert('Bạn không thể ghi nhận hoạt động cho những ngày trong tương lai!');
            return;
        }

        let bristolType = null;
        if (success) {
            bristolType = parseInt(document.getElementById('bristolTypeField').value) || 4;
        }

        const symptoms = [];
        document.querySelectorAll('input[name="symptoms"]:checked').forEach(cb => {
            symptoms.push(cb.value);
        });

        if (!date || !time) return;

        const newLog = {
            id: 'poop_' + Date.now(),
            profileId: this.activeProfileId,
            date,
            time,
            success,
            bristolType,
            symptoms,
            notes
        };

        this.poopLogs.push(newLog);
        this.saveDataToStorage();

        this.closeModal('poopModal');
        this.renderCalendar();
        this.checkHealthAlerts();
        this.checkAndUnlockBadges();
        this.updateStreaksUI();
        this.pushLogsToCloud();
    }

    // Open Food Logging modal
    openFoodModal() {
        const modal = document.getElementById('foodModal');
        const form = document.getElementById('foodForm');
        form.reset();

        const now = new Date();
        const todayStr = this.formatDateStr(now);
        document.getElementById('foodDateInput').value = todayStr;
        document.getElementById('foodDateInput').max = todayStr; // Khóa ngày tương lai
        
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('foodTimeInput').value = `${hours}:${mins}`;

        document.querySelectorAll('.portion-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-portion') === 'normal') opt.classList.add('active');
        });
        document.getElementById('foodPortionField').value = 'normal';

        this.openModal('foodModal');
    }

    // Save Food log
    saveFood(e) {
        e.preventDefault();
        const date = document.getElementById('foodDateInput').value;
        const time = document.getElementById('foodTimeInput').value;
        const foodName = document.getElementById('foodNameInput').value.trim();
        const mealType = document.querySelector('input[name="foodMealType"]:checked').value;
        const portionSize = document.getElementById('foodPortionField').value;

        if (!date || !time || !foodName) return;

        // Chặn ghi log tương lai
        const todayStr = this.formatDateStr(new Date());
        if (date > todayStr) {
            alert('Bạn không thể ghi nhận hoạt động cho những ngày trong tương lai!');
            return;
        }

        const newLog = {
            id: 'food_' + Date.now(),
            profileId: this.activeProfileId,
            date,
            time,
            foodName,
            mealType,
            portionSize
        };

        this.foodLogs.push(newLog);
        this.saveDataToStorage();

        this.closeModal('foodModal');
        
        if (this.currentTab === 'calendar') {
            this.renderCalendar();
        }
        this.checkHealthAlerts();
        this.checkAndUnlockBadges();
        this.pushLogsToCloud();
    }

    // Add Water log amount
    addWaterIntake(amount, beverageType = 'pure_water', time = null) {
        const todayStr = this.formatDateStr(new Date());
        
        let logTime = time;
        if (!logTime) {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const mins = String(now.getMinutes()).padStart(2, '0');
            logTime = `${hours}:${mins}`;
        }

        const newLog = {
            id: 'water_' + Date.now(),
            profileId: this.activeProfileId,
            date: todayStr,
            time: logTime,
            amount: parseInt(amount),
            beverageType: beverageType
        };

        this.waterLogs.push(newLog);
        this.saveDataToStorage();
        this.updateWaterProgressBar();
        this.checkHealthAlerts();
        this.checkAndUnlockBadges();
        this.updateStreaksUI();
        this.pushLogsToCloud();
    }

    // Calculate effective hydration based on beverage types
    getEffectiveWater(amount, type) {
        const multipliers = {
            'pure_water': 1.0,
            'juice': 0.9,
            'soft_drink': 0.7,
            'milk_tea': 0.6,
            'tea_coffee': 0.4,
            'alcohol': -0.2
        };
        const mult = multipliers[type || 'pure_water'] !== undefined ? multipliers[type || 'pure_water'] : 1.0;
        return Math.round(amount * mult);
    }

    // Open detail water logging modal
    openWaterModal() {
        const modal = document.getElementById('waterModal');
        const form = document.getElementById('waterForm');
        form.reset();

        const now = new Date();
        const todayStr = this.formatDateStr(now);
        document.getElementById('waterDateInput').value = todayStr;
        document.getElementById('waterDateInput').max = todayStr; // Khóa ngày tương lai
        
        const hours = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('waterTimeInput').value = `${hours}:${mins}`;

        document.getElementById('waterAmountInput').value = '250';
        document.getElementById('beverageTypeField').value = 'pure_water';
        
        document.querySelectorAll('.beverage-option').forEach(opt => {
            opt.classList.remove('active');
            if (opt.getAttribute('data-beverage') === 'pure_water') opt.classList.add('active');
        });

        this.openModal('waterModal');
    }

    // Save detailed Water log from modal form
    saveWater(e) {
        e.preventDefault();
        const date = document.getElementById('waterDateInput').value;
        const time = document.getElementById('waterTimeInput').value;
        const amount = parseInt(document.getElementById('waterAmountInput').value) || 250;
        const beverageType = document.getElementById('beverageTypeField').value || 'pure_water';

        if (!date || !time || !amount) return;

        // Chặn ghi log tương lai
        const todayStr = this.formatDateStr(new Date());
        if (date > todayStr) {
            alert('Bạn không thể ghi nhận hoạt động cho những ngày trong tương lai!');
            return;
        }

        const newLog = {
            id: 'water_' + Date.now(),
            profileId: this.activeProfileId,
            date,
            time,
            amount,
            beverageType
        };

        this.waterLogs.push(newLog);
        this.saveDataToStorage();

        this.closeModal('waterModal');
        this.updateWaterProgressBar();
        this.checkHealthAlerts();
        this.checkAndUnlockBadges();
        this.updateStreaksUI();
        this.pushLogsToCloud();
        
        if (this.currentTab === 'calendar') {
            this.renderCalendar();
        }
    }

    // Setup event listeners for forms, buttons, controls
    setupEventListeners() {
        // Tab switcher
        document.querySelectorAll('.nav-menu .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = item.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Sidebar Active Profile Card click (toggle dropdown)
        document.getElementById('activeProfileCard').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('profileDropdown').classList.toggle('show');
        });

        // Close dropdown when clicking outside
        window.addEventListener('click', () => {
            document.getElementById('profileDropdown').classList.remove('show');
        });

        // Add Profile button inside Dropdown
        document.getElementById('btnDropdownAddProfile').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('profileDropdown').classList.remove('show');
            this.openProfileModal();
        });

        // Add profile on main profiles tab
        document.getElementById('btnAddNewProfileMain').addEventListener('click', () => {
            this.openProfileModal();
        });

        // Modal closers
        document.getElementById('btnCloseProfileModal').addEventListener('click', () => {
            this.closeModal('profileModal');
        });
        document.getElementById('btnCancelProfile').addEventListener('click', () => {
            this.closeModal('profileModal');
        });
        
        document.getElementById('btnClosePoopModal').addEventListener('click', () => {
            this.closeModal('poopModal');
        });
        document.getElementById('btnCancelPoop').addEventListener('click', () => {
            this.closeModal('poopModal');
        });

        document.getElementById('btnCloseFoodModal').addEventListener('click', () => {
            this.closeModal('foodModal');
        });
        document.getElementById('btnCancelFood').addEventListener('click', () => {
            this.closeModal('foodModal');
        });

        document.getElementById('btnCloseWaterModal').addEventListener('click', () => {
            this.closeModal('waterModal');
        });
        document.getElementById('btnCancelWater').addEventListener('click', () => {
            this.closeModal('waterModal');
        });

        // Close modals when clicking overlay background
        const modals = ['profileModal', 'poopModal', 'foodModal', 'waterModal', 'avatarPickerModal', 'joinGroupModal'];
        modals.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', (e) => {
                    if (e.target.id === id) {
                        this.closeModal(id);
                    }
                });
            }
        });

        // Avatar picker triggers
        document.getElementById('btnOpenAvatarPicker').addEventListener('click', () => {
            this.openModal('avatarPickerModal');
        });
        document.getElementById('profileSelectedAvatarPreview').addEventListener('click', () => {
            this.openModal('avatarPickerModal');
        });
        document.getElementById('btnCloseAvatarPicker').addEventListener('click', () => {
            this.closeModal('avatarPickerModal');
        });

        // File input change for profile custom avatar upload
        const fileInput = document.getElementById('profileAvatarFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    // Limit file size to 250KB to protect localStorage
                    if (file.size > 250 * 1024) {
                        alert('Kích thước ảnh quá lớn! Vui lòng chọn ảnh dưới 250KB.');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const base64 = event.target.result;
                        document.getElementById('profileAvatarField').value = base64;
                        document.getElementById('profileSelectedAvatarPreview').innerHTML = this.getAvatarHTML(base64);
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Link group modals triggers
        const btnOpenJoin = document.getElementById('btnOpenJoinGroupModal');
        if (btnOpenJoin) {
            btnOpenJoin.addEventListener('click', () => {
                this.openModal('joinGroupModal');
            });
        }
        const btnCancelJoin = document.getElementById('btnCancelJoinGroup');
        if (btnCancelJoin) {
            btnCancelJoin.addEventListener('click', () => {
                this.closeModal('joinGroupModal');
            });
        }
        const btnCloseJoin = document.getElementById('btnCloseJoinGroupModal');
        if (btnCloseJoin) {
            btnCloseJoin.addEventListener('click', () => {
                this.closeModal('joinGroupModal');
            });
        }

        // Form submits
        document.getElementById('profileForm').addEventListener('submit', (e) => this.saveProfile(e));
        document.getElementById('poopForm').addEventListener('submit', (e) => this.savePoop(e));
        document.getElementById('foodForm').addEventListener('submit', (e) => this.saveFood(e));
        const joinGroupForm = document.getElementById('joinGroupForm');
        if (joinGroupForm) {
            joinGroupForm.addEventListener('submit', (e) => this.joinGroup(e));
        }
        document.getElementById('waterForm').addEventListener('submit', (e) => this.saveWater(e));

        // Quick log buttons on Dashboard
        document.getElementById('btnLogPoop').addEventListener('click', () => {
            if (document.getElementById('btnLogPoop').classList.contains('disabled-gray')) {
                alert('Bạn không có quyền chỉnh sửa hồ sơ này.');
                return;
            }
            this.openPoopModal();
        });
        
        document.getElementById('btnLogFood').addEventListener('click', () => {
            if (document.getElementById('btnLogFood').classList.contains('disabled-gray')) {
                alert('Bạn không có quyền chỉnh sửa hồ sơ này.');
                return;
            }
            this.openFoodModal();
        });
        
        document.getElementById('btnLogWater').addEventListener('click', () => {
            if (document.getElementById('btnLogWater').classList.contains('disabled-gray')) {
                alert('Bạn không có quyền chỉnh sửa hồ sơ này.');
                return;
            }
            this.openWaterModal();
        });

        // Water quick add buttons (+250ml, +500ml...)
        document.querySelectorAll('.water-quick-adds button').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled-gray')) {
                    alert('Bạn không có quyền chỉnh sửa hồ sơ này.');
                    return;
                }
                const amt = btn.getAttribute('data-amount');
                this.addWaterIntake(amt, 'pure_water');
            });
        });

        // Mock Role Selector inside Settings
        const mockSel = document.getElementById('mockRoleSelector');
        if (mockSel) {
            mockSel.addEventListener('change', (e) => {
                const role = e.target.value;
                window.CloudEngine.setMockUserRole(role);
                
                // Cập nhật lại UI lập tức
                this.updatePermissionsUI();
                this.renderProfilesTabList();
                this.updateActiveProfileUI();
                
                if (this.currentTab === 'calendar') {
                    this.renderCalendar();
                } else if (this.currentTab === 'analytics') {
                    this.renderAnalyticsTab();
                }
                
                alert(`Vai trò thiết bị đã chuyển sang: ${role.toUpperCase()}`);
            });
        }

        // Bristol Scale Select inside modal
        document.querySelectorAll('.bristol-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.bristol-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const type = opt.getAttribute('data-type');
                document.getElementById('bristolTypeField').value = type;
            });
        });

        // Portion Selector inside food modal
        document.querySelectorAll('.portion-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.portion-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const portion = opt.getAttribute('data-portion');
                document.getElementById('foodPortionField').value = portion;
            });
        });

        // Beverage Selector inside water modal
        document.querySelectorAll('.beverage-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.beverage-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const beverage = opt.getAttribute('data-beverage');
                document.getElementById('beverageTypeField').value = beverage;
            });
        });

        // Bowel success status checkbox toggle
        document.getElementById('poopSuccessCheckbox').addEventListener('change', (e) => {
            const group = document.getElementById('bristolSelectorGroup');
            if (e.target.checked) {
                group.classList.remove('hide');
            } else {
                group.classList.add('hide');
            }
        });

        // Auto calculate recommended water intake when profile attributes change
        document.getElementById('profileWeightInput').addEventListener('input', () => this.calculateRecommendedWater());
        document.getElementById('profileAgeInput').addEventListener('input', () => this.calculateRecommendedWater());
        document.getElementById('profileGenderInput').addEventListener('change', () => this.calculateRecommendedWater());

        // Theme toggles
        document.getElementById('themeToggleBtn').addEventListener('click', () => {
            const newTheme = this.settings.theme === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
        });
        document.getElementById('settingsThemeToggle').addEventListener('click', () => {
            const newTheme = this.settings.theme === 'light' ? 'dark' : 'light';
            this.applyTheme(newTheme);
        });

        // Calendar controls navigation
        document.getElementById('prevPeriodBtn').addEventListener('click', () => this.navigateCalendar(-1));
        document.getElementById('nextPeriodBtn').addEventListener('click', () => this.navigateCalendar(1));
        
        document.querySelectorAll('.calendar-view-modes button').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.calendar-view-modes button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.calendarViewMode = btn.getAttribute('data-view');
                this.renderCalendar();
            });
        });

        // Settings tab controls
        document.getElementById('notificationToggle').addEventListener('change', (e) => {
            this.settings.waterReminder = e.target.checked;
            this.saveDataToStorage();
            if (e.target.checked) {
                this.requestNotificationPermission();
            }
        });

        document.getElementById('notificationInterval').addEventListener('change', (e) => {
            this.settings.reminderInterval = parseInt(e.target.value);
            this.saveDataToStorage();
        });

        // Smartwatch Sync settings controls
        document.getElementById('smartwatchSyncToggle').addEventListener('change', (e) => {
            this.settings.smartwatchSync = e.target.checked;
            this.saveDataToStorage();
            this.updateSmartwatchWidget();
            
            const syncRow = document.getElementById('smartwatchSyncStatusRow');
            if (e.target.checked) {
                syncRow.classList.remove('hide');
                this.syncSmartwatchData();
            } else {
                syncRow.classList.add('hide');
            }
        });

        document.getElementById('btnForceSmartwatchSync').addEventListener('click', () => {
            this.syncSmartwatchData();
        });

        // Export/Import Data
        document.getElementById('btnExportData').addEventListener('click', () => this.exportData());
        
        const importInput = document.getElementById('importFile');
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importData(file);
            }
        });

        // Clear All Data
        document.getElementById('btnClearAllData').addEventListener('click', () => {
            if (confirm('CẢNH BÁO: Thao tác này sẽ xóa toàn bộ profiles và lịch sử log. Bạn có chắc chắn muốn xóa toàn bộ không?')) {
                localStorage.clear();
                window.location.reload();
            }
        });

        // Analytics dynamic filters
        document.getElementById('analyticsViewSelect').addEventListener('change', (e) => {
            const mode = e.target.value;
            const mGroup = document.getElementById('filterMonthGroup');
            const yGroup = document.getElementById('filterYearGroup');
            
            if (mode === 'month') {
                mGroup.classList.remove('hide');
                yGroup.classList.add('hide');
            } else {
                mGroup.classList.add('hide');
                yGroup.classList.remove('hide');
            }
            this.renderAnalyticsTab();
        });

        document.getElementById('analyticsMonthPicker').addEventListener('change', () => this.renderAnalyticsTab());
        document.getElementById('analyticsYearPicker').addEventListener('change', () => this.renderAnalyticsTab());
        
        document.getElementById('compareProfilesCheckbox').addEventListener('change', (e) => {
            const compareGrp = document.getElementById('compareProfileSelectGroup');
            const otherProfiles = this.profiles.filter(p => p.id !== this.activeProfileId);
            
            if (e.target.checked && otherProfiles.length > 1) {
                compareGrp.classList.remove('hide');
            } else {
                compareGrp.classList.add('hide');
            }
            this.renderAnalyticsTab();
        });
        document.getElementById('compareProfileSelect').addEventListener('change', () => this.renderAnalyticsTab());

        // AI analysis trigger button
        document.getElementById('btnRunAIAnalysis').addEventListener('click', () => {
            this.runAIFoodAnalysis();
        });

        // Emperor Trophy & Sharing modal actions
        document.getElementById('btnShareEmperor').addEventListener('click', () => {
            this.openShareModal();
        });

        document.getElementById('btnCloseShareModal').addEventListener('click', () => {
            this.closeModal('shareModal');
        });

        document.getElementById('btnCopyShareText').addEventListener('click', () => {
            this.copyShareText();
        });

        document.getElementById('btnDownloadCertImage').addEventListener('click', () => {
            this.downloadCertImageMock();
        });
    }

    // Dynamic Calendar rendering
    renderCalendar() {
        const container = document.getElementById('calendarContainer');
        container.innerHTML = '';
        
        const date = this.calendarDate;
        const monthsVN = ['Tháng 01', 'Tháng 02', 'Tháng 03', 'Tháng 04', 'Tháng 05', 'Tháng 06', 'Tháng 07', 'Tháng 08', 'Tháng 09', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
        
        if (this.calendarViewMode === 'month') {
            document.getElementById('currentPeriodLabel').innerText = `${monthsVN[date.getMonth()]}, ${date.getFullYear()}`;
            this.renderMonthView(container);
        } else if (this.calendarViewMode === 'week') {
            const startOfWeek = this.getStartOfWeek(new Date(date));
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(endOfWeek.getDate() + 6);
            document.getElementById('currentPeriodLabel').innerText = `${startOfWeek.getDate()}/${startOfWeek.getMonth()+1} - ${endOfWeek.getDate()}/${endOfWeek.getMonth()+1}`;
            this.renderWeekView(container);
        } else if (this.calendarViewMode === 'year') {
            document.getElementById('currentPeriodLabel').innerText = `Năm ${date.getFullYear()}`;
            this.renderYearView(container);
        }
    }

    // Navigate Calendar date cursor
    navigateCalendar(direction) {
        if (this.calendarViewMode === 'month') {
            this.calendarDate.setMonth(this.calendarDate.getMonth() + direction);
        } else if (this.calendarViewMode === 'week') {
            this.calendarDate.setDate(this.calendarDate.getDate() + direction * 7);
        } else if (this.calendarViewMode === 'year') {
            this.calendarDate.setFullYear(this.calendarDate.getFullYear() + direction);
        }
        this.renderCalendar();
    }

    // Render Month view grid
    renderMonthView(container) {
        const cursor = new Date(this.calendarDate);
        const year = cursor.getFullYear();
        const month = cursor.getMonth();
        
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        let startDayOfWeek = firstDayOfMonth.getDay();
        startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1; // Align Mon = 0
        
        const totalCells = startDayOfWeek + lastDayOfMonth.getDate();
        const totalRows = Math.ceil(totalCells / 7) * 7;

        const grid = document.createElement('div');
        grid.className = 'month-view-grid';
        
        const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        weekdays.forEach(day => {
            const wHeader = document.createElement('div');
            wHeader.className = 'weekday-header';
            wHeader.innerText = day;
            grid.appendChild(wHeader);
        });

        const calendarStartDate = new Date(year, month, 1);
        calendarStartDate.setDate(calendarStartDate.getDate() - startDayOfWeek);

        for (let i = 0; i < totalRows; i++) {
            const cellDate = new Date(calendarStartDate);
            cellDate.setDate(cellDate.getDate() + i);

            const isCurrentMonth = cellDate.getMonth() === month;
            const dateStr = this.formatDateStr(cellDate);
            const isToday = dateStr === this.formatDateStr(new Date());

            const cell = document.createElement('div');
            cell.className = `calendar-day-cell ${isCurrentMonth ? '' : 'other-month'} ${isToday ? 'today' : ''}`;
            cell.setAttribute('data-date', dateStr);

            const dayNum = document.createElement('span');
            dayNum.className = 'day-number';
            dayNum.innerText = cellDate.getDate();
            cell.appendChild(dayNum);

            // Fetch logs for day
            const dayPoops = this.poopLogs.filter(log => log.profileId === this.activeProfileId && log.date === dateStr);
            const dayFoods = this.foodLogs.filter(log => log.profileId === this.activeProfileId && log.date === dateStr);
            
            const indicatorsDiv = document.createElement('div');
            indicatorsDiv.className = 'day-indicators';

            // Food indicator
            if (dayFoods.length > 0) {
                const foodDot = document.createElement('span');
                foodDot.style.fontSize = '0.55rem';
                foodDot.style.background = '#f59e0b';
                foodDot.style.width = '6px';
                foodDot.style.height = '6px';
                foodDot.style.borderRadius = '50%';
                foodDot.title = `${dayFoods.length} bữa ăn`;
                indicatorsDiv.appendChild(foodDot);
            }

            // Apple icon based on bowel status
            if (dayPoops.length > 0) {
                let containsDanger = false; // purple (6-7)
                let containsRed = false; // red (1-2)
                let containsYellow = false; // yellow (5 or unsuccessful)
                let containsIdeal = false; // green (3-4)

                dayPoops.forEach(p => {
                    if (p.success === false) containsYellow = true;
                    else if (p.bristolType <= 2) containsRed = true;
                    else if (p.bristolType >= 6) containsDanger = true;
                    else if (p.bristolType === 5) containsYellow = true;
                    else containsIdeal = true;
                });

                let appleEmoji = '🍏';
                if (containsDanger) appleEmoji = '🍇'; 
                else if (containsRed) appleEmoji = '🍎'; 
                else if (containsYellow) appleEmoji = '🍋'; 

                const appleSpan = document.createElement('span');
                appleSpan.className = 'day-apple-icon';
                appleSpan.innerText = appleEmoji;
                indicatorsDiv.appendChild(appleSpan);

                // Multiplier
                if (dayPoops.length > 1) {
                    const countSpan = document.createElement('span');
                    countSpan.className = 'day-cell-poops-count';
                    countSpan.innerText = `${dayPoops.length}`;
                    indicatorsDiv.appendChild(countSpan);
                }
            }

            cell.appendChild(indicatorsDiv);

            cell.addEventListener('click', () => {
                this.showDayDetails(dateStr);
            });

            grid.appendChild(cell);
        }

        container.appendChild(grid);
    }

    // Render Week View
    renderWeekView(container) {
        const cursor = new Date(this.calendarDate);
        const startOfWeek = this.getStartOfWeek(cursor);

        const weekContainer = document.createElement('div');
        weekContainer.className = 'week-view-container';
        weekContainer.style.display = 'flex';
        weekContainer.style.flexDirection = 'column';
        weekContainer.style.gap = '12px';
        weekContainer.style.height = '100%';

        const vnDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

        for (let i = 0; i < 7; i++) {
            const dayDate = new Date(startOfWeek);
            dayDate.setDate(dayDate.getDate() + i);
            const dateStr = this.formatDateStr(dayDate);
            const isToday = dateStr === this.formatDateStr(new Date());

            const poops = this.poopLogs.filter(l => l.profileId === this.activeProfileId && l.date === dateStr);
            const waters = this.waterLogs.filter(l => l.profileId === this.activeProfileId && l.date === dateStr);
            const foods = this.foodLogs.filter(l => l.profileId === this.activeProfileId && l.date === dateStr);
            const totalWater = waters.reduce((s, w) => s + w.amount, 0);
            
            const profile = this.getActiveProfile();
            const waterGoal = profile.waterGoal || 2000;
            const waterPercent = Math.min(Math.round((totalWater / waterGoal) * 100), 100);

            const row = document.createElement('div');
            row.className = 'card week-row-card';
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '14px 18px';
            row.style.borderRadius = '16px';
            row.style.cursor = 'pointer';
            row.style.border = isToday ? '2px solid var(--color-primary)' : '1px solid var(--color-border)';

            // Left side details
            const leftDiv = document.createElement('div');
            leftDiv.style.display = 'flex';
            leftDiv.style.alignItems = 'center';
            leftDiv.style.gap = '16px';
            
            leftDiv.innerHTML = `
                <div style="text-align: center; min-width: 60px;">
                    <div style="font-weight: 800; font-size: 1.15rem; color: ${isToday ? 'var(--color-primary)' : 'inherit'};">${dayDate.getDate()}</div>
                    <div style="font-size: 0.75rem; color: var(--color-text-muted); font-weight:600;">${vnDays[i]}</div>
                </div>
                <div style="height: 30px; width: 1px; background: var(--color-border);"></div>
                <div>
                    <div style="display:flex; gap:16px; align-items:center;">
                        <div>
                            <span style="font-size:0.75rem; color: var(--color-text-muted); display:block;">Đại tiện</span>
                            <div style="display:flex; gap:4px; align-items:center; margin-top:2px;">
                                ${poops.length === 0 ? '<span style="font-size: 0.75rem; opacity: 0.6;">-</span>' : 
                                    poops.map(p => {
                                        let emoji = '🍏';
                                        if (p.success === false) emoji = '🍋';
                                        else if (p.bristolType <= 2) emoji = '🍎';
                                        else if (p.bristolType >= 6) emoji = '🍇';
                                        else if (p.bristolType === 5) emoji = '🍋';
                                        return `<span style="font-size:1.15rem;" title="${p.time}">${emoji}</span>`;
                                    }).join('')
                                }
                            </div>
                        </div>
                        <div>
                            <span style="font-size:0.75rem; color: var(--color-text-muted); display:block;">Ăn uống</span>
                            <div style="font-size: 0.85rem; font-weight: 700; margin-top: 2px;">
                                ${foods.length > 0 ? `🍲 x${foods.length}` : '<span style="font-size:0.75rem; opacity: 0.6;">-</span>'}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Right side hydration
            const rightDiv = document.createElement('div');
            rightDiv.style.display = 'flex';
            rightDiv.style.alignItems = 'center';
            rightDiv.style.gap = '12px';

            rightDiv.innerHTML = `
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: var(--color-text-muted);">Nước uống</div>
                    <div style="font-weight:700; font-size: 0.95rem; color: var(--color-water); margin-top:4px;">${totalWater} / ${waterGoal} ml</div>
                </div>
                <div style="position: relative; width: 40px; height: 40px; border-radius: 50%; background: var(--color-border); overflow: hidden; display: flex; align-items: center; justify-content: center;">
                    <div style="position: absolute; bottom: 0; left: 0; right: 0; height: ${waterPercent}%; background: var(--color-water); opacity: 0.8; transition: height 0.3s;"></div>
                    <span style="font-size:0.75rem; font-weight:800; z-index:2; mix-blend-mode: difference; color: white;">${waterPercent}%</span>
                </div>
            `;

            row.appendChild(leftDiv);
            row.appendChild(rightDiv);

            row.addEventListener('click', () => {
                this.showDayDetails(dateStr);
            });

            weekContainer.appendChild(row);
        }

        container.appendChild(weekContainer);
    }

    // Render Year View
    renderYearView(container) {
        const year = this.calendarDate.getFullYear();
        
        const yearGrid = document.createElement('div');
        yearGrid.className = 'year-view-grid';
        yearGrid.style.display = 'grid';
        yearGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        yearGrid.style.gap = '16px';
        yearGrid.style.height = '100%';
        yearGrid.style.overflowY = 'auto';

        const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

        for (let m = 0; m < 12; m++) {
            const mCard = document.createElement('div');
            mCard.className = 'card';
            mCard.style.padding = '12px';
            mCard.style.borderRadius = '14px';

            const mTitle = document.createElement('h4');
            mTitle.innerText = monthNames[m];
            mTitle.style.marginBottom = '8px';
            mTitle.style.fontSize = '0.9rem';
            mCard.appendChild(mTitle);

            const miniGrid = document.createElement('div');
            miniGrid.style.display = 'grid';
            miniGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
            miniGrid.style.gap = '3px';

            const firstDay = new Date(year, m, 1);
            const lastDay = new Date(year, m + 1, 0);
            
            let startDay = firstDay.getDay();
            startDay = startDay === 0 ? 6 : startDay - 1; // Align Mon = 0

            for (let b = 0; b < startDay; b++) {
                const blank = document.createElement('div');
                miniGrid.appendChild(blank);
            }

            for (let d = 1; d <= lastDay.getDate(); d++) {
                const curDate = new Date(year, m, d);
                const dateStr = this.formatDateStr(curDate);
                
                const miniCell = document.createElement('div');
                miniCell.style.aspectRatio = '1';
                miniCell.style.borderRadius = '4px';
                miniCell.style.background = 'var(--color-border)';
                miniCell.style.cursor = 'pointer';
                miniCell.style.position = 'relative';

                const poops = this.poopLogs.filter(l => l.profileId === this.activeProfileId && l.date === dateStr);
                if (poops.length > 0) {
                    let hasDanger = false;
                    let hasRed = false;
                    let hasYellow = false;
                    poops.forEach(p => {
                        if (p.success === false) hasYellow = true;
                        else if (p.bristolType <= 2) hasRed = true;
                        else if (p.bristolType >= 6) hasDanger = true;
                        else if (p.bristolType === 5) hasYellow = true;
                    });

                    if (hasDanger) {
                        miniCell.style.background = 'var(--color-apple-danger)';
                    } else if (hasRed) {
                        miniCell.style.background = 'var(--color-apple-red)';
                    } else if (hasYellow) {
                        miniCell.style.background = 'var(--color-apple-yellow)';
                    } else {
                        miniCell.style.background = 'var(--color-apple-green)';
                    }
                }

                miniCell.addEventListener('click', () => {
                    this.showDayDetails(dateStr);
                });

                miniCell.title = `${d}/${m+1}/${year} - ${poops.length} lần đi vệ sinh`;
                miniGrid.appendChild(miniCell);
            }

            mCard.appendChild(miniGrid);
            yearGrid.appendChild(mCard);
        }

        container.appendChild(yearGrid);
    }

    // Modal popup details of selected day
    showDayDetails(dateStr) {
        const poops = this.poopLogs.filter(l => l.profileId === this.activeProfileId && l.date === dateStr);
        const waters = this.waterLogs.filter(l => l.profileId === this.activeProfileId && l.date === dateStr);
        const foods = this.foodLogs.filter(l => l.profileId === this.activeProfileId && l.date === dateStr);
        
        const totalWater = waters.reduce((s, w) => s + w.amount, 0);
        const activeProfile = this.getActiveProfile();
        
        // Chặn ghi log ngày tương lai
        const todayStr = this.formatDateStr(new Date());
        const isFuture = dateStr > todayStr;
        const finalCanWrite = this.checkPermissions(activeProfile.id, 'write_data') && !isFuture;

        const events = [];
        poops.forEach(p => events.push({ ...p, type: 'poop', timeVal: p.time }));
        waters.forEach(w => events.push({ ...w, type: 'water', timeVal: '00:00' }));
        foods.forEach(f => events.push({ ...f, type: 'food', timeVal: f.time }));

        events.sort((a, b) => a.timeVal.localeCompare(b.timeVal));

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay show';
        overlay.id = 'tempDetailsModal';
        document.body.classList.add('modal-open');

        const rawDate = new Date(dateStr);
        const vnDateStr = `${rawDate.getDate()} Tháng ${rawDate.getMonth() + 1}, ${rawDate.getFullYear()}`;

        const symptomsMap = {
            'pain': 'Đau bụng',
            'bloating': 'Đầy hơi/Khó tiêu',
            'bleeding': 'Có máu',
            'strain': 'Rặn khó',
            'easy': 'Dễ dàng',
            'urgency': 'Mót gấp'
        };

        const portionMap = {
            'light': 'Ít / Nhẹ bụng 🥗',
            'normal': 'Vừa đủ / No 🍲',
            'heavy': 'Quá no / Đầy bụng 🥩🍕'
        };

        const modal = document.createElement('div');
        modal.className = 'modal shadow-blur modal-lg';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Chi tiết nhật ký ngày ${vnDateStr}</h3>
                <button class="btn btn-icon" id="btnCloseTempModal"><i data-lucide="x"></i></button>
            </div>
            <div class="modal-body">
                <div class="card ${finalCanWrite ? '' : 'disabled-gray'}" id="dayDetailsWaterCard" style="background: var(--color-primary-light); margin-bottom: 20px; border-color: rgba(99, 102, 241, 0.1); padding: 16px; cursor: ${finalCanWrite ? 'pointer' : 'default'};" title="${finalCanWrite ? 'Nhấp để ghi nước uống ngày này' : 'Không thể ghi nhận cho ngày tương lai'}">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap;">
                        <span style="font-weight:700;"><i data-lucide="droplet" class="text-water"></i> Lượng nước nạp vào ${finalCanWrite ? '(Nhấp để ghi)' : ''}:</span>
                        <span style="font-weight:800; font-size:1.15rem; color:var(--color-water);">${totalWater} / ${activeProfile.waterGoal} ml 💧</span>
                    </div>
                </div>

                <h4 style="font-weight:700; margin-bottom:12px; border-bottom:1px solid var(--color-border); padding-bottom:8px;">Dòng sự kiện trong ngày</h4>
                
                ${events.length === 0 ? `
                    <div style="text-align:center; padding: 32px 0; color: var(--color-text-muted);">
                        <span style="font-size:2.5rem;">📅</span>
                        <p style="margin-top:10px; font-weight:600;">Chưa ghi nhận hoạt động nào trong ngày này.</p>
                    </div>
                ` : `
                    <div class="timeline-container">
                        ${events.map(ev => {
                            if (ev.type === 'poop') {
                                const isUnsuccessful = ev.success === false;
                                let apple = '🍏';
                                let dotClass = 'poop';
                                let typeText = 'Đi ngoài thành công';

                                if (isUnsuccessful) {
                                    apple = '🍋';
                                    dotClass = 'poop yellow';
                                    typeText = 'Đau bụng rặn không ra';
                                } else if (ev.bristolType <= 2) {
                                    apple = '🍎';
                                    dotClass = 'poop consti';
                                    typeText = `Bị Táo Bón (Bristol loại ${ev.bristolType})`;
                                } else if (ev.bristolType >= 6) {
                                    apple = '🍇';
                                    dotClass = 'poop danger';
                                    typeText = `Bị Tiêu Chảy (Bristol loại ${ev.bristolType})`;
                                } else if (ev.bristolType === 5) {
                                    apple = '🍋';
                                    dotClass = 'poop yellow';
                                    typeText = `Phân thiếu xơ (Bristol loại 5)`;
                                } else {
                                    typeText = `Lý tưởng (Bristol loại ${ev.bristolType})`;
                                }

                                return `
                                    <div class="timeline-item">
                                        <div class="timeline-dot ${dotClass}"></div>
                                        <div class="timeline-content-card">
                                            <div class="timeline-time-badge">${ev.time}</div>
                                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                                                <span style="font-size:1.4rem;">${apple}</span>
                                                <span style="font-weight:700;">${typeText}</span>
                                            </div>
                                            ${ev.symptoms && ev.symptoms.length > 0 ? `
                                                <div style="margin-top:8px;">
                                                    <span style="font-size:0.75rem; color: var(--color-text-muted); display:block; font-weight:600;">Triệu chứng đi kèm:</span>
                                                    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:4px;">
                                                        ${ev.symptoms.map(s => `<span style="font-size:0.7rem; font-weight:700; background:var(--color-primary-light); color:var(--color-primary-dark); padding:2px 6px; border-radius:6px;">${symptomsMap[s] || s}</span>`).join('')}
                                                    </div>
                                                </div>
                                            ` : ''}
                                            ${ev.notes ? `
                                                <div style="margin-top:8px; font-size:0.8rem; background: var(--color-border); padding: 8px; border-radius: 8px;">
                                                    <strong>Ghi chú:</strong> ${ev.notes}
                                                </div>
                                            ` : ''}
                                            <button class="btn btn-icon btn-delete-event ${finalCanWrite ? '' : 'disabled-gray'}" data-type="poop" data-log-id="${ev.id}" style="position:absolute; bottom:8px; right:8px; width:28px; height:28px; padding:4px;">
                                                <i data-lucide="trash-2" style="width:14px; height:14px; color:var(--color-apple-red);"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            } else if (ev.type === 'food') {
                                const mealVN = ev.mealType === 'main' ? 'Bữa chính' : 'Bữa phụ';
                                return `
                                    <div class="timeline-item">
                                        <div class="timeline-dot food"></div>
                                        <div class="timeline-content-card" style="border-left: 4px solid #f59e0b;">
                                            <div class="timeline-time-badge">${ev.time}</div>
                                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                                                <span style="font-size:1.4rem;">🍲</span>
                                                <span style="font-weight:700;">Ăn uống: ${ev.foodName}</span>
                                            </div>
                                            <div style="font-size:0.8rem; color:var(--color-text-muted); font-weight:600;">
                                                ${mealVN} &bull; Khẩu phần: ${portionMap[ev.portionSize] || ev.portionSize}
                                            </div>
                                            <button class="btn btn-icon btn-delete-event ${finalCanWrite ? '' : 'disabled-gray'}" data-type="food" data-log-id="${ev.id}" style="position:absolute; bottom:8px; right:8px; width:28px; height:28px; padding:4px;">
                                                <i data-lucide="trash-2" style="width:14px; height:14px; color:var(--color-apple-red);"></i>
                                            </button>
                                        </div>
                                    </div>
                                `;
                            } else if (ev.type === 'water') {
                                const beverageNames = {
                                    'pure_water': 'Nước lọc 💧',
                                    'juice': 'Nước ép 🍏',
                                    'soft_drink': 'Nước ngọt 🥤',
                                    'milk_tea': 'Trà sữa 🧋',
                                    'tea_coffee': 'Trà/Cà phê ☕',
                                    'alcohol': 'Bia rượu 🍺'
                                };
                                const bevName = beverageNames[ev.beverageType || 'pure_water'];
                                const effAmount = this.getEffectiveWater(ev.amount, ev.beverageType);
                                
                                return `
                                    <div class="timeline-item">
                                        <div class="timeline-dot water"></div>
                                        <div class="timeline-content-card" style="border-left: 4px solid var(--color-water); padding: 12px 16px;">
                                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                                <div style="display:flex; align-items:center; gap:8px;">
                                                    <span style="font-size:1.3rem;">💧</span>
                                                    <div>
                                                        <span style="font-weight:700; color:var(--color-water-dark);">Uống ${ev.amount} ml (${bevName})</span>
                                                        <span style="font-size:0.7rem; color:var(--color-text-muted); display:block; font-weight:600;">Hấp thụ thực tế: ${effAmount} ml</span>
                                                    </div>
                                                </div>
                                                <button class="btn btn-icon btn-delete-event ${finalCanWrite ? '' : 'disabled-gray'}" data-type="water" data-log-id="${ev.id}" style="width:28px; height:28px; padding:4px; position:static;">
                                                    <i data-lucide="trash-2" style="width:14px; height:14px; color:var(--color-apple-red);"></i>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }
                        }).join('')}
                    </div>
                `}
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary ${finalCanWrite ? '' : 'disabled-gray'}" id="btnLogPoopForDay" style="font-size:0.85rem;">+ Ghi Đại Tiện</button>
                <button class="btn btn-secondary ${finalCanWrite ? '' : 'disabled-gray'}" id="btnLogFoodForDay" style="font-size:0.85rem; background:#f59e0b; border-color:#f59e0b;">+ Ghi Ăn Uống</button>
                <button class="btn btn-outline" id="btnCloseTempModal2">Đóng</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        lucide.createIcons();

        const closeFn = () => {
            overlay.classList.remove('show');
            const openModals = document.querySelectorAll('.modal.show, .modal-overlay.show');
            if (openModals.length <= 1) {
                document.body.classList.remove('modal-open');
            }
            setTimeout(() => overlay.remove(), 200);
        };
        
        document.getElementById('btnCloseTempModal').addEventListener('click', closeFn);
        document.getElementById('btnCloseTempModal2').addEventListener('click', closeFn);

        overlay.addEventListener('click', (e) => {
            if (e.target.id === 'tempDetailsModal') {
                closeFn();
            }
        });
        
        document.getElementById('btnLogPoopForDay').addEventListener('click', () => {
            if (document.getElementById('btnLogPoopForDay').classList.contains('disabled-gray')) return;
            closeFn();
            this.openPoopModal();
            document.getElementById('poopDateInput').value = dateStr;
        });

        document.getElementById('btnLogFoodForDay').addEventListener('click', () => {
            if (document.getElementById('btnLogFoodForDay').classList.contains('disabled-gray')) return;
            closeFn();
            this.openFoodModal();
            document.getElementById('foodDateInput').value = dateStr;
        });

        const waterCard = document.getElementById('dayDetailsWaterCard');
        if (waterCard) {
            waterCard.addEventListener('click', () => {
                if (waterCard.classList.contains('disabled-gray')) return;
                closeFn();
                this.openWaterModal();
                document.getElementById('waterDateInput').value = dateStr;
            });
        }

        overlay.querySelectorAll('.btn-delete-event').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('disabled-gray')) return;
                const logId = btn.getAttribute('data-log-id');
                const type = btn.getAttribute('data-type');
                
                if (confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
                    if (type === 'poop') {
                        this.poopLogs = this.poopLogs.filter(l => l.id !== logId);
                    } else if (type === 'food') {
                        this.foodLogs = this.foodLogs.filter(l => l.id !== logId);
                    } else if (type === 'water') {
                        this.waterLogs = this.waterLogs.filter(l => l.id !== logId);
                    }
                    
                    this.saveDataToStorage();
                    closeFn();
                    this.renderCalendar();
                    this.checkHealthAlerts();
                    this.checkAndUnlockBadges();
                    this.updateStreaksUI();
                    this.pushLogsToCloud();
                }
            });
        });
    }

    // Render Stats & Charts in Analytics Tab
    renderAnalyticsTab() {
        const viewMode = document.getElementById('analyticsViewSelect').value;
        const isCompare = document.getElementById('compareProfilesCheckbox').checked;
        const compareProfileId = document.getElementById('compareProfileSelect').value;

        const currentProfile = this.getActiveProfile();
        let targetProfile = null;
        if (isCompare && compareProfileId) {
            targetProfile = this.profiles.find(p => p.id === compareProfileId);
        }

        if (viewMode === 'year') {
            const currentSelected = document.getElementById('analyticsYearPicker').value;
            this.populateYearPicker(new Date().getFullYear());
            if (currentSelected) {
                document.getElementById('analyticsYearPicker').value = currentSelected;
            }
        }

        const datesRange = [];
        let labelFormat = 'day'; 

        if (viewMode === 'month') {
            const pickerVal = document.getElementById('analyticsMonthPicker').value;
            let year = new Date().getFullYear();
            let month = new Date().getMonth();
            
            if (pickerVal) {
                const parts = pickerVal.split('-');
                year = parseInt(parts[0]);
                month = parseInt(parts[1]) - 1;
            }

            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dayStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                datesRange.push(dayStr);
            }
            labelFormat = 'day';
            
            document.getElementById('chartTitleBowel').innerText = `Tần suất đi đại tiện - Tháng ${month+1}/${year}`;
            document.getElementById('chartTitleWater').innerText = `Lượng nước & Sức khỏe tiêu hóa - Tháng ${month+1}/${year}`;
        } else if (viewMode === 'year') {
            const pickerVal = document.getElementById('analyticsYearPicker').value;
            const year = pickerVal ? parseInt(pickerVal) : new Date().getFullYear();
            
            for (let m = 0; m < 12; m++) {
                datesRange.push(`${year}-${String(m+1).padStart(2, '0')}`);
            }
            labelFormat = 'month';

            document.getElementById('chartTitleBowel').innerText = `Tần suất đi đại tiện - Năm ${year}`;
            document.getElementById('chartTitleWater').innerText = `Lượng nước & Sức khỏe tiêu hóa - Năm ${year}`;
        }

        // Stats summary metrics
        this.renderStatsSummary(datesRange, viewMode, currentProfile, targetProfile);

        // Prep datasets
        const poopDataCurrent = this.getPoopChartData(currentProfile.id, datesRange, labelFormat);
        const waterDataCurrent = this.getWaterChartData(currentProfile.id, datesRange, labelFormat);

        let poopDataCompare = null;
        let waterDataCompare = null;

        if (isCompare && targetProfile) {
            poopDataCompare = this.getPoopChartData(targetProfile.id, datesRange, labelFormat);
            waterDataCompare = this.getWaterChartData(targetProfile.id, datesRange, labelFormat);
        }

        // Draw
        this.drawBowelChart(datesRange, poopDataCurrent, poopDataCompare, currentProfile, targetProfile, labelFormat);
        this.drawWaterChart(datesRange, waterDataCurrent, waterDataCompare, currentProfile, targetProfile, labelFormat);
        
        // Reset AI analysis panel placeholder
        document.getElementById('aiAnalysisPlaceholder').classList.remove('hide');
        document.getElementById('aiAnalysisLoading').classList.add('hide');
        document.getElementById('aiAnalysisResultsGrid').classList.add('hide');
    }

    // Process Poop logs frequency counting for charts
    getPoopChartData(profileId, range, format) {
        const counts = range.map(() => 0);
        
        this.poopLogs.forEach(log => {
            if (log.profileId !== profileId) return;

            let logKey = '';
            if (format === 'day') {
                logKey = log.date;
            } else if (format === 'month') {
                logKey = log.date.substring(0, 7);
            }

            const idx = range.indexOf(logKey);
            if (idx !== -1) {
                counts[idx]++;
            }
        });
        
        return counts;
    }

    // Process Water logs amount summing for charts
    getWaterChartData(profileId, range, format) {
        const sums = range.map(() => 0);
        
        this.waterLogs.forEach(log => {
            if (log.profileId !== profileId) return;

            let logKey = '';
            if (format === 'day') {
                logKey = log.date;
            } else if (format === 'month') {
                logKey = log.date.substring(0, 7);
            }

            const idx = range.indexOf(logKey);
            if (idx !== -1) {
                sums[idx] += this.getEffectiveWater(log.amount, log.beverageType);
            }
        });

        if (format === 'month') {
            sums.forEach((sum, idx) => {
                sums[idx] = Math.round(sum / 30);
            });
        }
        
        return sums;
    }

    // Render Stats summary text metrics (with support for comparison mode)
    renderStatsSummary(datesRange, timeframe, currentProfile, targetProfile = null) {
        // 1. Calculate current profile stats
        const poopsCurrent = this.poopLogs.filter(l => l.profileId === currentProfile.id && 
            (timeframe === 'month' ? datesRange.includes(l.date) : datesRange.includes(l.date.substring(0, 7)))
        );

        let regCountCurrent = 0;
        let successPoopsCurrent = 0;
        poopsCurrent.forEach(p => {
            if (p.success !== false) {
                successPoopsCurrent++;
                if (p.bristolType === 3 || p.bristolType === 4) {
                    regCountCurrent++;
                }
            }
        });
        const regPercentCurrent = successPoopsCurrent > 0 ? Math.round((regCountCurrent / successPoopsCurrent) * 100) : 0;

        const watersCurrent = this.waterLogs.filter(w => w.profileId === currentProfile.id && 
            (timeframe === 'month' ? datesRange.includes(w.date) : datesRange.includes(w.date.substring(0, 7)))
        );
        const waterByDayCurrent = {};
        watersCurrent.forEach(w => {
            waterByDayCurrent[w.date] = (waterByDayCurrent[w.date] || 0) + this.getEffectiveWater(w.amount, w.beverageType);
        });
        const activeDaysCurrent = Object.keys(waterByDayCurrent).length;
        const sumWaterCurrent = watersCurrent.reduce((s, w) => s + w.amount, 0);
        const avgWaterCurrent = activeDaysCurrent > 0 ? Math.round(sumWaterCurrent / activeDaysCurrent) : 0;

        // 2. Display logic based on comparison mode
        if (targetProfile) {
            // Calculate target profile stats
            const poopsTarget = this.poopLogs.filter(l => l.profileId === targetProfile.id && 
                (timeframe === 'month' ? datesRange.includes(l.date) : datesRange.includes(l.date.substring(0, 7)))
            );

            let regCountTarget = 0;
            let successPoopsTarget = 0;
            poopsTarget.forEach(p => {
                if (p.success !== false) {
                    successPoopsTarget++;
                    if (p.bristolType === 3 || p.bristolType === 4) {
                        regCountTarget++;
                    }
                }
            });
            const regPercentTarget = successPoopsTarget > 0 ? Math.round((regCountTarget / successPoopsTarget) * 100) : 0;

            const watersTarget = this.waterLogs.filter(w => w.profileId === targetProfile.id && 
                (timeframe === 'month' ? datesRange.includes(w.date) : datesRange.includes(w.date.substring(0, 7)))
            );
            const waterByDayTarget = {};
            watersTarget.forEach(w => {
                waterByDayTarget[w.date] = (waterByDayTarget[w.date] || 0) + this.getEffectiveWater(w.amount, w.beverageType);
            });
            const activeDaysTarget = Object.keys(waterByDayTarget).length;
            const sumWaterTarget = watersTarget.reduce((s, w) => s + w.amount, 0);
            const avgWaterTarget = activeDaysTarget > 0 ? Math.round(sumWaterTarget / activeDaysTarget) : 0;

            // Render UI with Comparison Column
            document.getElementById('statTotalPoops').innerHTML = `<span style="color:var(--color-primary);">${poopsCurrent.length}</span> <span style="font-size:0.9rem; color:var(--color-text-muted); font-weight:normal;">vs</span> <span style="color:#10b981;">${poopsTarget.length}</span>`;
            document.getElementById('statTotalPoopsSub').innerText = `${currentProfile.name} vs ${targetProfile.name}`;

            document.getElementById('statRegularityPercent').innerHTML = `<span style="color:var(--color-primary);">${regPercentCurrent}%</span> <span style="font-size:0.9rem; color:var(--color-text-muted); font-weight:normal;">vs</span> <span style="color:#10b981;">${regPercentTarget}%</span>`;
            document.getElementById('statRegularitySub').innerText = `Đều đặn (Táo xanh) của 2 profile`;

            document.getElementById('statAvgWater').innerHTML = `<span style="color:var(--color-primary);">${avgWaterCurrent} ml</span> <span style="font-size:0.9rem; color:var(--color-text-muted); font-weight:normal;">vs</span> <span style="color:#10b981;">${avgWaterTarget} ml</span>`;
            document.getElementById('statAvgWaterSub').innerText = `Lượng nước trung bình mỗi ngày`;
        } else {
            // Render standard Single Profile View
            document.getElementById('statTotalPoops').innerText = poopsCurrent.length;
            document.getElementById('statTotalPoopsSub').innerText = timeframe === 'month' ? 'Lần đi đại tiện trong tháng' : 'Lần đi đại tiện trong năm';

            document.getElementById('statRegularityPercent').innerText = `${regPercentCurrent}%`;
            document.getElementById('statRegularitySub').innerText = `Được tính từ loại phân lý tưởng (3-4)`;

            const targetGoal = currentProfile.waterGoal || 2000;
            const goalPercent = targetGoal > 0 ? Math.min(Math.round((avgWaterCurrent / targetGoal) * 100), 100) : 0;
            document.getElementById('statAvgWater').innerText = `${avgWaterCurrent} ml/ngày`;
            document.getElementById('statAvgWaterSub').innerText = `Đạt ${goalPercent}% mục tiêu (${activeDaysCurrent}/${datesRange.length} ngày log)`;
        }
    }

    // Chart.js Bowel Chart drawing
    drawBowelChart(labels, currentData, compareData, currentProfile, targetProfile, format) {
        const ctx = document.getElementById('bowelChart').getContext('2d');
        if (this.bowelChart) this.bowelChart.destroy();

        const isDark = document.body.classList.contains('theme-dark');
        const textColor = isDark ? '#94a3b8' : '#718096';
        const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';

        const formattedLabels = labels.map(label => {
            if (format === 'day') {
                return label.split('-')[2];
            } else {
                return `Thg ${label.split('-')[1]}`;
            }
        });

        const datasets = [{
            label: currentProfile.name,
            data: currentData,
            backgroundColor: 'rgba(99, 102, 241, 0.65)',
            borderColor: 'rgba(99, 102, 241, 1)',
            borderWidth: 1.5,
            borderRadius: 6,
            barThickness: format === 'day' ? 8 : 24
        }];

        if (compareData && targetProfile) {
            datasets.push({
                label: targetProfile.name,
                data: compareData,
                backgroundColor: 'rgba(16, 185, 129, 0.65)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1.5,
                borderRadius: 6,
                barThickness: format === 'day' ? 8 : 24
            });
        }

        this.bowelChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: formattedLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    x: {
                        grid: { color: 'transparent' },
                        ticks: { color: textColor }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            stepSize: 1,
                            precision: 0
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Chart.js Water Chart drawing
    drawWaterChart(labels, currentData, compareData, currentProfile, targetProfile, format) {
        const ctx = document.getElementById('waterChart').getContext('2d');
        if (this.waterChart) this.waterChart.destroy();

        const isDark = document.body.classList.contains('theme-dark');
        const textColor = isDark ? '#94a3b8' : '#718096';
        const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.8)';

        const formattedLabels = labels.map(label => {
            if (format === 'day') {
                return label.split('-')[2];
            } else {
                return `Thg ${label.split('-')[1]}`;
            }
        });

        const datasets = [{
            label: `${currentProfile.name} (Nước)`,
            data: currentData,
            type: 'line',
            borderColor: 'rgba(59, 130, 246, 1)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.35,
            borderWidth: 3,
            pointBackgroundColor: 'rgba(59, 130, 246, 1)'
        }];

        if (compareData && targetProfile) {
            datasets.push({
                label: `${targetProfile.name} (Nước)`,
                data: compareData,
                type: 'line',
                borderColor: 'rgba(245, 158, 11, 1)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.35,
                borderWidth: 3,
                pointBackgroundColor: 'rgba(245, 158, 11, 1)'
            });
        }

        this.waterChart = new Chart(ctx, {
            data: {
                labels: formattedLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    x: {
                        grid: { color: 'transparent' },
                        ticks: { color: textColor }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            callback: value => `${value} ml`
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Advanced cross-referencing health analyzer
    checkHealthAlerts() {
        const card = document.getElementById('healthAlertCard');
        const text = document.getElementById('healthAlertText');
        const activeProfile = this.getActiveProfile();
        
        if (!card || !text) return;

        const today = new Date();
        const last3DaysStr = [];
        for (let i = 0; i < 3; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            last3DaysStr.push(this.formatDateStr(d));
        }

        const recentPoops = this.poopLogs.filter(l => l.profileId === activeProfile.id && last3DaysStr.includes(l.date));
        const recentWaters = this.waterLogs.filter(w => w.profileId === activeProfile.id && last3DaysStr.includes(w.date));
        const recentFoods = this.foodLogs.filter(f => f.profileId === activeProfile.id && last3DaysStr.includes(f.date));

        const waterByDay = {};
        let totalVolume3Days = 0;
        let sugarVolume3Days = 0;
        let diureticVolume3Days = 0;

        recentWaters.forEach(w => {
            const effAmt = this.getEffectiveWater(w.amount, w.beverageType);
            waterByDay[w.date] = (waterByDay[w.date] || 0) + effAmt;
            
            totalVolume3Days += w.amount;
            if (w.beverageType === 'soft_drink' || w.beverageType === 'milk_tea') {
                sugarVolume3Days += w.amount;
            } else if (w.beverageType === 'tea_coffee' || w.beverageType === 'alcohol') {
                diureticVolume3Days += w.amount;
            }
        });
        
        let targetGoal = activeProfile.waterGoal || 2000;
        let totalWaterLogs = 0;
        let sumWaterIntake = 0;
        
        last3DaysStr.forEach(d => {
            const amt = waterByDay[d] || 0;
            if (amt > 0) totalWaterLogs++;
            sumWaterIntake += amt;
        });

        const avgWater3Days = totalWaterLogs > 0 ? (sumWaterIntake / 3) : 0;
        const waterPercentOfGoal = targetGoal > 0 ? (avgWater3Days / targetGoal) : 0;

        let constiCount = 0;
        let yellowCount = 0;
        let diarrheaCount = 0;
        let successfulPoops = 0;

        recentPoops.forEach(p => {
            if (p.success === false) {
                yellowCount++;
            } else {
                successfulPoops++;
                if (p.bristolType <= 2) constiCount++;
                else if (p.bristolType >= 6) diarrheaCount++;
                else if (p.bristolType === 5) yellowCount++;
            }
        });

        const heavyMealsCount = recentFoods.filter(f => f.portionSize === 'heavy').length;

        let alertTriggered = false;
        let alertHTML = '';
        let alertBg = 'var(--color-primary-light)';
        let alertBorder = 'var(--color-primary)';
        let alertIconColor = 'var(--color-primary)';
        let alertIcon = 'info';
        let alertHeading = 'Phân tích tiêu hóa';

        // 1. Diarrhea alarm (Bristol 6-7)
        if (diarrheaCount > 0) {
            alertTriggered = true;
            alertBg = 'var(--color-apple-red-light)';
            alertBorder = 'rgba(239, 68, 68, 0.25)';
            alertIconColor = 'var(--color-apple-red-dark)';
            alertIcon = 'alert-triangle';
            alertHeading = 'Cảnh báo: Tiêu Chảy Nguy Hiểm 🍇';
            
            let hydrationText = ' Hãy nhanh chóng bù thêm dung dịch điện giải (Oresol) để phòng tránh mất nước kiệt sức.';
            if (waterPercentOfGoal < 0.6) {
                hydrationText += ' <strong>Uống cực kỳ ít nước trong 3 ngày qua!</strong> Cơ thể bạn đang thiếu nước nghiêm trọng.';
            }

            alertHTML = `
                Bạn có ghi nhận <strong>tiêu chảy (Táo tím)</strong> gần đây.${hydrationText}
                <br><br>
                💡 <em>Lời khuyên: Nên ăn cháo loãng với muối, tạm ngưng sữa, bia rượu, đồ chiên rán nhiều dầu mỡ. Nếu tình trạng tiêu chảy kéo dài trên 2 ngày kèm sốt, hãy tới cơ sở y tế.</em>
            `;
        }
        // 2. High Diuretic Drinks Alarm (Coffee, Tea, Alcohol > 40% total water)
        else if (totalVolume3Days > 0 && (diureticVolume3Days / totalVolume3Days) >= 0.40) {
            alertTriggered = true;
            alertBg = 'var(--color-apple-red-light)';
            alertBorder = 'rgba(239, 68, 68, 0.25)';
            alertIconColor = 'var(--color-apple-red-dark)';
            alertIcon = 'alert-triangle';
            alertHeading = 'Nguy cơ mất nước do đồ uống lợi tiểu ☕🍺';

            const pct = Math.round((diureticVolume3Days / totalVolume3Days) * 100);
            alertHTML = `
                Trong 3 ngày qua, **${pct}% lượng nước** nạp vào đến từ Trà, Cà phê hoặc Bia rượu. Chất cafein và cồn có tính chất lợi tiểu mạnh, kích thích thận đào thải nước ra ngoài nhanh hơn hấp thụ, dễ gây phân khô cứng dẫn đến táo bón nặng.
                <br><br>
                💡 <em>Lời khuyên: Hãy giảm bớt lượng caffeine/bia rượu và uống thêm ít nhất 2 ly nước lọc lớn (💧) sau mỗi cốc trà/cà phê để bù đắp sự mất nước.</em>
            `;
        }
        // 3. High Sugar Drinks Alarm (Soft drinks, Milk tea > 40% total water)
        else if (totalVolume3Days > 0 && (sugarVolume3Days / totalVolume3Days) >= 0.40) {
            alertTriggered = true;
            alertBg = 'var(--color-apple-yellow-light)';
            alertBorder = 'rgba(234, 179, 8, 0.3)';
            alertIconColor = 'var(--color-apple-yellow-dark)';
            alertIcon = 'meh';
            alertHeading = 'Đầy Hơi & Tiêu Chảy Do Thừa Đường 🥤🧋';

            const pct = Math.round((sugarVolume3Days / totalVolume3Days) * 100);
            alertHTML = `
                Ghi nhận **${pct}% lượng nước** nạp vào từ Nước ngọt hoặc Trà sữa. Đường tinh luyện cao kích thích áp suất thẩm thấu ở ruột kéo nước vào lòng ruột, gây sôi bụng chướng hơi và có thể dẫn đến tiêu chảy nhẹ hoặc chướng bụng khó tiêu.
                <br><br>
                💡 <em>Lời khuyên: Thay thế nước ngọt bằng nước lọc tinh khiết hoặc nước ép hoa quả ít đường (🍏) để bảo vệ lợi khuẩn đường ruột và cải thiện độ đặc của phân.</em>
            `;
        }
        // 4. Heavy meals + constipation
        else if (heavyMealsCount >= 2 && (constiCount > 0 || yellowCount > 0 || recentPoops.length === 0)) {
            alertTriggered = true;
            alertBg = 'var(--color-apple-yellow-light)';
            alertBorder = 'rgba(234, 179, 8, 0.3)';
            alertIconColor = 'var(--color-apple-yellow-dark)';
            alertIcon = 'meh';
            alertHeading = 'Đầy Bụng Khó Tiêu 🍋';

            alertHTML = `
                Dữ liệu cho thấy bạn đã ăn <strong>${heavyMealsCount} bữa quá no</strong> gần đây kết hợp với tình trạng khó đi đại tiện (hoặc táo bón).
                <br><br>
                💡 <em>Lời khuyên: Cơ thể đang quá tải. Hãy ăn các bữa ăn nhẹ hơn (cháo, soup, nhiều rau xanh), nhai kỹ và mát-xa bụng nhẹ nhàng theo chiều kim đồng hồ để kích thích ruột.</em>
            `;
        }
        // 5. Dehydration + Constipation
        else if (waterPercentOfGoal < 0.7 && (constiCount > 0 || yellowCount > 0 || recentPoops.length === 0)) {
            alertTriggered = true;
            alertBg = 'var(--color-apple-red-light)';
            alertBorder = 'rgba(239, 68, 68, 0.25)';
            alertIconColor = 'var(--color-apple-red-dark)';
            alertIcon = 'frown';
            alertHeading = 'Nguy Cơ Táo Bón Cao (Táo đỏ 🍎)';

            alertHTML = `
                Lượng nước uống hữu hiệu trung bình 3 ngày gần đây của bạn chỉ đạt <strong>${Math.round(waterPercentOfGoal * 100)}% mục tiêu</strong> kết hợp phân bị khô cứng / thiếu xơ.
                <br><br>
                💡 <em>Lời khuyên: Uống ngay 1 ly nước lọc lớn (300ml 💧). Bổ sung thêm thực phẩm nhuận tràng như khoai lang, đu đủ chín, chuối tiêu để hỗ trợ tạo phân mềm dễ đi hơn.</em>
            `;
        }
        // 6. Ideal Health!
        else if (waterPercentOfGoal >= 0.9 && successfulPoops > 0 && constiCount === 0 && diarrheaCount === 0 && yellowCount === 0) {
            alertTriggered = true;
            alertBg = 'var(--color-apple-green-light)';
            alertBorder = 'rgba(16, 185, 129, 0.25)';
            alertIconColor = 'var(--color-apple-green-dark)';
            alertIcon = 'smile';
            alertHeading = 'Tiêu Hóa Cực Tốt! 🍏';

            alertHTML = `
                Tuyệt vời! Bạn uống đủ nước lọc hữu hiệu (<strong>${Math.round(waterPercentOfGoal * 100)}% mục tiêu</strong>) và trạng thái phân hoàn toàn đẹp đẽ, lý tưởng (Táo xanh) trong những ngày qua.
                <br><br>
                💡 <em>Lời khuyên: Hãy tiếp tục duy trì thực đơn cân bằng và thói quen sinh hoạt lành mạnh hiện tại nhé!</em>
            `;
        }
        // General backup check
        else {
            const sortedLogs = this.poopLogs
                .filter(l => l.profileId === activeProfile.id && l.success !== false)
                .sort((a, b) => new Date(`${b.date}T${b.time}`) - new Date(`${a.date}T${a.time}`));
            
            if (sortedLogs.length > 0) {
                const lastPoopDate = new Date(`${sortedLogs[0].date}T${sortedLogs[0].time}`);
                const diffDays = Math.floor((new Date() - lastPoopDate) / (1000 * 60 * 60 * 24));
                if (diffDays >= 3) {
                    alertTriggered = true;
                    alertBg = 'var(--color-apple-red-light)';
                    alertBorder = 'rgba(239, 68, 68, 0.25)';
                    alertIconColor = 'var(--color-apple-red-dark)';
                    alertIcon = 'alert-triangle';
                    alertHeading = 'Cảnh báo: Nhiều ngày chưa đại tiện!';
                    
                    alertHTML = `
                        Đã <strong>${diffDays} ngày</strong> bạn chưa ghi nhận đi đại tiện thành công.
                        <br><br>
                        💡 <em>Lời khuyên: Hãy tăng cường bổ sung chất xơ nhuận tràng, uống nhiều nước ấm vào buổi sáng ngủ dậy, và đi khám nếu bạn bắt đầu cảm thấy chướng bụng đau quặn dữ dội.</em>
                    `;
                }
            }
        }

        if (alertTriggered) {
            card.classList.remove('hide');
            card.style.background = alertBg;
            card.style.borderColor = alertBorder;
            
            const iconEl = card.querySelector('.alert-icon');
            iconEl.className = 'alert-icon';
            iconEl.style.color = alertIconColor;
            iconEl.setAttribute('data-lucide', alertIcon);
            
            card.querySelector('h4').innerText = alertHeading;
            text.innerHTML = alertHTML;
            lucide.createIcons();
        } else {
            card.classList.add('hide');
        }
    }

    // GAMIFICATION Streaks calculations
    calculateStreaks() {
        const activeProfile = this.getActiveProfile();
        const today = new Date();
        
        let waterStreak = 0;
        let healthyStreak = 0;

        // 1. Water Streak Calculation
        let checkDate = new Date(today);
        let stopWater = false;

        while (!stopWater) {
            const dateStr = this.formatDateStr(checkDate);
            const waters = this.waterLogs.filter(w => w.profileId === activeProfile.id && w.date === dateStr);
            const totalWater = waters.reduce((s, w) => s + this.getEffectiveWater(w.amount, w.beverageType), 0);
            const targetGoal = activeProfile.waterGoal || 2000;

            if (totalWater >= targetGoal) {
                waterStreak++;
                checkDate.setDate(checkDate.getDate() - 1);
            } else {
                // If it is today and we haven't reached goal yet, check yesterday to keep streak alive
                if (dateStr === this.formatDateStr(today)) {
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    stopWater = true;
                }
            }
        }

        // 2. Healthy Bowel Streak Calculation (Days without abnormal logs)
        checkDate = new Date(today);
        let stopHealthy = false;
        let consecutiveEmptyDays = 0;

        while (!stopHealthy) {
            const dateStr = this.formatDateStr(checkDate);
            const poops = this.poopLogs.filter(p => p.profileId === activeProfile.id && p.date === dateStr);

            let hasAbnormal = false;
            let hasPerfect = false;

            poops.forEach(p => {
                if (p.success === false || p.bristolType <= 2 || p.bristolType >= 6 || p.bristolType === 5) {
                    hasAbnormal = true;
                } else {
                    hasPerfect = true;
                }
            });

            if (hasAbnormal) {
                stopHealthy = true;
            } else {
                if (poops.length === 0) {
                    consecutiveEmptyDays++;
                    // If no logs for more than 3 consecutive days, break streak (possible forgotten logs / constipation)
                    if (consecutiveEmptyDays > 3) {
                        stopHealthy = true;
                    } else {
                        // Keep streak going but don't count empty day towards streak size
                        checkDate.setDate(checkDate.getDate() - 1);
                    }
                } else {
                    consecutiveEmptyDays = 0;
                    if (hasPerfect) {
                        healthyStreak++;
                    }
                    checkDate.setDate(checkDate.getDate() - 1);
                }
            }
        }

        return { waterStreak, healthyStreak };
    }

    // Update Dashboard Streaks UI values and save max record
    updateStreaksUI() {
        const streaks = this.calculateStreaks();
        document.getElementById('waterStreakVal').innerText = streaks.waterStreak;
        document.getElementById('healthyStreakVal').innerText = streaks.healthyStreak;

        // Lưu giữ kỷ lục chuỗi dài nhất cho profile hoạt động
        const profile = this.getActiveProfile();
        if (profile) {
            let changed = false;
            if (streaks.waterStreak > (profile.maxWaterStreak || 0)) {
                profile.maxWaterStreak = streaks.waterStreak;
                changed = true;
            }
            if (streaks.healthyStreak > (profile.maxHealthyStreak || 0)) {
                profile.maxHealthyStreak = streaks.healthyStreak;
                changed = true;
            }

            if (changed) {
                this.saveDataToStorage();
                // Nếu đang ở tab profile thì cập nhật giao diện hiển thị kỷ lục
                if (this.currentTab === 'profiles') {
                    this.renderProfilesTabList();
                }
            }
        }
    }

    // Gamification Badges checker & unlocking logic
    checkAndUnlockBadges() {
        const activeProfile = this.getActiveProfile();
        if (!activeProfile.badges) activeProfile.badges = [];

        const streaks = this.calculateStreaks();
        const unlockedList = [...activeProfile.badges];

        // 1. Discipline Badge: active 7 days with any logs
        const distinctDates = new Set();
        const allLogs = [
            ...this.poopLogs.filter(l => l.profileId === activeProfile.id),
            ...this.waterLogs.filter(l => l.profileId === activeProfile.id),
            ...this.foodLogs.filter(l => l.profileId === activeProfile.id)
        ];
        allLogs.forEach(l => distinctDates.add(l.date));
        
        if (distinctDates.size >= 7 && !unlockedList.includes('discipline')) {
            unlockedList.push('discipline');
        }

        // 2. Anti-Constipation Badge: healthy bowel streak >= 3 days
        if (streaks.healthyStreak >= 3 && !unlockedList.includes('anti_consti')) {
            unlockedList.push('anti_consti');
        }

        // 3. Hydration King Badge: water streak >= 5 days
        if (streaks.waterStreak >= 5 && !unlockedList.includes('hydrate_king')) {
            unlockedList.push('hydrate_king');
        }

        // 4. Healthy Food Badge: 10 meal logs, portion sizes not heavy
        const lightOrNormalMeals = this.foodLogs.filter(f => f.profileId === activeProfile.id && f.portionSize !== 'heavy');
        if (lightOrNormalMeals.length >= 10 && !unlockedList.includes('healthy_food')) {
            unlockedList.push('healthy_food');
        }

        // 5. Early Bird Badge: Poop success between 5:00 and 8:00 AM >= 3 times
        const earlyBirdPoops = this.poopLogs.filter(l => {
            if (l.profileId !== activeProfile.id || l.success === false) return false;
            if (!l.time) return false;
            const hour = parseInt(l.time.split(':')[0]);
            return hour >= 5 && hour < 8;
        });
        if (earlyBirdPoops.length >= 3 && !unlockedList.includes('early_bird')) {
            unlockedList.push('early_bird');
        }

        // 6. Water Pro Badge: Water amount >= 3000ml in a single day
        const waterByDay = {};
        this.waterLogs.forEach(w => {
            if (w.profileId === activeProfile.id) {
                waterByDay[w.date] = (waterByDay[w.date] || 0) + w.amount;
            }
        });
        const hasWaterPro = Object.values(waterByDay).some(amt => amt >= 3000);
        if (hasWaterPro && !unlockedList.includes('water_pro')) {
            unlockedList.push('water_pro');
        }

        // 7. Fiber Expert Badge: Foods containing fiber keywords >= 5 times
        const fiberKeywords = ['rau', 'xà lách', 'salad', 'táo', 'chuối', 'khoai', 'fiber', 'củ', 'quả', 'trái cây', 'yến mạch', 'ớt chuông', 'súp lơ', 'bông cải', 'chất xơ', 'cam', 'bưởi', 'đậu'];
        const fiberMeals = this.foodLogs.filter(f => {
            if (f.profileId !== activeProfile.id) return false;
            const nameLower = f.foodName.toLowerCase();
            return fiberKeywords.some(kw => nameLower.includes(kw));
        });
        if (fiberMeals.length >= 5 && !unlockedList.includes('fiber_expert')) {
            unlockedList.push('fiber_expert');
        }

        // 8. Perfect Month Badge: 15 perfect bowel days in last 30 days
        const today = new Date();
        const past30Days = [];
        for (let i = 0; i < 30; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            past30Days.push(this.formatDateStr(d));
        }
        const perfectDaysCount = past30Days.filter(d => {
            const dayPoops = this.poopLogs.filter(p => p.profileId === activeProfile.id && p.date === d);
            if (dayPoops.length === 0) return false;
            
            let hasPerfect = false;
            let hasAbnormal = false;
            dayPoops.forEach(p => {
                if (p.success === false || p.bristolType <= 2 || p.bristolType >= 6 || p.bristolType === 5) {
                    hasAbnormal = true;
                } else {
                    hasPerfect = true;
                }
            });
            return hasPerfect && !hasAbnormal;
        }).length;
        
        if (perfectDaysCount >= 15 && !unlockedList.includes('perfect_month')) {
            unlockedList.push('perfect_month');
        }

        // Check if any new badges were unlocked
        let newlyUnlocked = false;
        let emperorUnlockedJustNow = false;

        unlockedList.forEach(badgeId => {
            if (!activeProfile.badges.includes(badgeId)) {
                newlyUnlocked = true;
                activeProfile.badges.push(badgeId);
                
                const badge = this.badgeDefinitions.find(b => b.id === badgeId);
                setTimeout(() => {
                    alert(`🎉 Chúc mừng! Bạn đã mở khóa Huy hiệu mới:\n"${badge.title}"\n- ${badge.desc}`);
                }, 500);
            }
        });

        if (activeProfile.badges.length === 8 && !activeProfile.badges.includes('emperor_unlocked')) {
            activeProfile.badges.push('emperor_unlocked');
            newlyUnlocked = true;
            emperorUnlockedJustNow = true;
            setTimeout(() => {
                this.triggerConfettiEffect();
                alert(`👑 VINH QUANG TỐI CAO! 👑\nChúc mừng bạn đã mở khóa thành công toàn bộ 8/8 Huy hiệu sức khỏe và đạt được "HUÂN CHƯƠNG HOÀNG ĐẾ TIÊU HÓA"!`);
                this.openShareModal();
            }, 1000);
        }

        if (newlyUnlocked) {
            this.saveDataToStorage();
            if (this.currentTab === 'profiles') {
                this.renderBadgesShelf();
            }
        }
    }

    // Render Badge shelf and Emperor Medal in profile tab
    renderBadgesShelf() {
        const grid = document.getElementById('badgesShelfGrid');
        if (!grid) return;
        grid.innerHTML = '';

        const activeProfile = this.getActiveProfile();
        const unlockedBadges = activeProfile.badges || [];
        
        // Remove helper tag if it exists in calculations count
        const cleanUnlockedCount = unlockedBadges.filter(b => b !== 'emperor_unlocked').length;
        const totalBadges = 8;
        const percent = Math.round((cleanUnlockedCount / totalBadges) * 100);

        // Update progress bar
        document.getElementById('badgeCountDisplay').innerText = `Tiến trình: ${cleanUnlockedCount}/${totalBadges} Huy hiệu`;
        
        const emperorContainer = document.getElementById('emperorMedalContainer');
        const emperorProgressBar = document.getElementById('emperorProgressBar');
        const emperorStatusText = document.getElementById('emperorStatusText');
        const btnShare = document.getElementById('btnShareEmperor');

        emperorProgressBar.style.width = `${percent}%`;

        if (cleanUnlockedCount === totalBadges) {
            emperorContainer.classList.remove('locked');
            emperorContainer.classList.add('unlocked');
            emperorStatusText.innerText = 'ĐÃ MỞ KHÓA HOÀNG ĐẾ 👑';
            btnShare.classList.remove('hide');
        } else {
            emperorContainer.classList.add('locked');
            emperorContainer.classList.remove('unlocked');
            emperorStatusText.innerText = `Đang khóa (${cleanUnlockedCount}/${totalBadges})`;
            btnShare.classList.add('hide');
        }

        this.badgeDefinitions.forEach(badge => {
            const isUnlocked = unlockedBadges.includes(badge.id);
            const card = document.createElement('div');
            card.className = `badge-item-card ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            card.innerHTML = `
                <div class="badge-icon-circle">${badge.icon}</div>
                <div class="badge-title">${badge.title}</div>
                <p class="badge-desc">${badge.desc}</p>
                <span class="badge-status-tag">${isUnlocked ? 'ĐÃ ĐẠT' : 'CHƯA ĐẠT'}</span>
            `;
            grid.appendChild(card);
        });
    }

    // CSS Confetti Celebration effect trigger
    triggerConfettiEffect() {
        const colors = ['#ffd700', '#ffa500', '#ff4500', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];
        const container = document.body;
        
        for (let i = 0; i < 80; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-particle';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            const size = Math.floor(Math.random() * 8) + 6;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            
            // Random fall animation duration and delay
            p.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
            p.style.animationDelay = (Math.random() * 0.5) + 's';
            
            // Random horizontal deviation
            p.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            container.appendChild(p);
            
            // Remove after anim completed
            setTimeout(() => p.remove(), 3500);
        }
    }

    // Open share modal with filled certificate info
    openShareModal() {
        const profile = this.getActiveProfile();
        const modal = document.getElementById('shareModal');
        
        document.getElementById('certUserName').innerText = profile.name;
        
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        document.getElementById('certDate').innerText = `${dd}/${mm}/${yyyy}`;
        
        this.openModal('shareModal');
    }

    // Copy formatted art text to clipboard
    copyShareText() {
        const profile = this.getActiveProfile();
        const now = new Date();
        const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        
        const shareText = `👑 CHỨNG NHẬN HOÀNG ĐẾ TIÊU HÓA 🏆
---------------------------------
Chúc mừng Chiến binh: ${profile.name}
Đã vinh dự đạt được Huân chương tối cao nhất của Poop Tracker!

🎖️ Thành tích: Chinh phục thành công 8/8 Huy hiệu sức khỏe đường ruột!
💧 Uống đủ nước, ăn rau xanh đều đặn, đi vệ sinh đúng giờ giấc khoa học.
📅 Ngày cấp bằng: ${dateStr}

👉 Tải Poop Tracker v3.0 ngay hôm nay để có một cuộc sống nhẹ nhõm, đều đặn mỗi ngày!
#PoopTracker #Omachi #MiliketMadeIt`;

        navigator.clipboard.writeText(shareText).then(() => {
            alert('📋 Đã sao chép văn bản vinh danh nghệ thuật vào Clipboard! Bạn có thể dán (Ctrl+V) gửi cho bạn bè ngay.');
        }).catch(err => {
            console.error('Không thể sao chép văn bản', err);
        });
    }

    // Mock download image alert
    downloadCertImageMock() {
        this.triggerConfettiEffect();
        alert('📸 Tính năng xuất ảnh bằng khen tự động đang được chuẩn bị!\nTạm thời bạn hãy chụp ảnh màn hình tấm bằng khen tuyệt đẹp này để khoe với bạn bè nhé! ❤️');
    }

    // AI Food analysis execution algorithm (runs local statistics on food-bowel timelines)
    runAIFoodAnalysis() {
        const placeholder = document.getElementById('aiAnalysisPlaceholder');
        const loading = document.getElementById('aiAnalysisLoading');
        const grid = document.getElementById('aiAnalysisResultsGrid');

        placeholder.classList.add('hide');
        loading.classList.remove('hide');
        grid.classList.add('hide');

        // Mock 1.5s analysis calculation time
        setTimeout(() => {
            loading.classList.add('hide');
            
            const activeProfile = this.getActiveProfile();
            const pFoods = this.foodLogs.filter(f => f.profileId === activeProfile.id);
            const pPoops = this.poopLogs.filter(p => p.profileId === activeProfile.id);

            // Compute co-occurrences
            const foodStats = {};

            pFoods.forEach(foodLog => {
                // Normalize food name
                const rawName = foodLog.foodName.toLowerCase().trim().replace(/\s+/g, ' ');
                if (!rawName) return;

                if (!foodStats[rawName]) {
                    foodStats[rawName] = {
                        nameDisplay: foodLog.foodName,
                        totalCount: 0,
                        constiCount: 0,
                        diarrheaCount: 0,
                        healthyCount: 0
                    };
                }

                foodStats[rawName].totalCount++;

                // Find poop events in the next 36 hours from food event time
                const foodDateTime = new Date(`${foodLog.date}T${foodLog.time}`);
                
                pPoops.forEach(poopLog => {
                    const poopDateTime = new Date(`${poopLog.date}T${poopLog.time}`);
                    const diffMs = poopDateTime - foodDateTime;
                    const diffHours = diffMs / (1000 * 60 * 60);

                    // If poop occurred between 0 and 36 hours after eating
                    if (diffHours >= 0 && diffHours <= 36) {
                        if (poopLog.success === false || poopLog.bristolType <= 2 || poopLog.bristolType === 5) {
                            foodStats[rawName].constiCount++;
                        } else if (poopLog.bristolType >= 6) {
                            foodStats[rawName].diarrheaCount++;
                        } else {
                            foodStats[rawName].healthyCount++;
                        }
                    }
                });
            });

            // Parse triggers
            const results = [];

            for (const key in foodStats) {
                const stat = foodStats[key];
                // Only evaluate foods eaten at least 2 times for reliability
                if (stat.totalCount >= 2) {
                    const constiPercent = stat.constiCount / stat.totalCount;
                    const diarrheaPercent = stat.diarrheaCount / stat.totalCount;
                    const healthyPercent = stat.healthyCount / stat.totalCount;

                    if (constiPercent >= 0.50) {
                        results.push({
                            foodName: stat.nameDisplay,
                            type: 'consti',
                            percent: Math.round(constiPercent * 100),
                            desc: 'Thực phẩm này có tỷ lệ liên quan cao đến táo bón hoặc đi vệ sinh khó khăn.'
                        });
                    } else if (diarrheaPercent >= 0.50) {
                        results.push({
                            foodName: stat.nameDisplay,
                            type: 'diarrhea',
                            percent: Math.round(diarrheaPercent * 100),
                            desc: 'Thực phẩm này có tỷ lệ liên quan cao đến tiêu chảy, đi phân lỏng hoặc mót gấp.'
                        });
                    } else if (healthyPercent >= 0.60) {
                        results.push({
                            foodName: stat.nameDisplay,
                            type: 'healthy',
                            percent: Math.round(healthyPercent * 100),
                            desc: 'Thực phẩm lành mạnh, hỗ trợ tiêu hóa trơn tru, đi phân lý tưởng.'
                        });
                    }
                }
            }

            // Render result cards
            if (results.length === 0) {
                placeholder.classList.remove('hide');
                placeholder.innerHTML = `
                    <span style="font-size:2.2rem;">ℹ️</span>
                    <p style="margin-top:10px; font-weight:600; font-size:0.9rem;">Chưa đủ dữ liệu phân tích. Hãy ghi chép thực đơn ăn uống nhiều hơn (ăn lặp lại các món ít nhất 2 lần) để tìm luật liên kết.</p>
                `;
            } else {
                grid.innerHTML = '';
                grid.classList.remove('hide');

                results.forEach(res => {
                    const card = document.createElement('div');
                    let classType = 'trigger-healthy';
                    let typeLabel = 'Dễ tiêu hóa 🍏';

                    if (res.type === 'consti') {
                        classType = 'trigger-consti';
                        typeLabel = 'Gây Táo Bón/Khó đi 🍎';
                    } else if (res.type === 'diarrhea') {
                        classType = 'trigger-diarrhea';
                        typeLabel = 'Gây Tiêu Chảy/Phân lỏng 🍇';
                    }

                    card.className = `ai-result-card ${classType}`;
                    card.innerHTML = `
                        <div class="ai-result-percentage">${res.percent}%</div>
                        <div style="font-size:0.75rem; font-weight:800; opacity:0.8;">${typeLabel}</div>
                        <h4 style="font-size:1.15rem; font-weight:800; margin: 4px 0;">${res.foodName}</h4>
                        <p style="font-size:0.8rem; line-height:1.4; opacity:0.95;">${res.desc}</p>
                    `;
                    grid.appendChild(card);
                });
            }

        }, 1500);
    }

    // Toggle smartwatch widget visibility & sync settings
    updateSmartwatchWidget() {
        const widget = document.getElementById('smartwatchWidget');
        if (this.settings.smartwatchSync) {
            widget.classList.remove('hide');
        } else {
            widget.classList.add('hide');
        }
    }

    // Mock smartwatch steps and water integration
    syncSmartwatchData() {
        const desc = document.getElementById('smartwatchSyncStatusDesc');
        desc.innerText = 'Đang kết nối thiết bị đeo...';

        // 1. Tạo popup giả lập iOS Apple Health Permission
        const modalId = 'appleHealthPermissionModal';
        if (document.getElementById(modalId)) {
            document.getElementById(modalId).remove();
        }

        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.45);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(10px);
            animation: fadeIn 0.25s ease-out;
        `;

        const card = document.createElement('div');
        card.style.cssText = `
            background: var(--bg-card);
            border: 1px solid var(--color-border);
            border-radius: 20px;
            width: 90%;
            max-width: 320px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 15px 40px rgba(0,0,0,0.15);
            animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto;
        `;

        card.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 12px; color: #fc3d39;">❤️</div>
            <h3 style="font-size: 1.15rem; font-weight: 700; margin-bottom: 10px; color: var(--color-text);">Quyền truy cập "Sức khỏe"</h3>
            <p style="font-size: 0.85rem; line-height: 1.4; color: var(--color-text-muted); margin-bottom: 24px;">
                <strong>Poop Tracker</strong> muốn truy cập dữ liệu sức khỏe của bạn để đồng bộ Số bước chân và lượng Nước uống của bạn từ Apple Health.
            </p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button id="btnAppleHealthDeny" class="btn btn-outline" style="flex: 1; font-weight: 600; padding: 10px; border-radius: 12px;">Từ chối</button>
                <button id="btnAppleHealthAllow" class="btn btn-primary" style="flex: 1; font-weight: 600; padding: 10px; border-radius: 12px; background: #fc3d39; border-color: #fc3d39; color: white;">Cho phép</button>
            </div>
        `;

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        document.getElementById('btnAppleHealthDeny').addEventListener('click', () => {
            overlay.remove();
            desc.innerText = 'Đồng bộ thất bại: Quyền bị từ chối.';
            
            // Tắt toggle smartwatchSync
            this.settings.smartwatchSync = false;
            document.getElementById('smartwatchSyncToggle').checked = false;
            document.getElementById('smartwatchSyncStatusRow').classList.add('hide');
            this.saveDataToStorage();
            this.updateSmartwatchWidget();

            this.showToast('Lỗi: Bạn đã từ chối cấp quyền truy cập Apple Health!', 'error');
        });

        document.getElementById('btnAppleHealthAllow').addEventListener('click', () => {
            overlay.remove();
            desc.innerText = 'Đang tải dữ liệu Apple Health...';

            setTimeout(() => {
                const steps = Math.floor(Math.random() * (9500 - 6000 + 1)) + 6000;
                const percent = Math.min(Math.round((steps / 10000) * 100), 100);
                
                document.getElementById('smartwatchStepsVal').innerText = steps.toLocaleString('vi-VN');
                document.getElementById('smartwatchStepsPercent').innerText = `${percent}%`;
                
                const circle = document.getElementById('smartwatchStepsProgressCircle');
                if (circle) {
                    const offset = 100 - percent;
                    circle.style.strokeDashoffset = offset;
                }

                // Tự động cộng nước
                this.addWaterIntake(500);
                
                desc.innerText = 'Đồng bộ hoàn tất! Số bước: ' + steps.toLocaleString('vi-VN') + ' bước.';
                this.showToast('⌚ Đồng bộ Apple Health thành công! Đã cập nhật bước đi và +500ml nước.', 'success');
            }, 800);
        });
    }

    // Populate values in the Settings Tab UI
    loadSettingsTabValues() {
        document.getElementById('notificationToggle').checked = this.settings.waterReminder;
        document.getElementById('notificationInterval').value = this.settings.reminderInterval;
        document.getElementById('smartwatchSyncToggle').checked = this.settings.smartwatchSync;
        
        const syncRow = document.getElementById('smartwatchSyncStatusRow');
        if (this.settings.smartwatchSync) {
            syncRow.classList.remove('hide');
            document.getElementById('smartwatchSyncStatusDesc').innerText = 'Đã kết nối. Sẵn sàng đồng bộ.';
        } else {
            syncRow.classList.add('hide');
        }
    }

    // Browser Notification API
    requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('Trình duyệt của bạn không hỗ trợ thông báo đẩy.');
            document.getElementById('notificationToggle').checked = false;
            this.settings.waterReminder = false;
            this.saveDataToStorage();
            return;
        }

        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Poop Tracker', {
                    body: 'Cảm ơn! Bạn sẽ nhận được nhắc nhở uống nước định kỳ từ chúng tôi.',
                    icon: '🍎'
                });
                this.setupNotificationInterval();
            } else {
                document.getElementById('notificationToggle').checked = false;
                this.settings.waterReminder = false;
                this.saveDataToStorage();
            }
        });
    }

    // Setup background interval triggers for reminders
    setupNotificationInterval() {
        if (window.waterReminderTimer) {
            clearInterval(window.waterReminderTimer);
        }

        if (this.settings.waterReminder) {
            const ms = this.settings.reminderInterval * 60 * 1000;
            window.waterReminderTimer = setInterval(() => {
                if (Notification.permission === 'granted') {
                    new Notification('Đã đến lúc uống nước!', {
                        body: 'Uống một cốc nước (250ml) ngay để hệ tiêu hóa khỏe mạnh nhé. 💧🍏',
                        icon: '🍎'
                    });
                }
            }, ms);
        }
    }

    // Export local data to json file
    exportData() {
        const fullData = {
            profiles: this.profiles,
            poopLogs: this.poopLogs,
            waterLogs: this.waterLogs,
            foodLogs: this.foodLogs,
            settings: this.settings,
            activeProfileId: this.activeProfileId,
            version: '3.0.0',
            exportedAt: new Date().toISOString()
        };

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `poop_tracker_backup_${this.formatDateStr(new Date())}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    }

    // Import json file to local storage
    importData(file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (imported.profiles && Array.isArray(imported.profiles) && imported.poopLogs) {
                    this.profiles = imported.profiles;
                    this.poopLogs = imported.poopLogs;
                    this.waterLogs = imported.waterLogs || [];
                    this.foodLogs = imported.foodLogs || [];
                    this.settings = imported.settings || this.settings;
                    this.activeProfileId = imported.activeProfileId || this.profiles[0].id;
                    
                    this.saveDataToStorage();
                    alert('Khôi phục dữ liệu thành công!');
                    window.location.reload();
                } else {
                    alert('Lỗi: Định dạng file sao lưu không hợp lệ.');
                }
            } catch (err) {
                alert('Có lỗi xảy ra khi đọc file JSON: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    // HELPERS: Date formatting
    formatDateStr(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    getStartOfWeek(d) {
        const date = new Date(d);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(date.setDate(diff));
    }
}

// Start App when DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new PoopTrackerApp();
});
