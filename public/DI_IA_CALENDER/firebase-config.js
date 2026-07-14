// firebase-config.js
// Cloud engine layer for Poop Tracker - Supports both mock emulation and real Firebase connection

class LocalCloudMock {
    constructor() {
        this.isMock = true;
        this.listeners = [];
        this.serverUrl = 'http://localhost:3000'; // Đổi IP ở đây nếu chạy đa thiết bị trong LAN
        this.initMockDatabase();
    }
    
    // Initialize mock settings & local guest list
    initMockDatabase() {
        if (!localStorage.getItem('mockGuestsPermissions')) {
            localStorage.setItem('mockGuestsPermissions', JSON.stringify({}));
        }
    }

    // Get active emulator user role
    getAuthUser() {
        const stored = localStorage.getItem('mockAuthUser');
        if (stored) return JSON.parse(stored);
        
        const defaultUser = {
            uid: 'user_owner_123',
            email: 'owner@pooptracker.com',
            role: 'owner', // 'owner', 'guest_standard', 'guest_co_owner'
            name: 'Omachi (Owner)'
        };
        localStorage.setItem('mockAuthUser', JSON.stringify(defaultUser));
        return defaultUser;
    }

    // Set simulator role
    setMockUserRole(role) {
        const user = this.getAuthUser();
        user.role = role;
        if (role === 'owner') {
            user.uid = 'user_owner_123';
            user.email = 'owner@pooptracker.com';
            user.name = 'Omachi (Owner)';
        } else if (role === 'guest_standard') {
            user.uid = 'user_guest_std';
            user.email = 'guest_std@pooptracker.com';
            user.name = 'Miliket (Standard Guest)';
        } else if (role === 'guest_co_owner') {
            user.uid = 'user_guest_co';
            user.email = 'guest_co@pooptracker.com';
            user.name = 'Hảo Hảo (Co-Owner Guest)';
        }
        localStorage.setItem('mockAuthUser', JSON.stringify(user));
        this.triggerUpdate();
    }

    // Get permission level of a profile for guests
    getGuestProfilePermission(profileId) {
        const permissions = JSON.parse(localStorage.getItem('mockGuestsPermissions') || '{}');
        return permissions[profileId] || 'standard'; // 'standard' or 'co_owner'
    }

    // Save permission level of a profile (only Owner can call this)
    setGuestProfilePermission(profileId, permissionLevel) {
        const permissions = JSON.parse(localStorage.getItem('mockGuestsPermissions') || '{}');
        permissions[profileId] = permissionLevel;
        localStorage.setItem('mockGuestsPermissions', JSON.stringify(permissions));
        this.triggerUpdate();
    }

    // Online Server DB Sync functions (HTTP Sync to remote KVDB.io public store)
    async registerInviteCode(inviteCode, ownerDeviceId, profileId) {
        const payload = {
            ownerDeviceId,
            profileId,
            isClaimed: false,
            claimedBy: null,
            logs: { poopLogs: [], waterLogs: [], foodLogs: [] }
        };
        try {
            await fetch(`https://kvdb.io/PTCloudSyncBucket_v53/${inviteCode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn('Network sync failed: registerInviteCode', e);
        }
    }

    async claimInviteCode(inviteCode, guestDeviceId) {
        try {
            const res = await fetch(`https://kvdb.io/PTCloudSyncBucket_v53/${inviteCode}`);
            if (!res.ok) return null;
            const data = await res.json();
            
            data.isClaimed = true;
            data.claimedBy = guestDeviceId;
            
            await fetch(`https://kvdb.io/PTCloudSyncBucket_v53/${inviteCode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return { success: true, profileId: data.profileId };
        } catch (e) {
            console.error('Network sync failed: claimInviteCode', e);
            return null;
        }
    }

    async getCloudLogs(inviteCode) {
        if (!inviteCode) return null;
        try {
            const res = await fetch(`https://kvdb.io/PTCloudSyncBucket_v53/${inviteCode}`);
            if (!res.ok) return null;
            const data = await res.json();
            return data.logs || { poopLogs: [], waterLogs: [], foodLogs: [] };
        } catch (e) {
            console.warn('Network sync failed: getCloudLogs', e);
            return null;
        }
    }

    async pushCloudLogs(inviteCode, poopLogs, waterLogs, foodLogs) {
        if (!inviteCode) return;
        try {
            const res = await fetch(`https://kvdb.io/PTCloudSyncBucket_v53/${inviteCode}`);
            if (!res.ok) return;
            const data = await res.json();
            data.logs = { poopLogs, waterLogs, foodLogs };
            
            await fetch(`https://kvdb.io/PTCloudSyncBucket_v53/${inviteCode}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
        } catch (e) {
            console.warn('Network sync failed: pushCloudLogs', e);
        }
    }

    onStateChange(callback) {
        this.listeners.push(callback);
    }

    triggerUpdate() {
        this.listeners.forEach(cb => cb());
    }
}

// Global Cloud Engine reference
window.CloudEngine = new LocalCloudMock();
