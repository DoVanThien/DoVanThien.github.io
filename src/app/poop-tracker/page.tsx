'use client';

import React, { useState, useEffect, useRef } from 'react';
import './styles.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  BarChart2,
  Users,
  Settings as SettingsIcon,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  Droplet,
  Plus,
  Watch,
  Award,
  Share2,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  Sparkles,
  Camera,
  Trash2,
  CheckCircle,
  HelpCircle,
  Home,
  Activity
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';

import {
  usePoopTrackerStore,
  BADGE_DEFINITIONS,
  PoopProfile,
  PoopLog,
  WaterLog,
  FoodLog,
  calculateProfileStats,
} from '@/lib/poop-store';
import {
  GlassCard,
  GlassButton,
  GlassInput,
  GlassSelect,
  GlassTextArea,
  GlassModal,
  GlassSwitch,
} from '@/components/GlassComponents';
import confetti from 'canvas-confetti';

// Scientific water requirement calculator helper
export const calculateScientificWaterGoal = (weight: number, age: number, gender: string = 'female'): number => {
  if (!weight || weight <= 0) return 2000;
  let mlPerKg = 35;
  if (age > 0) {
    if (age < 30) mlPerKg = 40;
    else if (age > 55) mlPerKg = 30;
    else mlPerKg = 35;
  }
  let goal = Math.round(weight * mlPerKg);
  if (gender === 'male') {
    goal += 200;
  }
  return Math.min(4500, Math.max(1500, Math.round(goal / 50) * 50));
};

// Register ChartJS
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  Legend,
  Filler
);

export default function PoopTrackerPage() {
  const {
    profiles,
    activeProfileId,
    poopLogs,
    waterLogs,
    foodLogs,
    loading,
    error,
    loadInitialData,
    setActiveProfileId,
    setDefaultProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    addPoopLog,
    updatePoopLog,
    deletePoopLog,
    addWaterLog,
    updateWaterLog,
    deleteWaterLog,
    addFoodLog,
    updateFoodLog,
    deleteFoodLog,
    clearAllData,
    importData,
  } = usePoopTrackerStore();

  // App Navigation & UI states
  const [currentTab, setCurrentTab] = useState<'calendar' | 'analytics' | 'profiles' | 'settings'>('calendar');
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week' | 'year'>('week');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [appleHealthSync, setAppleHealthSync] = useState<boolean>(true);
  const [stepsCount, setStepsCount] = useState<number>(8420);

  // Analytics tab filters
  const [analyticsView, setAnalyticsView] = useState<'month' | 'year'>('month');
  const [analyticsMonth, setAnalyticsMonth] = useState<string>('');
  const [analyticsYear, setAnalyticsYear] = useState<number>(new Date().getFullYear());
  const [compareProfiles, setCompareProfiles] = useState<boolean>(false);
  const [compareProfileId, setCompareProfileId] = useState<string>('');

  // AI Diagnostic states
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<any>(null);

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PoopProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileAvatar, setProfileAvatar] = useState('🍎');
  const [profileGender, setProfileGender] = useState<'male' | 'female' | 'other'>('female');
  const [profileAge, setProfileAge] = useState<number | ''>(24);
  const [profileWeight, setProfileWeight] = useState<number | ''>(48);
  const [profileHeight, setProfileHeight] = useState<number | ''>(158);
  const [profileWaterGoal, setProfileWaterGoal] = useState<number | ''>(1800);
  const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

  // Poop Log Modal State
  const [isPoopModalOpen, setIsPoopModalOpen] = useState(false);
  const [poopDate, setPoopDate] = useState('');
  const [poopTime, setPoopTime] = useState('');
  const [poopSuccess, setPoopSuccess] = useState(true);
  const [bristolType, setBristolType] = useState<number>(4);
  const [poopSymptoms, setPoopSymptoms] = useState<string[]>([]);
  const [poopNotes, setPoopNotes] = useState('');

  // Water Log Modal State
  const [isWaterModalOpen, setIsWaterModalOpen] = useState(false);
  const [waterDate, setWaterDate] = useState('');
  const [waterTime, setWaterTime] = useState('');
  const [waterAmount, setWaterAmount] = useState<number>(250);
  const [beverageType, setBeverageType] = useState<string>('pure_water');

  // Food Log Modal State
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [foodDate, setFoodDate] = useState('');
  const [foodTime, setFoodTime] = useState('');
  const [foodName, setFoodName] = useState('');
  const [foodMealType, setFoodMealType] = useState('main');
  const [foodPortionSize, setFoodPortionSize] = useState('normal');

  // Day Action Picker Modal State
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDayActionModalOpen, setIsDayActionModalOpen] = useState<boolean>(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogType, setEditingLogType] = useState<'poop' | 'water' | 'food' | null>(null);

  // Share Certificate Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const formatTimeHHMM = (timeStr?: string) => {
    if (!timeStr) return '';
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    }
    return timeStr;
  };

  // Avatar Options
  const avatarCategories = [
    {
      category: '🥗 Dinh dưỡng & Thực phẩm',
      avatars: ['🍎', '🍏', '🍋', '🍇', '🍑', '🥑', '🥦', '🥕', '💧', '🥗', '🍲', '🍉', '🍓', '🍌', '🍍', '🥥', '🥝', '🌽', '🧀', '🥐', '🍔', '🍟', '🍕', '🍣', '🍦', '🍩', '🍪', '☕️', '🧃', '🥤']
    },
    {
      category: '👥 Nhân vật & Cảm xúc',
      avatars: ['👶', '👧', '🧒', '👦', '👩', '👨', '👩‍🦱', '👨‍🦱', '👩‍🦰', '👨‍🦰', '👱‍♀️', '👱‍♂️', '🧔', '👵', '👴', '👩‍⚕️', '👨‍⚕️', '👩‍🍳', '👨‍🍳', '🕵️‍♀️', '🕵️‍♂️', '🧙‍♀️', '🧙‍♂️', '🦸‍♀️', '🦸‍♂️', '👸', '🤴', '🥷', '👷‍♂️', '💃']
    },
    {
      category: '🦁 Động vật siêu quậy',
      avatars: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇', '🐝', '🐞', '🦋', '🐢', '🐍', '🐙', '🐬', '🐳', '🦖', '🦄']
    },
    {
      category: '🏋️ Thể thao & Hoạt động',
      avatars: ['💪', '🏃‍♂️', '🏃‍♀️', '🚴‍♂️', '🚴‍♀️', '🏊‍♂️', '🏊‍♀️', '🏋️‍♂️', '🏋️‍♀️', '🧘‍♂️', '🧘‍♀️', '🏄‍♂️', '⛷️', '⛹️‍♂️', '⚽️', '🏀', '🏈', '⚾️', '🎾', '🏐', '🏉', '🏓', '🏸', '🥊', '🎯', '🛹', 'Bowling', '🧗‍♀️', '🚵‍♂️', '🏆']
    },
    {
      category: '✨ Biểu tượng & May mắn',
      avatars: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '💖', '🌟', '⭐️', '✨', '⚡️', '🔥', '💥', '☀️', '🌙', '🌈', '🍀', '🌸', '🌺', '👑', '💎', '🚀', '🎯', '🔮', '🎉', '🎊', '🥇']
    }
  ];

  const avatarList = avatarCategories.flatMap(c => c.avatars);

  // Initialize
  useEffect(() => {
    loadInitialData();
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    setAnalyticsMonth(`${yyyy}-${mm}`);
    setAnalyticsYear(yyyy);

    // Dark/Light Theme setup
    const savedTheme = localStorage.getItem('pt_theme') || 'light';
    setTheme(savedTheme as 'light' | 'dark');
    document.body.className = savedTheme === 'dark' ? 'theme-dark dark bg-[#0b0f19] text-white' : 'theme-light bg-[#f8fafc] text-slate-800';
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('pt_theme', nextTheme);
    document.body.className = nextTheme === 'dark' ? 'theme-dark dark bg-[#0b0f19] text-white' : 'theme-light bg-[#f8fafc] text-slate-800';
    showToast(`Đã chuyển sang Chế độ ${nextTheme === 'dark' ? 'Tối' : 'Sáng'}`, 'info');
  };

  const activeProfile = profiles.find(p => p.id === activeProfileId) || profiles[0];

  useEffect(() => {
    if (activeProfile && profiles.length > 0) {
      const other = profiles.find(p => p.id !== activeProfile.id);
      if (other) setCompareProfileId(other.id);
    }
  }, [activeProfileId, profiles]);

  // Calculate Streaks & Stats using calculateProfileStats
  const activeStats = activeProfile
    ? calculateProfileStats(activeProfile.id, poopLogs, waterLogs, activeProfile.water_goal || 2000)
    : { currentPoopStreak: 0, longestPoopStreak: 0, daysSinceLastPoop: 0, currentWaterStreak: 0, longestWaterStreak: 0, daysWaterGoalMissed: 0 };

  const getWaterStreak = (): number => activeStats.currentWaterStreak;
  const getHealthyStreak = (): number => activeStats.currentPoopStreak;

  // Today Water summary
  const getTodayWater = (): number => {
    if (!activeProfile) return 0;
    const todayStr = new Date().toISOString().split('T')[0];
    return waterLogs
      .filter(w => w.profile_id === activeProfile.id && w.date === todayStr)
      .reduce((sum, w) => sum + w.amount, 0);
  };

  // Quick log helpers
  const handleQuickWaterAdd = async (amount: number) => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].substring(0, 5);
    
    const goal = activeProfile?.water_goal || 2000;
    const prevWater = getTodayWater();
    const newTotal = prevWater + amount;

    await addWaterLog({
      date: dateStr,
      time: timeStr,
      amount,
      beverage_type: 'pure_water'
    });

    if (newTotal >= goal && prevWater < goal) {
      confetti({
        particleCount: 100,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#06b6d4', '#10b981', '#6366f1', '#f59e0b']
      });
      showToast(`🎉 CHÚC MỪNG! Bạn đã hoàn thành 100% mục tiêu nước uống! Giỏi nhắm ❤️`, 'success');
    } else {
      showToast(`💧 Đã thêm +${amount}ml nước! Giỏi nhắm ❤️`, 'success');
    }
  };

  // Open forms configuration
  const openPoopModal = () => {
    const now = new Date();
    setPoopDate(now.toISOString().split('T')[0]);
    setPoopTime(now.toTimeString().split(' ')[0].substring(0, 5));
    setPoopSuccess(true);
    setBristolType(4);
    setPoopSymptoms([]);
    setPoopNotes('');
    setIsPoopModalOpen(true);
  };

  const openWaterModal = () => {
    const now = new Date();
    setWaterDate(now.toISOString().split('T')[0]);
    setWaterTime(now.toTimeString().split(' ')[0].substring(0, 5));
    setWaterAmount(250);
    setBeverageType('pure_water');
    setIsWaterModalOpen(true);
  };

  const openFoodModal = () => {
    const now = new Date();
    setFoodDate(now.toISOString().split('T')[0]);
    setFoodTime(now.toTimeString().split(' ')[0].substring(0, 5));
    setFoodName('');
    setFoodMealType('main');
    setFoodPortionSize('normal');
    setIsFoodModalOpen(true);
  };
  const openEditProfileModal = (prof: PoopProfile) => {
    const cleanName = (prof.name || '').replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    setEditingProfile(prof);
    setProfileName(cleanName || prof.name);
    setProfileAvatar(prof.avatar);
    setProfileGender(prof.gender);
    setProfileAge(prof.age ?? '');
    setProfileWeight(prof.weight ?? '');
    setProfileHeight(prof.height ?? '');
    setProfileWaterGoal(prof.water_goal ?? '');
    setIsProfileModalOpen(true);
  };

  // Auto calculate Water Goal based on stats
  useEffect(() => {
    if (!profileWeight || !profileAge) return;
    // Công thức tính lượng nước: Weight * 35 ml (nữ) hoặc Weight * 40 ml (nam)
    const factor = profileGender === 'male' ? 40 : 35;
    let computedGoal = Math.round(Number(profileWeight) * factor);
    // Điều chỉnh nhẹ theo tuổi
    const ageNum = Number(profileAge);
    if (ageNum < 18) computedGoal += 200;
    else if (ageNum > 55) computedGoal -= 200;
    setProfileWaterGoal(computedGoal);
  }, [profileWeight, profileAge, profileGender]);

  // Form submit handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const cleanName = profileName.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

    const updates = {
      name: cleanName || profileName.trim(),
      avatar: profileAvatar,
      gender: profileGender,
      age: Number(profileAge),
      weight: Number(profileWeight),
      height: Number(profileHeight),
      water_goal: Number(profileWaterGoal)
    };

    if (editingProfile) {
      await updateProfile(editingProfile.id, updates);
      showToast('Đã cập nhật thông tin hồ sơ', 'success');
    } else {
      await addProfile(updates);
      showToast('Đã thêm hồ sơ mới', 'success');
    }
    setIsProfileModalOpen(false);
    setEditingProfile(null);
  };

  const handleSavePoop = async (e: React.FormEvent) => {
    e.preventDefault();
    const logData = {
      date: poopDate,
      time: poopTime,
      success: poopSuccess,
      bristol_type: poopSuccess ? bristolType : 5, // Rặn không ra lưu dưới dạng Loại 5 (Táo vàng)
      symptoms: poopSymptoms,
      notes: poopNotes
    };

    if (editingLogId && editingLogType === 'poop') {
      await updatePoopLog(editingLogId, logData);
      showToast('Đã cập nhật nhật ký đi tiêu', 'success');
    } else {
      await addPoopLog(logData);
      showToast('Đã ghi nhận nhật ký đi tiêu', 'success');
    }
    setIsPoopModalOpen(false);
    setEditingLogId(null);
    setEditingLogType(null);
  };

  const handleSaveWater = async (e: React.FormEvent) => {
    e.preventDefault();
    const addedAmount = Number(waterAmount);
    const goal = activeProfile?.water_goal || 2000;
    const prevWater = getTodayWater();
    const newTotal = prevWater + addedAmount;

    const logData = {
      date: waterDate,
      time: waterTime,
      amount: addedAmount,
      beverage_type: beverageType
    };

    if (editingLogId && editingLogType === 'water') {
      await updateWaterLog(editingLogId, logData);
      showToast('💧 Đã cập nhật lượng nước uống!', 'success');
    } else {
      await addWaterLog(logData);
      if (newTotal >= goal && prevWater < goal) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#06b6d4', '#10b981', '#6366f1', '#f59e0b']
        });
        showToast('🎉 CHÚC MỪNG! Bạn đã hoàn thành 100% mục tiêu nước uống! Giỏi nhắm ❤️', 'success');
      } else {
        showToast('💧 Đã ghi nhận lượng nước uống! Giỏi nhắm ❤️', 'success');
      }
    }
    setIsWaterModalOpen(false);
    setEditingLogId(null);
    setEditingLogType(null);
  };

  const handleSaveFood = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;
    
    const logData = {
      date: foodDate,
      time: foodTime,
      food_name: foodName.trim(),
      meal_type: foodMealType,
      portion_size: foodPortionSize
    };

    if (editingLogId && editingLogType === 'food') {
      await updateFoodLog(editingLogId, logData);
      showToast('Đã cập nhật thực đơn ăn uống', 'success');
    } else {
      await addFoodLog(logData);
      showToast('Đã ghi nhận thực đơn ăn uống', 'success');
    }
    setIsFoodModalOpen(false);
    setEditingLogId(null);
    setEditingLogType(null);
  };

  // Toggle symptom select
  const toggleSymptom = (sym: string) => {
    setPoopSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  };

  // Handle day click to record logs
  const handleDayClick = (dateStr: string) => {
    setSelectedCalendarDate(dateStr);
    setIsDayActionModalOpen(true);
  };

  // --- Calendar Generator Logic (Matching DI_IA_CALENDER/app.js 100%) ---
  const renderCalendarGrid = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const profilePoops = poopLogs.filter(l => l.profile_id === activeProfile?.id);
    const profileWaters = waterLogs.filter(l => l.profile_id === activeProfile?.id);
    const profileFoods = foodLogs.filter(l => l.profile_id === activeProfile?.id);
    const waterGoal = activeProfile?.water_goal || 2000;

    // MODE 1: YEAR VIEW (Optimized responsive grid & clear touch targets)
    if (calendarViewMode === 'year') {
      const monthNames = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];

      return (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 py-3">
          {monthNames.map((mName, mIdx) => {
            const firstDay = new Date(year, mIdx, 1);
            const lastDay = new Date(year, mIdx + 1, 0);

            let startDay = firstDay.getDay();
            startDay = startDay === 0 ? 6 : startDay - 1; // Align Mon = 0

            const totalDaysInMonth = lastDay.getDate();

            const monthPrefix = `${year}-${String(mIdx + 1).padStart(2, '0')}`;
            const monthPoopsCount = profilePoops.filter(p => p.date.startsWith(monthPrefix)).length;
            const monthWatersCount = profileWaters.filter(w => w.date.startsWith(monthPrefix)).length;
            const monthFoodsCount = profileFoods.filter(f => f.date.startsWith(monthPrefix)).length;
            const totalMonthLogs = monthPoopsCount + monthWatersCount + monthFoodsCount;

            return (
              <div
                key={mIdx}
                onClick={() => {
                  setCalendarDate(new Date(year, mIdx, 1));
                  setCalendarViewMode('month');
                }}
                className={`p-3 sm:p-4 rounded-3xl border cursor-pointer flex flex-col justify-between overflow-hidden transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out hover:scale-[1.01] hover:shadow-lg ${
                  theme === 'light'
                    ? 'bg-white/90 border-slate-200/80 shadow-xs hover:border-indigo-400/60'
                    : 'bg-slate-800/80 border-white/10 shadow-xs hover:border-indigo-400/60'
                }`}
                style={{ padding: '10px 12px' }}
              >
                {/* Month Title & Activity Count Badge */}
                <div className="text-sm font-black text-slate-900 dark:text-white mb-3 pt-0.5 px-1 flex items-center justify-between border-b border-slate-200/60 dark:border-white/10 pb-2.5">
                  <span>{mName}</span>
                  {totalMonthLogs > 0 ? (
                    <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25">
                      {totalMonthLogs} nhật ký
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">{totalDaysInMonth} ngày</span>
                  )}
                </div>

                {/* 7 Column Day Header (Mon-Sun) */}
                <div className="grid grid-cols-7 gap-1.5 justify-items-center mb-1.5 px-0.5">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => (
                    <span key={i} className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{d}</span>
                  ))}
                </div>

                {/* 7 Column Mon-Sun aligned Circle Dot Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2 items-center justify-items-center min-h-[90px] py-1 px-0.5">
                  {/* Blank alignment cells */}
                  {Array.from({ length: startDay }).map((_, bIdx) => (
                    <div key={`blank-${bIdx}`} className="w-3 h-3 sm:w-3.5 sm:h-3.5 aspect-square" />
                  ))}

                  {/* Day dots 1..N */}
                  {Array.from({ length: totalDaysInMonth }).map((_, dIdx) => {
                    const dayNum = dIdx + 1;
                    const monthDateStr = `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const todayStr = new Date().toISOString().split('T')[0];
                    const isToday = monthDateStr === todayStr;
                    const poopsOfDay = profilePoops.filter(p => p.date === monthDateStr);
                    const watersOfDay = profileWaters.filter(w => w.date === monthDateStr);
                    const foodsOfDay = profileFoods.filter(f => f.date === monthDateStr);

                    let dotColor = theme === 'light' ? 'bg-slate-200/90' : 'bg-slate-700/80';
                    let tooltipText = `${dayNum}/${mIdx + 1}/${year}`;

                    if (poopsOfDay.length > 0 || watersOfDay.length > 0 || foodsOfDay.length > 0) {
                      tooltipText += ` - ${poopsOfDay.length} đại tiện, ${watersOfDay.length} nước, ${foodsOfDay.length} món ăn`;
                      
                      if (poopsOfDay.length > 0) {
                        const hasDanger = poopsOfDay.some(p => p.success && (p.bristol_type === 6 || p.bristol_type === 7));
                        const hasRed = poopsOfDay.some(p => p.success && (p.bristol_type === 1 || p.bristol_type === 2));
                        const hasYellow = poopsOfDay.some(p => !p.success || p.bristol_type === 5);
                        const hasGreen = poopsOfDay.some(p => p.success && (p.bristol_type === 3 || p.bristol_type === 4));

                        if (hasDanger) dotColor = 'bg-purple-500 shadow-xs ring-1 ring-purple-300';
                        else if (hasRed) dotColor = 'bg-rose-500 shadow-xs ring-1 ring-rose-300';
                        else if (hasYellow) dotColor = 'bg-amber-500 shadow-xs ring-1 ring-amber-300';
                        else if (hasGreen) dotColor = 'bg-emerald-500 shadow-xs ring-1 ring-emerald-300';
                      } else if (watersOfDay.length > 0) {
                        dotColor = 'bg-sky-500 shadow-xs ring-1 ring-sky-300';
                      } else if (foodsOfDay.length > 0) {
                        dotColor = 'bg-amber-500 shadow-xs ring-1 ring-amber-300';
                      }
                    }

                    if (isToday) {
                      dotColor += ' ring-2 ring-indigo-500 ring-offset-1 scale-125 z-10 animate-pulse';
                    }

                    return (
                      <span
                        key={dayNum}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDayClick(monthDateStr);
                        }}
                        title={isToday ? `${tooltipText} (Hôm nay)` : tooltipText}
                        className={`w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full inline-block transition-transform hover:scale-150 cursor-pointer ${dotColor}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // MODE 2: WEEK VIEW (Matching DI_IA_CALENDER/app.js 100%)
    if (calendarViewMode === 'week') {
      const vnDays = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
      const curr = new Date(calendarDate);
      const dayOfWeek = curr.getDay(); // 0 = Sunday, 1 = Monday...
      const diffToMonday = curr.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1);
      const monday = new Date(curr.setDate(diffToMonday));

      const todayStr = new Date().toISOString().split('T')[0];

      return (
        <div className="flex flex-col gap-3 py-2">
          {vnDays.map((dayName, idx) => {
            const dayDate = new Date(monday);
            dayDate.setDate(monday.getDate() + idx);

            const offsetMs = dayDate.getTimezoneOffset() * 60000;
            const dayDateLocal = new Date(dayDate.getTime() - offsetMs);
            const dateStr = dayDateLocal.toISOString().split('T')[0];
            const isToday = dateStr === todayStr;

            const poops = profilePoops.filter(p => p.date === dateStr);
            const foods = profileFoods.filter(f => f.date === dateStr);
            const waters = profileWaters.filter(w => w.date === dateStr);

            const totalWater = waters.reduce((sum, w) => sum + w.amount, 0);
            const waterPercent = Math.min(100, Math.round((totalWater / waterGoal) * 100));

            return (
              <div
                key={dateStr}
                onClick={() => handleDayClick(dateStr)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out hover:scale-[1.01] ${
                  isToday
                    ? 'border-2 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20'
                    : theme === 'light'
                    ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                    : 'bg-slate-800/70 border-white/10 hover:bg-slate-800'
                }`}
                style={{ padding: '4px 8px' }}
              >
                {/* Left side details */}
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[60px]">
                    <div className={`text-lg font-black ${isToday ? 'text-indigo-600 dark:text-indigo-400' : theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                      {dayDate.getDate()}
                    </div>
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-[11px] font-semibold text-slate-400">{dayName}</span>
                    </div>
                  </div>

                  <div className="h-8 w-[1px] bg-slate-200 dark:bg-white/10" />

                  <div className="flex gap-4 items-center">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Đại tiện</span>
                      <div className="flex items-center gap-1 mt-0.5 min-h-[22px]">
                        {poops.length === 0 ? (
                          <span className="text-xs text-slate-400 opacity-60">-</span>
                        ) : (
                          poops.map((p, pIdx) => {
                            let emoji = '🍏';
                            if (!p.success) emoji = '🍋';
                            else if (p.bristol_type <= 2) emoji = '🍎';
                            else if (p.bristol_type >= 6) emoji = '🍇';
                            else if (p.bristol_type === 5) emoji = '🍋';

                            return (
                              <span key={pIdx} className="text-base" title={p.time}>
                                {emoji}
                              </span>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">Ăn uống</span>
                      <div className="text-xs font-black text-slate-800 dark:text-white mt-0.5 min-h-[22px] flex items-center">
                        {foods.length > 0 ? `🍲 x${foods.length}` : <span className="text-xs text-slate-400 opacity-60">-</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right side hydration matching app.js */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 block">Nước uống</span>
                    <div className="text-xs font-black text-sky-500 mt-0.5">
                      {totalWater} / {waterGoal} ml
                    </div>
                  </div>

                  {/* Water circle indicator */}
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 relative overflow-hidden flex items-center justify-center border border-sky-400/30">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-sky-500 opacity-80 transition-[height,opacity] duration-300"
                      style={{ height: `${waterPercent}%` }}
                    />
                    <span className="text-[10px] font-black z-10 text-slate-900 dark:text-white">
                      {waterPercent}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // MODE 3: MONTH VIEW (Default)
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    const offset = firstDay === 0 ? 6 : firstDay - 1;

    let days: Array<{ day: number; isCurrentMonth: boolean; dateStr: string }> = [];

    for (let i = offset - 1; i >= 0; i--) {
      days.push({
        day: prevMonthTotalDays - i,
        isCurrentMonth: false,
        dateStr: new Date(year, month - 1, prevMonthTotalDays - i).toISOString().split('T')[0]
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const offsetMs = d.getTimezoneOffset() * 60000;
      const dLocal = new Date(d.getTime() - offsetMs);
      days.push({
        day: i,
        isCurrentMonth: true,
        dateStr: dLocal.toISOString().split('T')[0]
      });
    }

    const remaining = (days.length > 35 ? 42 : 35) - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const offsetMs = d.getTimezoneOffset() * 60000;
      const dLocal = new Date(d.getTime() - offsetMs);
      days.push({
        day: i,
        isCurrentMonth: false,
        dateStr: dLocal.toISOString().split('T')[0]
      });
    }

    return (
      <div className="grid grid-cols-7 gap-2 text-center py-2">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(w => (
          <div key={w} className="text-xs font-bold text-gray-400 py-1">{w}</div>
        ))}
        {days.map((item, idx) => {
          const poopsOfDay = profilePoops.filter(p => p.date === item.dateStr);
          const todayStr = new Date().toISOString().split('T')[0];
          const isToday = item.dateStr === todayStr;
          
          let dayStatusClass = theme === 'light' ? 'bg-slate-100/90 border-slate-200' : 'bg-white/5 border-white/10';
          let emoji = '';

          if (poopsOfDay.length > 0) {
            const hasDanger = poopsOfDay.some(p => p.success && (p.bristol_type === 6 || p.bristol_type === 7));
            const hasConsti = poopsOfDay.some(p => p.success && (p.bristol_type === 1 || p.bristol_type === 2));
            const hasYellow = poopsOfDay.some(p => !p.success || p.bristol_type === 5);
            const hasPerfect = poopsOfDay.some(p => p.success && (p.bristol_type === 3 || p.bristol_type === 4));

            if (hasDanger) {
              dayStatusClass = 'bg-purple-500/25 border-purple-500/50 text-purple-300 font-bold';
              emoji = '🍇';
            } else if (hasConsti) {
              dayStatusClass = 'bg-red-500/25 border-red-500/50 text-red-300 font-bold';
              emoji = '🍎';
            } else if (hasYellow) {
              dayStatusClass = 'bg-yellow-500/25 border-yellow-500/50 text-yellow-300 font-bold';
              emoji = '🍋';
            } else if (hasPerfect) {
              dayStatusClass = 'bg-emerald-500/25 border-emerald-500/50 text-emerald-300 font-bold';
              emoji = '🍏';
            }
          }

          if (isToday) {
            dayStatusClass += ' ring-2 ring-indigo-500 border-indigo-400 shadow-md shadow-indigo-500/20 z-10 scale-[1.02] bg-indigo-500/10 dark:bg-indigo-500/20';
          }

          return (
            <div
              key={idx}
              onClick={() => handleDayClick(item.dateStr)}
              className={`p-2 rounded-2xl border flex flex-col justify-between items-center min-h-[60px] cursor-pointer relative group transition-[transform,box-shadow,background-color,border-color] duration-150 ease-out hover:scale-[1.02] active:scale-[0.96] shadow-sm ${
                item.isCurrentMonth
                  ? theme === 'light' ? 'text-slate-900 font-bold' : 'text-slate-100 font-bold'
                  : 'text-gray-400 opacity-40'
              } ${dayStatusClass}`}
            >
              <div className="flex items-center justify-center w-full">
                <span className={`text-xs ${isToday ? 'font-black text-indigo-600 dark:text-indigo-300' : 'font-bold'}`}>{item.day}</span>
              </div>
              {emoji ? (
                <span className="text-lg animate-pulse mt-0.5">{emoji}</span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-white/20 mt-2"></span>
              )}

              {/* Tooltip */}
              {poopsOfDay.length > 0 && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900/95 text-white text-[11px] p-2.5 rounded-2xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-30 shadow-xl backdrop-blur-md">
                  <div className="font-bold text-indigo-400 mb-1">{item.dateStr}</div>
                  {poopsOfDay.map((p, pIdx) => (
                    <div key={pIdx} className="border-b border-white/5 last:border-none pb-1 mb-1 last:mb-0 last:pb-0">
                      <div>Loại {p.bristol_type} ({p.success ? 'Thành công' : 'Rặn khó'})</div>
                      {p.symptoms.length > 0 && (
                        <div className="text-[10px] text-gray-400">Triệu chứng: {p.symptoms.join(', ')}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Navigate calendar days/weeks/months/years
  const handlePrevMonth = () => {
    if (calendarViewMode === 'week') {
      const d = new Date(calendarDate);
      d.setDate(d.getDate() - 7);
      setCalendarDate(d);
    } else if (calendarViewMode === 'year') {
      setCalendarDate(new Date(calendarDate.getFullYear() - 1, calendarDate.getMonth(), 1));
    } else {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (calendarViewMode === 'week') {
      const d = new Date(calendarDate);
      d.setDate(d.getDate() + 7);
      setCalendarDate(d);
    } else if (calendarViewMode === 'year') {
      setCalendarDate(new Date(calendarDate.getFullYear() + 1, calendarDate.getMonth(), 1));
    } else {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
    }
  };

  // --- Analytics Charts Calculation ---
  const getAnalyticsData = (pId: string) => {
    const profilePoops = poopLogs.filter(l => l.profile_id === pId);
    const profileWaters = waterLogs.filter(l => l.profile_id === pId);

    let labels: string[] = [];
    let poopCounts: number[] = [];
    let avgBristol: number[] = [];
    let waterAmounts: number[] = [];

    if (analyticsView === 'month') {
      // 31 ngày trong tháng đã chọn
      const [yStr, mStr] = analyticsMonth.split('-');
      const year = parseInt(yStr) || new Date().getFullYear();
      const month = (parseInt(mStr) - 1) >= 0 ? parseInt(mStr) - 1 : new Date().getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      for (let d = 1; d <= daysInMonth; d++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        labels.push(`Ngày ${d}`);

        const dayPoops = profilePoops.filter(p => p.date === dStr);
        poopCounts.push(dayPoops.length);

        const totalB = dayPoops.reduce((sum, p) => sum + p.bristol_type, 0);
        avgBristol.push(dayPoops.length > 0 ? Number((totalB / dayPoops.length).toFixed(1)) : 0);

        const dayWaters = profileWaters.filter(w => w.date === dStr);
        waterAmounts.push(dayWaters.reduce((sum, w) => sum + w.amount, 0));
      }
    } else {
      // 12 tháng trong năm
      const year = analyticsYear;
      for (let m = 1; m <= 12; m++) {
        labels.push(`Tháng ${m}`);

        const monthPrefix = `${year}-${String(m).padStart(2, '0')}`;
        const monthPoops = profilePoops.filter(p => p.date.startsWith(monthPrefix));
        poopCounts.push(monthPoops.length);

        const totalB = monthPoops.reduce((sum, p) => sum + p.bristol_type, 0);
        avgBristol.push(monthPoops.length > 0 ? Number((totalB / monthPoops.length).toFixed(1)) : 0);

        const monthWaters = profileWaters.filter(w => w.date.startsWith(monthPrefix));
        // Lấy trung bình ngày trong tháng
        const daysInMonth = new Date(year, m, 0).getDate();
        const totalWater = monthWaters.reduce((sum, w) => sum + w.amount, 0);
        waterAmounts.push(Math.round(totalWater / daysInMonth));
      }
    }

    return { labels, poopCounts, avgBristol, waterAmounts };
  };

  const chartData = getAnalyticsData(activeProfile?.id || '');
  const compareData = compareProfiles && compareProfileId ? getAnalyticsData(compareProfileId) : null;

  const bowelChartConfig = {
    labels: chartData.labels,
    datasets: [
      {
        label: `Số lần đi tiêu (${activeProfile?.name || 'Hồ sơ hiện tại'})`,
        data: chartData.poopCounts,
        backgroundColor: 'rgba(99, 102, 241, 0.4)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 2,
        borderRadius: 8,
      },
      ...(compareData ? [{
        label: `Số lần đi tiêu (${profiles.find(p => p.id === compareProfileId)?.name || 'Đối chiếu'})`,
        data: compareData.poopCounts,
        backgroundColor: 'rgba(239, 68, 68, 0.4)',
        borderColor: 'rgba(239, 68, 68, 1)',
        borderWidth: 2,
        borderRadius: 8,
      }] : [])
    ]
  };

  const waterChartConfig = {
    labels: chartData.labels,
    datasets: [
      {
        label: `Lượng nước nạp vào (ml - ${activeProfile?.name || 'Hồ sơ hiện tại'})`,
        data: chartData.waterAmounts,
        type: 'line' as const,
        borderColor: 'rgba(14, 165, 233, 1)',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
      },
      ...(compareData ? [{
        label: `Lượng nước nạp vào (ml - ${profiles.find(p => p.id === compareProfileId)?.name || 'Đối chiếu'})`,
        data: compareData.waterAmounts,
        type: 'line' as const,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.35,
      }] : [])
    ]
  };

  // Running AI Diagnostics analysis
  const runAIDiagnosis = async () => {
    setAiLoading(true);
    setAiResult(null);

    const profilePoops = poopLogs.filter(l => l.profile_id === activeProfile?.id).slice(-25);
    const profileFoods = foodLogs.filter(l => l.profile_id === activeProfile?.id).slice(-25);
    const profileWaters = waterLogs.filter(l => l.profile_id === activeProfile?.id).slice(-25);

    // Check if food & water data exists
    if (profileFoods.length === 0 && profileWaters.length === 0) {
      setAiResult({
        isEmpty: true,
        summary: 'Chưa có thông tin thực phẩm hoặc nước uống nào được ghi nhận cho hồ sơ này. Hệ thống AI cần dữ liệu thực đơn ăn uống và lượng nước nạp vào để phân tích mối tương quan nguyên nhân - kết quả với tình trạng phân (táo bón, tiêu chảy) của bạn.',
        sensitiveFoods: [],
        healthyFoods: [],
        waterAnalysis: ''
      });
      setAiLoading(false);
      return;
    }

    const promptText = `
      Bạn là Chuyên gia AI Y học Tiêu hóa & Dinh dưỡng Lâm sàng cấp cao.
      Hãy phân tích hồ sơ sinh học & nhật ký theo dõi của người dùng:
      - Tên: ${activeProfile?.name || 'Người dùng'}
      - Giới tính: ${activeProfile?.gender === 'female' ? 'Nữ' : 'Nam'}, Tuổi: ${activeProfile?.age}, Cân nặng: ${activeProfile?.weight}kg, Chiều cao: ${activeProfile?.height}cm
      - Mục tiêu nước uống tiêu chuẩn hàng ngày: ${activeProfile?.water_goal || 2000} ml

      [NHẬT KÝ ĐẠI TIỆN GẦN ĐÂY] (Thang Bristol 1-7: 1-2 Táo bón nặng, 3-4 Lý tưởng, 5 Nước nhẹ/thiếu xơ, 6-7 Tiêu chảy):
      ${profilePoops.length > 0 ? JSON.stringify(profilePoops.map(p => ({ date: p.date, time: p.time, success: p.success, bristol: p.bristol_type, symptoms: p.symptoms, notes: p.notes }))) : 'Chưa có dữ liệu đi đại tiện'}

      [NHẬT KÝ ĂN UỐNG GẦN ĐÂY]:
      ${profileFoods.length > 0 ? JSON.stringify(profileFoods.map(f => ({ date: f.date, time: f.time, food: f.food_name, mealType: f.meal_type, portion: f.portion_size }))) : 'Chưa có dữ liệu thực đơn ăn uống'}

      [NHẬT KÝ UỐNG NƯỚC & ĐỒ UỐNG GẦN ĐÂY]:
      ${profileWaters.length > 0 ? JSON.stringify(profileWaters.map(w => ({ date: w.date, time: w.time, amount_ml: w.amount, beverage_type: w.beverage_type }))) : 'Chưa có dữ liệu uống nước'}

      [YÊU CẦU PHÂN TÍCH Y HỌC CHUYÊN SÂU]:
      1. TỔNG HỢP TIÊU HÓA: Đánh giá tổng quan mối liên quan giữa chất lượng phân (Bristol), triệu chứng (đau bụng, đầy hơi, khó tiêu) với thực đơn ăn uống và thói quen bổ sung chất lỏng.
      2. PHÂN TÍCH LƯỢNG NƯỚC & ĐỒ UỐNG (waterAnalysis): Đánh giá tổng lượng nước uống vào từng ngày so với mục tiêu (${activeProfile?.water_goal || 2000}ml). Phân tích chi tiết loại đồ uống (nước tinh khiết, cà phê, trà, sữa, đồ có cồn) ảnh hưởng thế nào đến độ ẩm của phân (táo bón hay tiêu chảy).
      3. THỰC PHẨM & ĐỒ UỐNG KÍCH ỨNG (sensitiveFoods): Chỉ ra đích danh món ăn/thức uống có nguy cơ gây dị ứng, kích ứng dạ dày - ruột, nêu nguyên nhân y học 24h-48h trước triệu chứng và lời khuyên khắc phục.
      4. THỰC PHẨM LÀNH MẠNH (healthyFoods): Nêu các thực phẩm giàu chất xơ, vi lợi khuẩn hoặc đồ uống giúp phân lý tưởng (Bristol 3-4).
    `;

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': 'ai-english-mentor-secure-v2'
        },
        body: JSON.stringify({
          prompt: promptText,
          systemPrompt: 'Bạn là bác sĩ dinh dưỡng chuyên khoa tiêu hóa. Trả về kết quả phân tích dạng JSON.',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              summary: { type: 'STRING' },
              waterAnalysis: { type: 'STRING' },
              sensitiveFoods: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    food: { type: 'STRING' },
                    correlation: { type: 'STRING' },
                    symptom: { type: 'STRING' },
                    advice: { type: 'STRING' }
                  },
                  required: ['food', 'correlation', 'symptom', 'advice']
                }
              },
              healthyFoods: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    food: { type: 'STRING' },
                    benefit: { type: 'STRING' }
                  },
                  required: ['food', 'benefit']
                }
              }
            },
            required: ['summary', 'waterAnalysis', 'sensitiveFoods', 'healthyFoods']
          }
        })
      });

      if (!res.ok) throw new Error('AI Server error!');
      const data = await res.json();
      
      // Parse data back from Gemini parts structure
      const parsedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsedJson = JSON.parse(parsedText);
      setAiResult(parsedJson);
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra khi phân tích AI. Vui lòng kiểm tra lại cấu hình key.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // Custom visual assets rendering
  const getAvatarHTML = (avatar: string) => {
    return <span className="text-2xl">{avatar}</span>;
  };

  // Check how many positive achievements are unlocked
  const positiveBadges = BADGE_DEFINITIONS.filter(b => b.type === 'positive');
  const unlockedPositiveCount = activeProfile?.badges?.filter(
    id => positiveBadges.some(b => b.id === id)
  ).length || 0;

  return (
    <div className={`body-bg-wrapper min-h-screen relative overflow-x-hidden ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}>
      {/* Liquid fluid ambient animation background blobs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[140px] opacity-70 bg-indigo-600/30 animate-pulse" style={{ animationDuration: '18s' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[65vw] h-[65vw] rounded-full blur-[140px] opacity-70 bg-emerald-600/25 animate-pulse" style={{ animationDuration: '22s', animationDelay: '-4s' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-60 bg-rose-600/20 animate-pulse" style={{ animationDuration: '15s', animationDelay: '-8s' }} />
      </div>

      <div className="app-container relative z-10">
        
        {/* Sidebar Panel */}
        <aside className="sidebar">
          {/* Header logo */}
          <div className="brand">
            <div className="logo-wrapper">
              <span style={{ fontSize: '2rem' }}>🍎</span>
            </div>
            <span className="brand-name">PoopTracker</span>
          </div>

          {/* Active profile switch box */}
          {activeProfile && (
            <div className="profile-selector-container">
              <button
                type="button"
                onClick={() => setIsAvatarPickerOpen(!isAvatarPickerOpen)}
                className="active-profile-card"
                aria-expanded={isAvatarPickerOpen}
                aria-controls="profile-quick-selector"
                aria-label={`Đổi hồ sơ đang hoạt động: ${activeProfile.name}`}
              >
                <div className="profile-avatar">
                  {getAvatarHTML(activeProfile.avatar)}
                </div>
                <div className="profile-info">
                  <div className="profile-name">
                    {activeProfile.name && activeProfile.name.trim() !== ''
                      ? activeProfile.name
                      : activeProfile.id.includes('omachi')
                      ? 'Omachi 🍏'
                      : 'Miliket 🍎'}
                  </div>
                  <div className="profile-status">Đang hoạt động</div>
                </div>
                <ChevronRight className="chevron-icon w-4 h-4" />
              </button>

              {/* Profile quick selector list overlay */}
              {isAvatarPickerOpen && (
                <div className="profile-dropdown show">
                  <div className="profile-dropdown-list" id="profile-quick-selector" aria-label="Chọn hồ sơ">
                    {profiles.map((p, idx) => {
                      const pName = p.name && p.name.trim() !== '' ? p.name : (idx === 0 ? 'Miliket 🍎' : (idx === 1 ? 'Omachi 🍏' : `Hồ sơ ${idx + 1}`));
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => {
                            setActiveProfileId(p.id);
                            setIsAvatarPickerOpen(false);
                            showToast(`Đã chuyển sang profile ${pName}`, 'info');
                          }}
                          className={`profile-dropdown-item ${p.id === activeProfileId ? 'active' : ''}`}
                          aria-pressed={p.id === activeProfileId}
                        >
                          <span className="text-lg">{p.avatar || '🍎'}</span>
                          <span className="profile-name">{pName}</span>
                          {p.is_default && <span className="text-[9px] bg-indigo-500/40 px-1.5 py-0.5 rounded text-white ml-auto">Default</span>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="border-t border-white/10 my-1 pt-1">
                    <button
                      className="btn btn-outline w-full py-1.5 text-xs font-bold"
                      onClick={() => {
                        setIsAvatarPickerOpen(false);
                        setCurrentTab('profiles');
                      }}
                    >
                      Quản lý hồ sơ
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav Menu */}
          <nav className="nav-menu">
            {[
              { id: 'calendar', label: 'Lịch Theo Dõi', icon: CalendarIcon },
              { id: 'analytics', label: 'Thống Kê', icon: BarChart2 },
              { id: 'profiles', label: 'Quản Lý Hồ Sơ', icon: Users },
              { id: 'settings', label: 'Cài Đặt', icon: SettingsIcon },
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id as any)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon className="w-5 h-5 inline-block mr-2" />
                  {item.label}
                </button>
              );
            })}
            
            <a
              href="../index.html"
              className="nav-item portal-link hidden lg:flex"
              style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}
            >
              <Home className="w-5 h-5 inline-block mr-2" />
              Trang Chủ Portal
            </a>
          </nav>

          {/* Sidebar Footer theme control */}
          <div className="sidebar-footer">
            <button
              onClick={toggleTheme}
              className="theme-toggle-btn"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
                {theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
              </span>
              <span className="text-[10px] opacity-60">v3.1</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
            
            {/* Header Dashboard Status */}
            <header className="content-header">
              <div>
                <h1 className="page-title">
                  {currentTab === 'calendar' && (
                    <span className="flex items-center gap-2.5 flex-wrap">
                      <span>Lịch Theo Dõi</span>
                      {activeProfile && (
                        <span 
                          className="inline-flex items-center leading-none gap-1.5 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-full text-xs sm:text-sm font-black border border-indigo-500/30 shadow-xs"
                          style={{ padding: '10px 24px' }}
                        >
                          <span>{activeProfile.name}</span>
                        </span>
                      )}
                    </span>
                  )}
                  {currentTab === 'analytics' && 'Thống Kê'}
                  {currentTab === 'profiles' && 'Quản Lý Hồ Sơ'}
                  {currentTab === 'settings' && 'Cài Đặt'}
                </h1>
              </div>

              {activeProfile && (
                <div className="header-stats-row flex items-center gap-2">
                  <div className="streak-badge streak-water bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-extrabold px-3.5 py-1.5 rounded-2xl border border-blue-200/60 text-xs flex items-center gap-1.5 shadow-sm">
                    <span>💧</span>
                    <span><strong>{getWaterStreak()}</strong> ngày</span>
                  </div>
                  <div className="streak-badge streak-poop bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-extrabold px-3.5 py-1.5 rounded-2xl border border-amber-200/60 text-xs flex items-center gap-1.5 shadow-sm">
                    <span>🔥</span>
                    <span><strong>{getHealthyStreak()}</strong> ngày</span>
                  </div>
                  {(() => {
                    const todayWater = getTodayWater();
                    const baselineGoal = activeProfile.water_goal || 2000;
                    const isGoalReached = todayWater >= baselineGoal;
                    const fillPct = Math.min(100, Math.round((todayWater / baselineGoal) * 100));

                    return (
                      <div
                        className={`water-quick-stats font-extrabold px-4 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition-[background-color,box-shadow] relative overflow-hidden ${
                          isGoalReached
                            ? 'water-quick-stats-complete shadow-md'
                            : 'water-quick-stats-progress bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 shadow-sm'
                        }`}
                      >
                        {/* Liquid Progress Bar Fill Layer */}
                        <div
                          className={`water-liquid-fill absolute bottom-0 left-0 h-full transition-[width,background-color] duration-700 ease-out pointer-events-none ${
                            isGoalReached
                              ? 'bg-gradient-to-r from-emerald-500/80 via-teal-500/85 to-green-500/90'
                              : 'bg-gradient-to-r from-sky-400/70 via-blue-500/75 to-indigo-500/80'
                          }`}
                          style={{ width: `${Math.max(5, fillPct)}%` }}
                        >
                          <div className="water-wave-layer" />
                        </div>

                        {/* Text stays strictly UNCHANGED regardless of completion */}
                        <span className="water-quick-stats-label relative z-10 flex items-center gap-1.5 font-black">
                          <span className="text-sky-500 dark:text-sky-300">💧</span>
                          <span><strong>{todayWater}</strong>/{baselineGoal} ml</span>
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}
            </header>

            {/* Loading Indicator */}
            {loading && (
              <div className="flex items-center justify-center p-12 bg-white/5 rounded-3xl border border-white/10">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
              </div>
            )}

            {/* TAB PANES */}
            {!loading && (
              <div className="tab-content-wrapper">
                
                {/* TAB: CALENDAR */}
                {currentTab === 'calendar' && (
                  <section className="tab-pane active">
                    <div className="dashboard-grid">
                      {/* Left: Calendar grid card */}
                      <div className="card calendar-card shadow-blur">
                        {/* Segmented Control 3 Tabs (Tuần, Tháng, Năm) */}
                        <div className="w-full flex justify-center mb-5">
                          <div className="bg-slate-200/80 dark:bg-slate-900/90 p-1.5 sm:p-2 rounded-full flex border border-slate-300/60 dark:border-slate-700/80 gap-1.5 sm:gap-2.5 w-full max-w-md shadow-inner">
                            {(['week', 'month', 'year'] as const).map(mode => (
                              <button
                                key={mode}
                                onClick={() => setCalendarViewMode(mode)}
                                className={`flex-1 rounded-full px-3 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-black transition-[background-color,color,box-shadow] duration-150 ease-out capitalize text-center ${
                                  calendarViewMode === mode
                                    ? theme === 'light'
                                      ? 'bg-white text-indigo-700 shadow-md border border-slate-200/80 font-black rounded-full'
                                      : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40 font-black rounded-full'
                                    : theme === 'light'
                                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/40'
                                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                                }`}
                                style={{ padding: '10px 12px' }}
                              >
                                {mode === 'week' ? 'Tuần' : mode === 'month' ? 'Tháng' : 'Năm'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Navigation Header (Prev, Current Label, Next) */}
                        <div className="flex items-center justify-between px-2 mb-3">
                          <button
                            onClick={handlePrevMonth}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                              theme === 'light'
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-white/10'
                            }`}
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className={`text-base font-black ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
                            {calendarViewMode === 'year'
                              ? `Năm ${calendarDate.getFullYear()}`
                              : calendarViewMode === 'week'
                              ? `Tuần ${calendarDate.getMonth() + 1}/${calendarDate.getFullYear()}`
                              : `Tháng ${calendarDate.getMonth() + 1}, ${calendarDate.getFullYear()}`}
                          </span>
                          <button
                            onClick={handleNextMonth}
                            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors shadow-sm ${
                              theme === 'light'
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-white/10'
                            }`}
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>

                      {/* Render grid */}
                      {renderCalendarGrid()}

                      {/* Legends matching [Ảnh 1] 100% */}
                      <div className="grid grid-cols-2 gap-3 border-t border-slate-200/80 dark:border-white/10 pt-4 mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600" />
                          <span>Chưa ghi nhận</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span>Đi đều (Táo xanh 🍏)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500" />
                          <span>Táo bón (Táo đỏ 🍎)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-amber-400" />
                          <span>Thiếu xơ/K.thành công (Táo vàng 🍋)</span>
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                          <span className="w-3 h-3 rounded-full bg-purple-600" />
                          <span>Tiêu chảy nguy hiểm (Táo tím 🍇)</span>
                        </div>
                      </div>
                    </div>

                    {/* Right widgets */}
                    <div className="right-dashboard-panel">
                      {/* Log Action Center */}
                      <div className="card log-card shadow-blur">
                        <div className="widget-header">
                          <h3>Ghi nhận hôm nay</h3>
                        </div>
                        <div className="flex flex-col gap-3 mt-3">
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={openPoopModal} className="btn btn-primary flex flex-col items-center justify-center py-3.5">
                              <span className="text-2xl">🍎</span>
                              <span className="text-xs font-bold mt-1">Đại tiện</span>
                            </button>
                            <button onClick={openWaterModal} className="btn btn-primary btn-outline flex flex-col items-center justify-center py-3.5">
                              <span className="text-2xl">💧</span>
                              <span className="text-xs font-bold mt-1">Uống nước</span>
                            </button>
                          </div>
                          <button
                            onClick={openFoodModal}
                            className="btn btn-primary w-full py-3 bg-gradient-to-r from-indigo-600/70 to-indigo-700/80 border-indigo-400/40 hover:from-indigo-600"
                          >
                            <span className="text-lg mr-1.5">🍲</span>
                            <span className="font-bold text-xs text-white">Ghi ăn uống hôm nay</span>
                          </button>
                        </div>
                      </div>

                      {/* Apple Health iPhone widget */}
                      {appleHealthSync && (
                        <div className="card smartwatch-widget shadow-blur" id="smartwatchWidget" style={{ marginBottom: '16px' }}>
                          <div className="smartwatch-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                              <Activity className="text-rose-500 w-5 h-5" /> Đồng bộ Dữ liệu iPhone (Apple Health)
                            </h3>
                            <span className="badge inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">CONNECTED</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Vận động hôm nay</span>
                              <span style={{ fontSize: '1.6rem', fontWeight: 800 }}>{stepsCount.toLocaleString()}</span>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>/ 10,000 bước</span>
                            </div>
                            <div style={{ width: '50px', height: '50px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="var(--color-border)"
                                  strokeWidth="3"
                                />
                                <path
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="var(--color-water)"
                                  strokeWidth="3"
                                  strokeDasharray={`${Math.min(100, (stepsCount / 10000) * 100)}, 100`}
                                />
                              </svg>
                              <span style={{ position: 'absolute', fontSize: '0.75rem', fontWeight: 800 }}>
                                {Math.min(100, Math.round((stepsCount / 10000) * 100))}%
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Water log quick add widget - Redesigned Fill Full Width for Mobile */}
                      {activeProfile && (() => {
                        const todayWaterVal = getTodayWater();
                        const goalVal = activeProfile.water_goal || 2000;
                        const waterPct = Math.min(100, Math.round((todayWaterVal / goalVal) * 100));

                        return (
                          <div className="card water-widget shadow-blur w-full">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="text-sm font-extrabold flex items-center gap-2">
                                <span className="text-xl">💧</span> Nước uống hằng ngày
                              </h3>
                              <span className="text-sm font-black text-sky-400 bg-sky-500/15 px-3 py-1 rounded-full border border-sky-400/30" style={{ padding: '4px' }}>
                                {waterPct}%
                              </span>
                            </div>

                            {/* Horizontal Liquid Progress Bar */}
                            <div className="w-full bg-slate-800/60 dark:bg-slate-800/60 light:bg-slate-200/90 h-4 rounded-full p-0.5 border border-white/10 relative overflow-hidden my-3">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-indigo-500 shadow-md transition-[width] duration-500"
                                style={{ width: `${Math.max(4, waterPct)}%` }}
                              />
                            </div>

                            <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-3.5">
                              <span>Thực tế: <strong className="text-sky-400 text-sm font-black">{todayWaterVal.toLocaleString()}</strong> ml</span>
                              <span>Mục tiêu: <strong className="text-slate-600">{goalVal.toLocaleString()}</strong> ml</span>
                            </div>

                            {/* Quick Adds 3 Column Grid */}
                            <div className="grid grid-cols-3 gap-2.5">
                              <button
                                onClick={() => handleQuickWaterAdd(250)}
                                className="py-2.5 rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-extrabold text-xs hover:bg-sky-500/30 transition-[transform,background-color] duration-150 ease-out flex items-center justify-center gap-1 active:scale-[0.96]"
                              >
                                +250ml
                              </button>
                              <button
                                onClick={() => handleQuickWaterAdd(500)}
                                className="py-2.5 rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-extrabold text-xs hover:bg-sky-500/30 transition-[transform,background-color] duration-150 ease-out flex items-center justify-center gap-1 active:scale-[0.96]"
                              >
                                +500ml
                              </button>
                              <button
                                onClick={() => handleQuickWaterAdd(750)}
                                className="py-2.5 rounded-xl border border-sky-400/30 bg-sky-500/15 text-sky-700 dark:text-sky-300 font-extrabold text-xs hover:bg-sky-500/30 transition-[transform,background-color] duration-150 ease-out flex items-center justify-center gap-1 active:scale-[0.96]"
                              >
                                +750ml
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </section>
              )}

                {/* TAB: ANALYTICS */}
                {currentTab === 'analytics' && (
                  <section className="tab-pane active" id="tab-analytics">
                    <div className="analytics-layout flex flex-col gap-6 pb-6">
                      {/* Top Filter Bar */}
                      <div className="card filter-card shadow-blur">
                        <div className="filter-controls">
                          <div className="filter-group">
                            <label>Dạng xem:</label>
                            <select
                              value={analyticsView}
                              onChange={e => setAnalyticsView(e.target.value as any)}
                              className="form-control"
                              style={{ minWidth: '100px' }}
                            >
                              <option value="month">Theo Tháng</option>
                              <option value="year">Theo Năm</option>
                            </select>
                          </div>

                          {analyticsView === 'month' ? (
                            <div className="filter-group">
                              <label>Chọn Tháng:</label>
                              <input
                                type="month"
                                value={analyticsMonth}
                                onChange={e => setAnalyticsMonth(e.target.value)}
                                className="form-control"
                              />
                            </div>
                          ) : (
                            <div className="filter-group">
                              <label>Chọn Năm:</label>
                              <select
                                value={analyticsYear}
                                onChange={e => setAnalyticsYear(Number(e.target.value))}
                                className="form-control"
                              >
                                {[2024, 2025, 2026, 2027].map(y => (
                                  <option key={y} value={y}>Năm {y}</option>
                                ))}
                              </select>
                            </div>
                          )}

                          <div className="compare-switch-wrapper">
                            <label className="switch-container">
                              <input
                                type="checkbox"
                                id="compareProfilesCheckbox"
                                checked={compareProfiles}
                                onChange={e => setCompareProfiles(e.target.checked)}
                              />
                              <span className="switch-slider"></span>
                            </label>
                            <span>So sánh giữa 2 Profile</span>
                          </div>

                          {compareProfiles && (
                            <div className="filter-group">
                              <label>So sánh với:</label>
                              <select
                                value={compareProfileId}
                                onChange={e => setCompareProfileId(e.target.value)}
                                className="form-control"
                              >
                                <option value="">-- Chọn profile --</option>
                                {profiles
                                  .filter(p => p.id !== activeProfile?.id)
                                  .map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Charts Grid */}
                      <div className="charts-grid">
                        {/* Chart 1: Bowel Movement Frequency */}
                        <div className="card chart-card shadow-blur">
                          <h3 id="chartTitleBowel">Tần suất đi đại tiện</h3>
                          <div className="chart-container">
                            <Bar
                              data={bowelChartConfig}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: compareProfiles } },
                                scales: {
                                  y: { ticks: { precision: 0 }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                                  x: { grid: { display: false } }
                                }
                              }}
                            />
                          </div>
                        </div>

                        {/* Chart 2: Water Intake & Bowel Relationship */}
                        <div className="card chart-card shadow-blur">
                          <h3 id="chartTitleWater">Lượng nước & Sức khỏe tiêu hóa</h3>
                          <div className="chart-container">
                            <Line
                              data={waterChartConfig}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: { legend: { display: compareProfiles } },
                                scales: {
                                  y: { grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                                  x: { grid: { display: false } }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stat cards summary */}
                      {activeProfile && (
                        <div className="stats-summary-grid">
                          <div className="card stat-box shadow-blur">
                            <span className="stat-label">Tổng số lần đại tiện</span>
                            <span className="stat-value text-primary" id="statTotalPoops">
                              {poopLogs.filter(p => p.profile_id === activeProfile.id).length}
                            </span>
                            <span className="stat-subtext" id="statTotalPoopsSub">Lần trong khoảng thời gian này</span>
                          </div>
                          <div className="card stat-box shadow-blur">
                            <span className="stat-label">Tỷ lệ đều đặn (Táo xanh 🍏)</span>
                            <span className="stat-value text-green" id="statRegularityPercent">
                              {Math.round(
                                (poopLogs.filter(p => p.profile_id === activeProfile.id && p.success && (p.bristol_type === 3 || p.bristol_type === 4)).length /
                                  Math.max(1, poopLogs.filter(p => p.profile_id === activeProfile.id).length)) * 100
                              )}%
                            </span>
                            <span className="stat-subtext" id="statRegularitySub">Được tính từ loại phân lý tưởng (3-4)</span>
                          </div>
                          <div className="card stat-box shadow-blur">
                            <span className="stat-label">Lượng nước uống trung bình</span>
                            <span className="stat-value text-water" id="statAvgWater">
                              {(() => {
                                const activeWaters = waterLogs.filter(w => w.profile_id === activeProfile.id);
                                const uniqueWaterDates = Array.from(new Set(activeWaters.map(w => w.date)));
                                const totalWaterAmount = activeWaters.reduce((sum, w) => sum + w.amount, 0);
                                const avgWater = uniqueWaterDates.length > 0 ? Math.round(totalWaterAmount / uniqueWaterDates.length) : 0;
                                return `${avgWater} ml/ngày`;
                              })()}
                            </span>
                            <span className="stat-subtext" id="statAvgWaterSub">
                              {(() => {
                                const activeWaters = waterLogs.filter(w => w.profile_id === activeProfile.id);
                                const uniqueWaterDates = Array.from(new Set(activeWaters.map(w => w.date)));
                                const totalWaterAmount = activeWaters.reduce((sum, w) => sum + w.amount, 0);
                                const avgWater = uniqueWaterDates.length > 0 ? Math.round(totalWaterAmount / uniqueWaterDates.length) : 0;
                                const pct = Math.round((avgWater / (activeProfile.water_goal || 2000)) * 100);
                                return `Đạt ${pct}% mục tiêu hàng ngày`;
                              })()}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* AI Food Sensitivity analysis panel */}
                      <div className="card ai-analysis-card shadow-blur" style={{ marginTop: '0px' }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}
                        >
                          <div>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '1.5rem' }}>🤖</span> AI Chẩn Đoán Thực Phẩm Kích Ứng
                            </h3>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              Tìm mối liên kết giữa thực đơn ăn uống và trạng thái tiêu hóa (táo bón, tiêu chảy) của riêng bạn.
                            </p>
                          </div>
                          <button
                            onClick={runAIDiagnosis}
                            disabled={aiLoading}
                            className="btn btn-primary"
                            id="btnRunAIAnalysis"
                          >
                            {aiLoading ? 'AI đang phân tích...' : 'Bắt đầu AI quét'}
                          </button>
                        </div>

                        {/* Display results */}
                        <AnimatePresence mode="wait">
                          {aiLoading && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex flex-col items-center justify-center py-10"
                            >
                              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500 mb-3" />
                              <span className="text-xs text-gray-400">AI đang phân tích triệu chứng ruột của bạn...</span>
                            </motion.div>
                          )}

                          {!aiLoading && aiResult && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="flex flex-col gap-4 border-t border-slate-200/60 dark:border-white/10 pt-4"
                            >
                              {aiResult.isEmpty ? (
                                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs leading-relaxed text-amber-950 dark:text-amber-200 flex flex-col gap-3" style={{ padding: '12px' }}>
                                  <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-300">
                                    <span>⚠️</span> Chưa Có Thông Tin Thực Phẩm Để Chẩn Đoán
                                  </div>
                                  <p className="text-slate-600 dark:text-amber-200/80">
                                    {aiResult.summary}
                                  </p>
                                  <div>
                                    <button
                                      onClick={() => setCurrentTab('calendar')}
                                      className="btn btn-outline text-xs px-3 py-1.5"
                                    >
                                      👉 Bấm vào đây để chuyển sang Tab Nhật Ký nhập thực đơn & nước uống
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs leading-relaxed text-slate-800 dark:text-slate-200">
                                    <strong className="text-indigo-600 dark:text-indigo-300 block mb-1 font-extrabold">🩺 Tóm tắt sức khỏe tiêu hóa:</strong>
                                    {aiResult.summary}
                                  </div>

                                  {aiResult.waterAnalysis && (
                                    <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs leading-relaxed text-sky-950 dark:text-sky-200">
                                      <strong className="text-sky-600 dark:text-sky-300 block mb-1 font-extrabold">💧 Phân tích lượng nước & đồ uống nạp vào:</strong>
                                      {aiResult.waterAnalysis}
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Kích ứng */}
                                    <div className="flex flex-col gap-3">
                                      <h4 className="text-xs font-extrabold text-rose-500 dark:text-rose-400">⚠️ Thực phẩm nghi vấn gây kích ứng:</h4>
                                      {aiResult.sensitiveFoods?.length === 0 ? (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 italic">Không tìm thấy dấu hiệu kích ứng cụ thể nào.</div>
                                      ) : (
                                        aiResult.sensitiveFoods?.map((f: any, idx: number) => (
                                          <div key={idx} className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs">
                                            <div className="font-extrabold text-rose-700 dark:text-white">{f.food}</div>
                                            <div className="text-slate-600 dark:text-slate-300 mt-1">{f.correlation}</div>
                                            <div className="text-rose-600 dark:text-rose-300 mt-0.5 font-semibold">Triệu chứng: {f.symptom}</div>
                                            <div className="text-amber-600 dark:text-yellow-300 mt-1 font-bold">💡 Lời khuyên: {f.advice}</div>
                                          </div>
                                        ))
                                      )}
                                    </div>

                                    {/* Lành mạnh */}
                                    <div className="flex flex-col gap-3">
                                      <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">🌱 Thực phẩm tốt cho cơ địa của bạn:</h4>
                                      {aiResult.healthyFoods?.length === 0 ? (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 italic">Không tìm thấy thực đơn lợi hại đặc biệt.</div>
                                      ) : (
                                        aiResult.healthyFoods?.map((f: any, idx: number) => (
                                          <div key={idx} className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                                            <div className="font-extrabold text-emerald-700 dark:text-white">{f.food}</div>
                                            <div className="text-emerald-600 dark:text-emerald-300 mt-1">{f.benefit}</div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          )}

                          {!aiLoading && !aiResult && (
                            <div className="text-center py-8 text-xs text-gray-400 italic border-t border-white/5 pt-4">
                              Hãy nhấn nút "Bắt đầu AI quét" để chẩn đoán hệ tiêu hóa.
                            </div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </section>
                )}

                {/* TAB: PROFILES */}
                {currentTab === 'profiles' && (
                  <section className="tab-pane active" id="tab-profiles">
                    <div className="profiles-layout">
                      <div className="profiles-header">
                        <h2>Danh sách Hồ sơ người dùng</h2>
                        <div style={{ display: 'flex', gap: '10px', width: '100%', flexWrap: 'wrap', marginTop: '10px' }} className="profiles-header-buttons">
                          <button
                            className="btn btn-primary"
                            id="btnAddNewProfileMain"
                            style={{ flexGrow: 1, justifyContent: 'center' }}
                            onClick={() => {
                              setEditingProfile(null);
                              setProfileName('');
                              setProfileAvatar('🍎');
                              setProfileGender('female');
                              setProfileAge(24);
                              setProfileWeight(48);
                              setProfileHeight(158);
                              setIsProfileModalOpen(true);
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2 inline-block" /> Tạo hồ sơ mới
                          </button>
                        </div>
                      </div>

                      <div className="profiles-grid" id="profilesGrid">
                        {profiles.map(p => {
                          const pStats = calculateProfileStats(p.id, poopLogs, waterLogs, p.water_goal || 2000);

                          return (
                            <div key={p.id} className="card profile-card shadow-blur">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className="profile-avatar">
                                    {p.avatar}
                                  </div>
                                  <div className="profile-info">
                                    <div className="profile-name">{p.name}</div>
                                    <div className="profile-status">
                                      {p.gender === 'female' ? 'Nữ' : p.gender === 'male' ? 'Nam' : 'Khác'} • {p.age} tuổi • {p.weight}kg • {p.height}cm
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button className="btn btn-outline" onClick={() => openEditProfileModal(p)}>Sửa</button>
                                  {profiles.length > 2 && (
                                    <button
                                      className="btn btn-danger"
                                      onClick={async () => {
                                        if (confirm(`Bạn chắc chắn muốn xoá hồ sơ ${p.name}?`)) {
                                          await deleteProfile(p.id);
                                          showToast('Đã xoá hồ sơ', 'info');
                                        }
                                      }}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Biological Statistics Shelf for Profile */}
                              <div className="w-full mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10 flex flex-col gap-3 text-xs">
                                <div className="w-full p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 text-amber-950 dark:text-amber-200" style={{ padding: '8px' }}>
                                  <div className="font-extrabold flex items-center justify-between mb-2 pb-1.5 border-b border-amber-500/20 text-xs sm:text-sm">
                                    <span className="flex items-center gap-1.5 font-black"><span>💩</span> Nhật Ký Đại Tiện</span>
                                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                      {pStats.currentPoopStreak > 0 ? `🔥 ${pStats.currentPoopStreak} ngày streak` : 'Chưa có streak'}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">Streak dài nhất:</span>
                                      <span className="font-extrabold text-slate-900 dark:text-white">{pStats.longestPoopStreak} ngày</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">Chưa đi đại tiện:</span>
                                      <span className={`font-extrabold ${pStats.daysSinceLastPoop === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                        {pStats.daysSinceLastPoop === 0 ? 'Hôm nay đã đi' : `${pStats.daysSinceLastPoop} ngày`}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div className="w-full p-3 rounded-2xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/25 text-sky-950 dark:text-sky-200" style={{ padding: '8px' }}>
                                  <div className="font-extrabold flex items-center justify-between mb-2 pb-1.5 border-b border-sky-500/20 text-xs sm:text-sm">
                                    <span className="flex items-center gap-1.5 font-black"><span>💧</span> Nhật Ký Uống Nước</span>
                                    <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300">
                                      {pStats.currentWaterStreak > 0 ? `💧 ${pStats.currentWaterStreak} ngày streak` : 'Chưa có streak'}
                                    </span>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">Streak dài nhất:</span>
                                      <span className="font-extrabold text-slate-900 dark:text-white">{pStats.longestWaterStreak} ngày</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">Số ngày thiếu nước:</span>
                                      <span className="font-extrabold text-rose-500 dark:text-rose-400">{pStats.daysWaterGoalMissed} ngày</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="profile-details-list mt-3">
                                <div className="profile-detail-row">
                                  <span>Trạng thái hoạt động:</span>
                                  <span>
                                    {p.is_default ? (
                                      <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">Mặc định</span>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          setDefaultProfile(p.id);
                                          showToast(`Đã đổi profile mặc định sang ${p.name}`, 'info');
                                        }}
                                        className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-0.5 rounded-full border border-white/10"
                                      >
                                        Đặt làm mặc định
                                      </button>
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Gamification Badge Showcase Shelf */}
                      {activeProfile && (
                        <div className="card badges-shelf-card shadow-blur" style={{ marginTop: '32px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                              <Award className="text-water w-5 h-5" /> Bộ Sưu Tập Huy Hiệu Thành Tích
                            </h3>
                            <div id="badgeCountDisplay" style={{ fontWeight: 700, fontSize: '0.85rem', background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)', padding: '4px 12px', borderRadius: '12px' }}>
                              Mở khóa: {activeProfile.badges?.length || 0} / 18 Huy hiệu
                            </div>
                          </div>

                          {/* Ultimate Emperor Medal Showcase */}
                          <div className={`emperor-medal-container ${activeProfile.badges?.includes('queen_medal') ? 'unlocked' : 'locked'}`} id="emperorMedalContainer">
                            <div className="emperor-glow-ring"></div>
                            <div className="emperor-cup-emoji">👑🏆👑</div>
                            <div className="emperor-medal-info">
                              <h4 className="emperor-medal-title">BÀ HOÀNG TIÊU HÓA</h4>
                              <p className="emperor-medal-desc">Phần thưởng tối cao dành cho chiến binh mở khóa toàn bộ 9 Huy hiệu sức khỏe tích cực.</p>
                              <div className="emperor-medal-progress-bar-container">
                                <div
                                  className="emperor-medal-progress-bar"
                                  id="emperorProgressBar"
                                  style={{ width: `${(unlockedPositiveCount / 9) * 100}%` }}
                                ></div>
                              </div>
                              <span className="emperor-status-text" id="emperorStatusText">
                                {activeProfile.badges?.includes('queen_medal') ? 'Đã mở khóa! 🎉' : `Đang khóa (${unlockedPositiveCount}/9)`}
                              </span>
                            </div>
                            {activeProfile.badges?.includes('queen_medal') && (
                              <button className="btn btn-primary btn-share-emperor" onClick={() => setIsShareModalOpen(true)}>
                                <Share2 className="w-4 h-4 mr-2 inline-block" /> Chia sẻ thành tích
                              </button>
                            )}
                          </div>

                          <div className="badges-shelf-grid" id="badgesShelfGrid">
                            {BADGE_DEFINITIONS.map(b => {
                              const isUnlocked = activeProfile.badges?.includes(b.id);
                              return (
                                <div
                                  key={b.id}
                                  className={`badge-item-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                                  style={{ opacity: isUnlocked ? 1 : 0.4 }}
                                >
                                  <div className="badge-icon-circle">{b.icon}</div>
                                  <div className="badge-title">{b.title}</div>
                                  <div className="badge-desc">{b.desc}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                )}

                {/* TAB: SETTINGS */}
                {currentTab === 'settings' && (
                  <section className="tab-pane active" id="tab-settings">
                    <div className="settings-layout">
                      <div className="settings-column">
                        {/* Theme & Reminders */}
                        <div className="card settings-card shadow-blur">
                          <h3>Cài đặt chung</h3>
                          <div className="setting-item">
                            <div className="setting-info">
                              <div className="setting-title">Chế độ giao diện</div>
                              <div className="setting-desc">Chuyển đổi giao diện sáng/tối</div>
                            </div>
                            <div className="setting-action">
                              <button className="btn btn-outline" onClick={toggleTheme}>
                                {theme === 'dark' ? 'Chế độ Sáng' : 'Chế độ Tối'}
                              </button>
                            </div>
                          </div>
                          <div className="setting-item">
                            <div className="setting-info">
                              <div className="setting-title">Nhắc nhở uống nước</div>
                              <div className="setting-desc">Nhận thông báo định kỳ hằng ngày trên trình duyệt</div>
                            </div>
                            <div className="setting-action">
                              <label className="switch-container">
                                <input type="checkbox" defaultChecked />
                                <span className="switch-slider"></span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Apple Health iPhone Connection Widget */}
                        <div className="card settings-card shadow-blur">
                          <h3>Đồng bộ Dữ liệu Sức khỏe (iPhone)</h3>
                          <div className="setting-item">
                            <div className="setting-info">
                              <div className="setting-title">Apple Health (iPhone)</div>
                              <div className="setting-desc">Tự động đồng bộ số bước chân & dữ liệu sức khỏe từ ứng dụng Health trên iPhone</div>
                            </div>
                            <div className="setting-action">
                              <label className="switch-container">
                                <input
                                  type="checkbox"
                                  checked={appleHealthSync}
                                  onChange={e => setAppleHealthSync(e.target.checked)}
                                />
                                <span className="switch-slider"></span>
                              </label>
                            </div>
                          </div>

                          {appleHealthSync && (
                            <div className="setting-item" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
                              <div className="setting-info">
                                <div className="setting-title">Đã kết nối iPhone</div>
                                <div className="setting-desc">Đồng bộ tự động với ứng dụng Apple Health</div>
                              </div>
                              <div className="setting-action">
                                <button
                                  className="btn btn-outline"
                                  onClick={() => {
                                    setStepsCount(Math.floor(Math.random() * 5000) + 6000);
                                    showToast('Đã đồng bộ dữ liệu sức khỏe từ iPhone thành công!', 'success');
                                  }}
                                >
                                  Đồng bộ ngay
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Data management settings */}
                        <div className="card settings-card shadow-blur" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <h3 style={{ color: 'var(--color-apple-red)' }}>Khu vực dữ liệu nhạy cảm</h3>
                          <div className="setting-item data-transfer-item">
                            <div className="setting-info">
                              <div className="setting-title">Xuất dữ liệu backup</div>
                              <div className="setting-desc">Tải về toàn bộ nhật ký dưới dạng file JSON</div>
                            </div>
                            <div className="setting-action data-transfer-actions flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => {
                                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
                                    JSON.stringify({ poopLogs, waterLogs, foodLogs, profiles })
                                  );
                                  const dlAnchorElem = document.createElement('a');
                                  dlAnchorElem.setAttribute("href", dataStr);
                                  dlAnchorElem.setAttribute("download", `pooptracker_backup_${new Date().toISOString().split('T')[0]}.json`);
                                  dlAnchorElem.click();
                                  showToast('Đã xuất dữ liệu sao lưu thành công', 'success');
                                }}
                                className="btn btn-outline"
                              >
                                <Download className="w-4 h-4 mr-1.5 inline-block" /> Tải JSON
                              </button>

                              <input
                                type="file"
                                id="import-json-input"
                                accept=".json"
                                style={{ display: 'none' }}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = async (event) => {
                                    try {
                                      const parsed = JSON.parse(event.target?.result as string);
                                      await importData(parsed);
                                      showToast('Đã nhập dữ liệu & đồng bộ Supabase thành công!', 'success');
                                    } catch (err: any) {
                                      showToast('Lỗi nhập dữ liệu: ' + (err.message || 'File JSON không hợp lệ'), 'error');
                                    } finally {
                                      e.target.value = '';
                                    }
                                  };
                                  reader.readAsText(file);
                                }}
                              />

                              <button
                                onClick={() => {
                                  document.getElementById('import-json-input')?.click();
                                }}
                                className="btn btn-primary"
                              >
                                <Upload className="w-4 h-4 mr-1.5 inline-block" /> Nhập JSON
                              </button>
                            </div>
                          </div>

                          <div className="setting-item" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '16px', marginTop: '16px' }}>
                            <div className="setting-info">
                              <div className="setting-title" style={{ color: 'var(--color-apple-red)' }}>Xóa dữ liệu tài khoản</div>
                              <div className="setting-desc">Xóa vĩnh viễn tất cả lịch sử đại tiện, nước uống, ăn uống của profile</div>
                            </div>
                            <div className="setting-action">
                              <button
                                onClick={async () => {
                                  if (confirm('Bạn có chắc chắn muốn xóa vĩnh viễn toàn bộ lịch sử ghi chép của hồ sơ hiện tại? Thao tác không thể khôi phục.')) {
                                    await clearAllData();
                                    showToast('Đã xóa sạch dữ liệu ghi chép', 'success');
                                  }
                                }}
                                className="btn btn-danger"
                              >
                                <Trash2 className="w-4 h-4 mr-1.5 inline-block" /> Xóa sạch
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Educational and advice tips */}
                      <div className="settings-column">
                        <div className="card settings-card shadow-blur">
                          <h3>Thang đo Bristol (Phân loại)</h3>
                          <div className="flex flex-col gap-2.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-300 mt-3">
                            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300" style={{ padding: '10px 12px' }}>
                              <strong>Loại 1 - 2:</strong> Dạng viên nhỏ cứng (Táo bón 🍎)
                            </div>
                            <div className="p-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-300" style={{ padding: '10px 12px' }}>
                              <strong>Loại 3 - 4:</strong> Dạng xúc xích mềm lý tưởng (Bình thường 🍏)
                            </div>
                            <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300" style={{ padding: '10px 12px' }}>
                              <strong>Loại 5:</strong> Cục mềm sắc cạnh (Thiếu chất xơ 🍋)
                            </div>
                            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300" style={{ padding: '10px 12px' }}>
                              <strong>Loại 6 - 7:</strong> Nhão nát hoặc lỏng hoàn toàn (Tiêu chảy 🍇)
                            </div>
                          </div>
                        </div>

                        <div className="card settings-card shadow-blur">
                              <h3>Mẹo cho hệ tiêu hoá khoẻ</h3>
                              <ul className="list-disc pl-4 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400 flex flex-col gap-3 mt-3">
                                <li>Uống đủ nước tối thiểu theo mục tiêu hàng ngày (1.5 - 2.5 lít) để bôi trơn nhu động.</li>
                                <li>Tăng chất xơ từ trái cây (táo, chuối), yến mạch và các loại rau cải xanh.</li>
                                <li>Thực hiện đi ngoài vào khung giờ vàng buổi sáng (5h-8h) sau khi ngủ dậy để hình thành nhịp sinh học tốt.</li>
                                <li>Hạn chế đồ uống cồn, trà đặc và nước ngọt vì chúng làm đại tràng mất nước nhanh chóng.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      </section>
                    )}
                  </div>
                )}

                {/* Footer Author Note */}
                <footer className="text-center py-6 text-xs text-gray-400 font-medium border-t border-white/10 mt-10 mb-6" style={{ padding: '10px 16px' }}>
                  Miliket made this app for Omachi &lt;3
                </footer>
              </main>
            </div>
          
          {/* TOAST COMPONENT */}
          <AnimatePresence initial={false}>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 30, x: '-50%' }}
                animate={{ opacity: 1, y: 0, x: '-50%' }}
                exit={{ opacity: 0, y: 30, x: '-50%' }}
                style={{
                  position: 'fixed',
                  bottom: '85px',
                  left: '50%',
                  zIndex: 10000,
                  borderRadius: '24px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  padding: '10px 20px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                  maxWidth: '320px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap'
                }}
                className={`border shadow-lg ${
                  toastType === 'success'
                    ? 'bg-emerald-600/95 text-white border-emerald-400/30'
                    : toastType === 'error'
                    ? 'bg-rose-600/95 text-white border-rose-400/30'
                    : 'bg-indigo-600/95 text-white border-indigo-400/30'
                }`}
                role="status"
                aria-live="polite"
              >
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* DAY ACTION PICKER MODAL (WHEN CLICKING ANY CALENDAR DATE) */}
          <GlassModal
            theme={theme}
            isOpen={isDayActionModalOpen}
            onClose={() => setIsDayActionModalOpen(false)}
            title={`Ghi nhận ${selectedCalendarDate}`}
            icon="📅"
            badge="NHẬT KÝ THEO DÕI"
          >
            <div className="day-log-modal flex flex-col gap-3.5 py-1">
              <p className={`text-xs ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
                Bạn muốn ghi nhận thông tin nhật ký sinh học nào cho ngày <strong>{selectedCalendarDate}</strong>?
              </p>

              <div className="flex flex-col gap-3 mt-2">
                {/* Lịch sử trong ngày */}
                {(() => {
                  const dayPoops = poopLogs.filter(p => p.profile_id === activeProfile?.id && p.date === selectedCalendarDate);
                  const dayWaters = waterLogs.filter(w => w.profile_id === activeProfile?.id && w.date === selectedCalendarDate);
                  const dayFoods = foodLogs.filter(f => f.profile_id === activeProfile?.id && f.date === selectedCalendarDate);
                  const hasLogs = dayPoops.length > 0 || dayWaters.length > 0 || dayFoods.length > 0;

                  if (!hasLogs) return null;

                  return (
                    <div className="history-log-section mb-2">
                      <h4 className={`text-sm font-bold mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                        Lịch sử trong ngày
                      </h4>
                      <div className="history-log-list flex flex-col gap-2">
                        {dayPoops.map(p => (
                          <div key={p.id} className="history-log-swipe relative overflow-hidden rounded-xl group">
                            <div 
                              onClick={async (e) => {
                                e.stopPropagation();
                                await deletePoopLog(p.id);
                                showToast('Đã xóa nhật ký đại tiện!', 'info');
                              }}
                              className="absolute right-0 top-0 bottom-0 w-16 bg-rose-500 hover:bg-rose-600 active:scale-[0.96] text-white flex items-center justify-center rounded-xl cursor-pointer shadow-md transition-[transform,background-color] duration-150 z-0"
                              title="Xóa log"
                            >
                              <Trash2 className="w-5 h-5 text-white stroke-[2.25]" />
                            </div>
                            <motion.div 
                              drag="x"
                              dragConstraints={{ left: -64, right: 0 }}
                              dragElastic={0.1}
                              onClick={() => {
                                setPoopDate(p.date);
                                setPoopTime(p.time);
                                setPoopSuccess(p.success ?? (p as any).type !== 'fail');
                                setBristolType(p.bristol_type ?? 4);
                                setPoopSymptoms(p.symptoms || []);
                                setPoopNotes(p.notes || '');
                                setEditingLogId(p.id);
                                setEditingLogType('poop');
                                setIsDayActionModalOpen(false);
                                setIsPoopModalOpen(true);
                              }}
                              className={`history-log-row history-log-row--poop relative z-10 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                theme === 'light' ? 'bg-white border-emerald-300 text-emerald-950 shadow-xs' : 'bg-[#182235] border-emerald-500/40 text-emerald-100 shadow-md'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-xl shrink-0">💩</span>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-sm font-semibold truncate">
                                    {formatTimeHHMM(p.time)} - {p.success !== false && (p as any).type !== 'fail' ? 'Thành công' : 'Thất bại'}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                        {dayWaters.map(w => (
                          <div key={w.id} className="history-log-swipe relative overflow-hidden rounded-xl group">
                            <div 
                              onClick={async (e) => {
                                e.stopPropagation();
                                await deleteWaterLog(w.id);
                                showToast('Đã xóa nhật ký nước!', 'info');
                              }}
                              className="absolute right-0 top-0 bottom-0 w-16 bg-rose-500 hover:bg-rose-600 active:scale-[0.96] text-white flex items-center justify-center rounded-xl cursor-pointer shadow-md transition-[transform,background-color] duration-150 z-0"
                              title="Xóa log"
                            >
                              <Trash2 className="w-5 h-5 text-white stroke-[2.25]" />
                            </div>
                            <motion.div 
                              drag="x"
                              dragConstraints={{ left: -64, right: 0 }}
                              dragElastic={0.1}
                              onClick={() => {
                                setWaterDate(w.date);
                                setWaterTime(w.time);
                                setWaterAmount(w.amount);
                                setBeverageType(w.beverage_type || 'pure_water');
                                setEditingLogId(w.id);
                                setEditingLogType('water');
                                setIsDayActionModalOpen(false);
                                setIsWaterModalOpen(true);
                              }}
                              className={`history-log-row history-log-row--water relative z-10 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                theme === 'light' ? 'bg-white border-sky-300 text-sky-950 shadow-xs' : 'bg-[#182235] border-sky-500/40 text-sky-100 shadow-md'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-xl shrink-0">💧</span>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-sm font-semibold truncate">
                                    {formatTimeHHMM(w.time)} - {w.amount}ml
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                        {dayFoods.map(f => (
                          <div key={f.id} className="history-log-swipe relative overflow-hidden rounded-xl group">
                            <div 
                              onClick={async (e) => {
                                e.stopPropagation();
                                await deleteFoodLog(f.id);
                                showToast('Đã xóa nhật ký ăn uống!', 'info');
                              }}
                              className="absolute right-0 top-0 bottom-0 w-16 bg-rose-500 hover:bg-rose-600 active:scale-[0.96] text-white flex items-center justify-center rounded-xl cursor-pointer shadow-md transition-[transform,background-color] duration-150 z-0"
                              title="Xóa log"
                            >
                              <Trash2 className="w-5 h-5 text-white stroke-[2.25]" />
                            </div>
                            <motion.div 
                              drag="x"
                              dragConstraints={{ left: -64, right: 0 }}
                              dragElastic={0.1}
                              onClick={() => {
                                setFoodDate(f.date);
                                setFoodTime(f.time);
                                setFoodName(f.food_name);
                                setFoodMealType(f.meal_type);
                                setFoodPortionSize(f.portion_size);
                                setEditingLogId(f.id);
                                setEditingLogType('food');
                                setIsDayActionModalOpen(false);
                                setIsFoodModalOpen(true);
                              }}
                              className={`history-log-row history-log-row--food relative z-10 p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                                theme === 'light' ? 'bg-white border-amber-300 text-amber-950 shadow-xs' : 'bg-[#182235] border-amber-500/40 text-amber-100 shadow-md'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <span className="text-xl shrink-0">🍱</span>
                                <div className="flex-1 text-left min-w-0">
                                  <div className="text-sm font-semibold truncate">
                                    {formatTimeHHMM(f.time)} - {f.food_name}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <h4 className={`text-sm font-bold mt-2 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                  Ghi nhận mới
                </h4>
                <div className="history-new-actions grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    setPoopDate(selectedCalendarDate);
                    setPoopTime(currentHHMM);
                    setEditingLogId(null);
                    setEditingLogType(null);
                    setIsDayActionModalOpen(false);
                    setIsPoopModalOpen(true);
                  }}
                  className={`history-new-action history-new-action--poop p-4 rounded-2xl border flex items-center gap-3 transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.96] ${
                    theme === 'light'
                      ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-300 shadow-xs'
                      : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  <span className="text-3xl">💩</span>
                  <div className="text-left">
                    <div className={`text-sm font-black ${theme === 'light' ? 'text-emerald-950' : 'text-white'}`}>Ghi log Lần đi đại tiện</div>
                    <div className={`text-[11px] ${theme === 'light' ? 'text-emerald-800 font-medium' : 'text-slate-300 opacity-80'}`}>Theo dõi chất lượng tiêu hóa & triệu chứng</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    setWaterDate(selectedCalendarDate);
                    setWaterTime(currentHHMM);
                    setEditingLogId(null);
                    setEditingLogType(null);
                    setIsDayActionModalOpen(false);
                    setIsWaterModalOpen(true);
                  }}
                  className={`history-new-action history-new-action--water p-4 rounded-2xl border flex items-center gap-3 transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.96] ${
                    theme === 'light'
                      ? 'bg-sky-50 hover:bg-sky-100/80 border-sky-300 shadow-xs'
                      : 'bg-sky-500/15 border-sky-500/30 text-sky-300 hover:bg-sky-500/25'
                  }`}
                >
                  <span className="text-3xl">💧</span>
                  <div className="text-left">
                    <div className={`text-sm font-black ${theme === 'light' ? 'text-sky-950' : 'text-white'}`}>Ghi log Lượng nước uống</div>
                    <div className={`text-[11px] ${theme === 'light' ? 'text-sky-800 font-medium' : 'text-slate-300 opacity-80'}`}>Cập nhật dung tích nước & loại đồ uống</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    setFoodDate(selectedCalendarDate);
                    setFoodTime(currentHHMM);
                    setEditingLogId(null);
                    setEditingLogType(null);
                    setIsDayActionModalOpen(false);
                    setIsFoodModalOpen(true);
                  }}
                  className={`history-new-action history-new-action--food p-4 rounded-2xl border flex items-center gap-3 transition-[transform,background-color,border-color] duration-150 ease-out active:scale-[0.96] ${
                    theme === 'light'
                      ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 shadow-xs'
                      : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  }`}
                >
                  <span className="text-3xl">🍱</span>
                  <div className="text-left">
                    <div className={`text-sm font-black ${theme === 'light' ? 'text-amber-950' : 'text-white'}`}>Ghi log Thực đơn Ăn uống</div>
                    <div className={`text-[11px] ${theme === 'light' ? 'text-amber-800 font-medium' : 'text-slate-300 opacity-80'}`}>Ghi lại món ăn, khẩu phần & giờ ăn</div>
                  </div>
                </button>
                </div>

              <div className="modal-actions history-modal-actions pt-4 mt-2 border-t flex justify-end border-white/10" style={{ paddingTop: '12px' }}>
                <GlassButton theme={theme} variant="secondary" onClick={() => setIsDayActionModalOpen(false)}>
                  Đóng
                </GlassButton>
              </div>
              </div>
            </div>
          </GlassModal>

          {/* MODAL 1: PROFILE */}
          <GlassModal
            theme={theme}
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            title={editingProfile ? 'Cập nhật hồ sơ' : 'Thêm hồ sơ mới'}
            icon="👤"
            badge="HỒ SƠ NGƯỜI DÙNG"
          >
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div>
                <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Tên người dùng *</label>
                <GlassInput
                  theme={theme}
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  placeholder="Ví dụ: Omachi 🍏, Miliket 🍎..."
                  required
                />
              </div>

              {/* Grid 2 Column: Giới tính & Tuổi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Giới tính</label>
                  <GlassSelect
                    theme={theme}
                    value={profileGender}
                    onChange={e => setProfileGender(e.target.value as any)}
                  >
                    <option value="female">♀️ Nữ giới</option>
                    <option value="male">♂️ Nam giới</option>
                    <option value="other">🌈 Khác</option>
                  </GlassSelect>
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Tuổi (Năm)</label>
                  <GlassInput
                    theme={theme}
                    type="number"
                    value={profileAge}
                    onChange={e => setProfileAge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="25"
                  />
                </div>
              </div>

              {/* Grid 2 Column: Chiều cao & Cân nặng */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Chiều cao (cm)</label>
                  <GlassInput
                    theme={theme}
                    type="number"
                    value={profileHeight}
                    onChange={e => setProfileHeight(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="165"
                  />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Cân nặng (kg)</label>
                  <GlassInput
                    theme={theme}
                    type="number"
                    value={profileWeight}
                    onChange={e => setProfileWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="55"
                  />
                </div>
              </div>

              {/* Mục tiêu nước khoa học */}
              <div className="p-3.5 rounded-2xl border bg-indigo-500/10 border-indigo-500/30" style={{ padding: '10px 12px' }}>
                <div className="flex items-center justify-between mb-1.5" style={{ padding: '4px 0px' }}>
                  <label className={`text-xs font-extrabold ${theme === 'light' ? 'text-indigo-900' : 'text-indigo-200'}`}>
                    Mục tiêu nước hàng ngày (ml)
                  </label>
                  {profileWeight && profileAge && (
                    <button
                      type="button"
                      onClick={() => {
                        const rec = calculateScientificWaterGoal(Number(profileWeight), Number(profileAge), profileGender);
                        setProfileWaterGoal(rec);
                        showToast(`💡 Đã áp dụng mức khuyến nghị khoa học ${rec}ml`, 'info');
                      }}
                      className="text-[10px] font-bold text-indigo-500 hover:text-indigo-400 underline"
                    >
                      Áp dụng gợi ý khoa học 💡
                    </button>
                  )}
                </div>
                <GlassInput
                  theme={theme}
                  type="number"
                  value={profileWaterGoal}
                  onChange={e => setProfileWaterGoal(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="2000"
                  required
                />
                {profileWeight && (
                  <p className="text-[11px] text-indigo-400/90 font-medium mt-2 leading-relaxed">
                    💡 <strong>Công thức khoa học:</strong> Nhu cầu nước gợi ý theo thể trạng: <strong>{calculateScientificWaterGoal(Number(profileWeight), Number(profileAge), profileGender)} ml/ngày</strong> (Tính theo Cân nặng {profileWeight}kg, Tuổi {profileAge || 25}, {profileGender === 'male' ? 'Nam' : 'Nữ'}).
                  </p>
                )}
              </div>

              <div>
                <label className={`text-xs font-bold block mb-2 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Ảnh đại diện (Avatar)</label>
                <div className={`flex flex-col gap-3.5 max-h-52 overflow-y-auto p-3 border rounded-2xl ${
                  theme === 'light' ? 'bg-slate-100/90 border-slate-300' : 'bg-white/5 border-white/10'
                }`} style={{ padding: '12px' }}>
                  {avatarCategories.map(cat => (
                    <div key={cat.category}>
                      <span className={`text-[11px] font-extrabold block mb-1.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>
                        {cat.category}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.avatars.map(a => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setProfileAvatar(a)}
                            className={`text-xl p-1.5 rounded-xl transition-[transform,background-color,box-shadow] duration-150 ${
                              profileAvatar === a 
                                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400 scale-110' 
                                : theme === 'light' ? 'hover:bg-slate-200/80 text-slate-800' : 'hover:bg-white/15 text-white'
                            }`}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`modal-actions pt-5 mt-4 border-t flex gap-3.5 justify-end items-center ${
                theme === 'light' ? 'border-slate-200/80' : 'border-white/10'
              }`}>
                <GlassButton theme={theme} type="button" variant="secondary" onClick={() => setIsProfileModalOpen(false)}>
                  Hủy
                </GlassButton>
                <GlassButton theme={theme} type="submit" variant="primary">Lưu lại</GlassButton>
              </div>
            </form>
          </GlassModal>

          {/* MODAL 2: LOG POOP (Match [Ảnh 2] 100%) */}
          <GlassModal 
            theme={theme} 
            isOpen={isPoopModalOpen} 
            onClose={() => setIsPoopModalOpen(false)} 
            title={editingLogId && editingLogType === 'poop' ? "Sửa nhật ký đại tiện" : "Ghi nhận Lần đi đại tiện"}
            maxWidth="max-w-xl"
          >
            <form onSubmit={handleSavePoop} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-extrabold block mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>Ngày đi vệ sinh</label>
                  <GlassInput theme={theme} type="date" value={poopDate} onChange={e => setPoopDate(e.target.value)} required />
                </div>
                <div>
                  <label className={`text-xs font-extrabold block mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>Thời gian cụ thể</label>
                  <GlassInput theme={theme} type="time" value={poopTime} onChange={e => setPoopTime(e.target.value)} required />
                </div>
              </div>

              {/* iOS / Android Toggle Switch matching [Ảnh 2] */}
              <GlassSwitch
                theme={theme}
                checked={poopSuccess}
                onChange={setPoopSuccess}
                label="Đi ngoài thành công (Có ra phân)"
                subText="* Tắt mục này nếu bạn bị đau bụng, buồn đi vệ sinh nhưng rặn không ra (Lưu dưới dạng Táo Vàng 🍋)."
              />

              {poopSuccess && (
                <div>
                  <label className={`text-xs font-extrabold block mb-2.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                    Chọn Loại phân (Thang đo Bristol) <span className="text-red-500">*</span>
                  </label>
                  <div className="bristol-modal-grid">
                    {[
                      { type: 1, label: 'Loại 1', icon: '🪨', desc: 'Viên rời cứng', tag: 'Táo bón nặng 🍎' },
                      { type: 2, label: 'Loại 2', icon: '🪵', desc: 'Xúc xích gồ ghề', tag: 'Táo bón nhẹ 🍎' },
                      { type: 3, label: 'Loại 3', icon: '🌭', desc: 'Xúc xích nứt nhẹ', tag: 'Bình thường 🍏' },
                      { type: 4, label: 'Loại 4', icon: '🐍', desc: 'Xúc xích mềm', tag: 'Lý tưởng 🍏' },
                      { type: 5, label: 'Loại 5', icon: '☁️', desc: 'Mềm sắc cạnh', tag: 'Thiếu xơ 🍋' },
                      { type: 6, label: 'Loại 6', icon: '🥞', desc: 'Nhão xốp vỡ vụn', tag: 'Tiêu chảy 🍇' },
                      { type: 7, label: 'Loại 7', icon: '💧', desc: 'Lỏng nước', tag: 'Tiêu chảy nguy hiểm 🍇' },
                    ].map(item => {
                      const isSelected = bristolType === item.type;
                      const stateColor = item.type <= 2
                        ? 'red'
                        : item.type <= 4
                        ? 'green'
                        : item.type <= 6
                        ? 'yellow'
                        : 'purple';
                      return (
                        <button
                          type="button"
                          key={item.type}
                          onClick={() => setBristolType(item.type)}
                          aria-pressed={isSelected}
                          className={`bristol-modal-option bristol-state-${stateColor} p-3.5 rounded-2xl border cursor-pointer flex flex-col items-center justify-between text-center gap-1 transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] ${
                            isSelected
                              ? 'is-selected text-slate-900 dark:text-white shadow-md'
                              : theme === 'light'
                              ? 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm'
                              : 'bg-slate-800/60 border-white/10 text-slate-200 hover:bg-slate-700/60'
                          }`}
                          style={{ padding: '10px 0px' }}
                        >
                          <span className="bristol-modal-label text-[11px] font-bold text-slate-400">{item.label}</span>
                          <span className="bristol-modal-icon text-3xl my-1">{item.icon}</span>
                          <span className="bristol-modal-desc text-xs font-black text-slate-800 dark:text-white">{item.desc}</span>
                          <span className="bristol-modal-tag text-[10px] font-semibold text-slate-500">{item.tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className={`text-xs font-extrabold block mb-2.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>Triệu chứng đi kèm</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'pain', label: 'Đau bụng' },
                    { id: 'bloating', label: 'Đầy hơi / Khó tiêu' },
                    { id: 'bleeding', label: 'Có máu trong phân' },
                    { id: 'strain', label: 'Rặn khó khăn' },
                    { id: 'easy', label: 'Đi ngoài dễ dàng' },
                    { id: 'urgency', label: 'Mót rặn gấp' },
                  ].map(item => {
                    const isSelected = poopSymptoms.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleSymptom(item.id)}
                        className={`pl-5 pr-4 py-3.5 rounded-2xl border cursor-pointer text-xs font-extrabold flex items-center gap-3.5 transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] shadow-sm min-h-[50px] ${
                          isSelected
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-600 text-indigo-900 dark:text-white font-extrabold'
                            : theme === 'light'
                            ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            : 'bg-slate-800/60 border-white/10 text-slate-200 hover:bg-slate-700/60'
                        }`}
                        style={{ padding: '8px' }}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] flex-shrink-0 ml-0.5 ${
                          isSelected ? 'bg-indigo-600 border-indigo-600 text-white font-bold' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                        }`}>
                          {isSelected && '✓'}
                        </span>
                        <span className="leading-snug">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`text-xs font-extrabold block mb-1.5 ${theme === 'light' ? 'text-slate-800' : 'text-slate-200'}`}>
                  Ghi chú (Triệu chứng khác, cảm xúc...)
                </label>
                <GlassTextArea
                  theme={theme}
                  value={poopNotes}
                  onChange={e => setPoopNotes(e.target.value)}
                  placeholder="Cảm giác sau khi đi, có thoải mái không..."
                  rows={2}
                />
              </div>

              <div className={`modal-actions pt-4 mt-2 border-t flex gap-3 justify-end items-center ${
                theme === 'light' ? 'border-slate-100' : 'border-white/10'
              }`} style={{ paddingTop: '12px' }}>
                <GlassButton theme={theme} type="button" variant="secondary" onClick={() => setIsPoopModalOpen(false)}>
                  Hủy
                </GlassButton>
                <GlassButton theme={theme} type="submit" variant="primary">
                  Ghi nhận
                </GlassButton>
              </div>
            </form>
          </GlassModal>

          {/* MODAL 3: LOG WATER */}
          <GlassModal 
            theme={theme} 
            isOpen={isWaterModalOpen} 
            onClose={() => setIsWaterModalOpen(false)} 
            title={editingLogId && editingLogType === 'water' ? "Sửa lượng nước uống" : "Ghi nhận Lượng nước uống"}
            icon="💧"
            badge="HYDRATION TRACKER"
          >
            <form onSubmit={handleSaveWater} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Ngày</label>
                  <GlassInput theme={theme} type="date" value={waterDate} onChange={e => setWaterDate(e.target.value)} required />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Giờ</label>
                  <GlassInput theme={theme} type="time" value={waterTime} onChange={e => setWaterTime(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Dung tích nước (ml) *</label>
                <GlassSelect theme={theme} value={waterAmount} onChange={e => setWaterAmount(Number(e.target.value))} required>
                  <option value="50">50 ml</option>
                  <option value="100">100 ml</option>
                  <option value="150">150 ml</option>
                  <option value="200">200 ml</option>
                  <option value="250">250 ml (Cốc tiêu chuẩn)</option>
                  <option value="350">350 ml</option>
                  <option value="500">500 ml</option>
                  <option value="750">750 ml</option>
                  <option value="1000">1000 ml</option>
                </GlassSelect>
                
                {/* Presets Quick Buttons */}
                <div className="flex gap-2 mt-2" style={{ paddingTop: '12px' }}>
                  {[150, 250, 500, 750].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setWaterAmount(amt)}
                      className={`flex-1 text-xs py-1.5 rounded-xl border font-bold transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.96] ${
                        waterAmount === amt
                          ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                          : theme === 'light'
                          ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      +{amt}ml
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold block mb-2.5 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Loại đồ uống</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'pure_water', label: '💧 Nước lọc', desc: 'Hấp thu: 100%' },
                    { id: 'juice', label: '🍎 Nước ép', desc: 'Hấp thu: 90%' },
                    { id: 'soft_drink', label: '🥤 Nước ngọt', desc: 'Hấp thu: 70%' },
                    { id: 'milk_tea', label: '🧋 Trà sữa', desc: 'Hấp thu: 60%' },
                    { id: 'tea_coffee', label: '☕ Trà/Cà phê', desc: 'Hấp thu: 40%' },
                    { id: 'alcohol', label: '🍺 Bia rượu', desc: 'Mất nước: -20%' },
                  ].map(item => {
                    const isSelected = beverageType === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setBeverageType(item.id)}
                        className={`p-3.5 px-4 rounded-2xl border cursor-pointer min-h-[64px] flex flex-col justify-center transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.96] ${
                          isSelected
                            ? 'bg-sky-600 border-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-400/50'
                            : theme === 'light'
                            ? 'bg-slate-100/90 border-slate-200 text-slate-800 hover:bg-white'
                            : 'bg-slate-800/70 border-white/10 text-slate-200 hover:bg-slate-700/70'
                        }`}
                        style={{ padding: '0px 12px' }}
                      >
                        <div className={`text-xs sm:text-sm font-extrabold ${isSelected ? 'text-white' : theme === 'light' ? 'text-slate-900' : 'text-white'}`}>
                          {item.label}
                        </div>
                        <div className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-sky-100' : theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`modal-actions pt-5 mt-6 border-t flex gap-3.5 justify-end items-center ${
                theme === 'light' ? 'border-slate-200/80' : 'border-white/10'
              }`} style={{ paddingTop: '12px' }}>
                <GlassButton theme={theme} type="button" variant="secondary" onClick={() => setIsWaterModalOpen(false)}>
                  Hủy
                </GlassButton>
                <GlassButton theme={theme} type="submit" variant="water">Ghi nhận</GlassButton>
              </div>
            </form>
          </GlassModal>

          {/* MODAL 4: LOG FOOD */}
          <GlassModal 
            theme={theme} 
            isOpen={isFoodModalOpen} 
            onClose={() => setIsFoodModalOpen(false)} 
            title={editingLogId && editingLogType === 'food' ? "Sửa thực đơn ăn uống" : "Ghi nhận Thực đơn Ăn uống"}
            icon="🍱"
            badge="NUTRITION TRACKER"
          >
            <form onSubmit={handleSaveFood} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Ngày</label>
                  <GlassInput theme={theme} type="date" value={foodDate} onChange={e => setFoodDate(e.target.value)} required />
                </div>
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Giờ</label>
                  <GlassInput theme={theme} type="time" value={foodTime} onChange={e => setFoodTime(e.target.value)} required />
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Hôm nay bạn ăn gì? *</label>
                <GlassInput theme={theme} value={foodName} onChange={e => setFoodName(e.target.value)} placeholder="Ví dụ: Phở bò, Xà lách trộn, Mì tôm..." required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Loại bữa ăn</label>
                  <GlassSelect theme={theme} value={foodMealType} onChange={e => setFoodMealType(e.target.value)}>
                    <option value="main">Bữa chính (Sáng/Trưa/Tối)</option>
                    <option value="snack">Bữa phụ / Ăn vặt</option>
                  </GlassSelect>
                </div>

                <div>
                  <label className={`text-xs font-bold block mb-1 ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>Khẩu phần</label>
                  <GlassSelect theme={theme} value={foodPortionSize} onChange={e => setFoodPortionSize(e.target.value)}>
                    <option value="light">🥗 Ít / Nhẹ bụng</option>
                    <option value="normal">🍲 Vừa đủ / No</option>
                    <option value="heavy">🥩🍕 Quá no / Đầy bụng</option>
                  </GlassSelect>
                </div>
              </div>

              <div className={`modal-actions pt-5 mt-6 border-t flex gap-3.5 justify-end items-center ${
                theme === 'light' ? 'border-slate-200/80' : 'border-white/10'
              }`} style={{ paddingTop: '12px' }}>
                <GlassButton theme={theme} type="button" variant="secondary" onClick={() => setIsFoodModalOpen(false)}>
                  Hủy
                </GlassButton>
                <GlassButton theme={theme} type="submit" variant="amber">Ghi nhận</GlassButton>
              </div>
            </form>
          </GlassModal>

          {/* MODAL 5: VINH DANH BẰNG KHEN */}
          <GlassModal 
            theme={theme} 
            isOpen={isShareModalOpen} 
            onClose={() => setIsShareModalOpen(false)} 
            title="Bằng Khen Vinh Danh"
            icon="🏆"
            badge="HONOR AWARD"
            maxWidth="max-w-lg"
          >
            {activeProfile && (
              <div className="flex flex-col gap-4 text-center">
                {/* The Certificate card graphic */}
                <div className={`p-6 rounded-3xl border-2 border-dashed relative overflow-hidden flex flex-col items-center ${
                  theme === 'light' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-amber-500/10 border-amber-500/40'
                }`}>
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent pointer-events-none" />
                  
                  <div className="text-4xl filter drop-shadow-[0_4px_10px_rgba(245,158,11,0.3)]">👑</div>
                  <h2 className="text-xl font-black text-amber-500 mt-2 uppercase tracking-wide">BẰNG KHEN VINH DANH</h2>
                  <p className={`text-[10px] tracking-wider ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>CHỨNG NHẬN DANH HIỆU CAO QUÝ CỦA POOPTRACKER</p>
                  
                  <div className="my-6">
                    <span className={`text-[10px] block uppercase font-semibold ${theme === 'light' ? 'text-slate-600' : 'text-gray-400'}`}>Trao tặng cho chiến binh</span>
                    <span className={`text-2xl font-black tracking-wide block mt-1 ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{activeProfile.name}</span>
                  </div>

                  <span className="text-5xl my-2 filter drop-shadow-[0_5px_15px_rgba(245,158,11,0.4)]">🏆</span>
                  <h3 className="text-sm font-extrabold text-amber-500 dark:text-amber-400 uppercase tracking-widest mt-2">Bà Hoàng Tiêu Hóa</h3>
                  <p className={`text-[11px] leading-relaxed max-w-[340px] mt-2 ${theme === 'light' ? 'text-slate-700' : 'text-gray-300'}`}>
                    Đã xuất sắc duy trì chuỗi kỷ luật sinh học lành mạnh, uống đủ nước, ăn rau xanh đều đặn và chinh phục thành công các huy hiệu tiêu hóa đỉnh cao.
                  </p>

                  <div className={`w-full flex justify-between items-center text-[9px] border-t pt-4 mt-6 ${
                    theme === 'light' ? 'text-slate-600 border-slate-300' : 'text-gray-500 border-white/5'
                  }`}>
                    <div className="text-left">
                      <span>Hệ thống:</span>
                      <strong className={`block ${theme === 'light' ? 'text-slate-900' : 'text-gray-300'}`}>Poop Tracker v3.1</strong>
                    </div>
                    <div className="text-right">
                      <span>Ngày vinh danh:</span>
                      <strong className={`block ${theme === 'light' ? 'text-slate-900' : 'text-gray-300'}`}>{new Date().toLocaleDateString('vi-VN')}</strong>
                    </div>
                  </div>
                </div>

                <div className={`pt-4 mt-2 border-t flex gap-3 justify-center items-center ${
                  theme === 'light' ? 'border-slate-200' : 'border-white/10'
                }`} style={{ paddingTop: '12px' }}>
                  <GlassButton
                    theme={theme}
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `🏆 [VINH DANH] Chiến binh ${activeProfile.name} đã xuất sắc mở khóa thành tựu "Bà Hoàng Tiêu Hóa" trên ứng dụng Poop Tracker!`
                      );
                      showToast('Đã sao chép văn bản thành tích', 'success');
                    }}
                    className="flex-1 text-xs py-2.5 font-bold"
                  >
                    Sao chép văn bản
                  </GlassButton>
                  <GlassButton theme={theme} variant="secondary" onClick={() => setIsShareModalOpen(false)} className="flex-1 text-xs py-2.5 font-bold">
                    Đóng lại
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassModal>

        </div>
      );
    }
