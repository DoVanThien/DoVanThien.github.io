import { create } from 'zustand';
import { supabase } from './supabase';

export interface PoopProfile {
  id: string;
  name: string;
  avatar: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  weight: number;
  height: number;
  water_goal: number;
  badges: string[];
  is_default: boolean;
  created_at?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return typeof id === 'string' && UUID_REGEX.test(id);
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export const DEFAULT_MILIKET_ID = '11111111-1111-4111-a111-111111111111';
export const DEFAULT_OMACHI_ID = '22222222-2222-4222-a222-222222222222';

export interface PoopLog {
  id: string;
  profile_id: string;
  date: string;
  time: string;
  success: boolean;
  bristol_type: number;
  symptoms: string[];
  notes: string;
  created_at?: string;
}

export interface WaterLog {
  id: string;
  profile_id: string;
  date: string;
  time: string;
  amount: number;
  beverage_type: string;
  created_at?: string;
}

export interface FoodLog {
  id: string;
  profile_id: string;
  date: string;
  time: string;
  food_name: string;
  meal_type: string;
  portion_size: string;
  created_at?: string;
}

export interface PoopTrackerState {
  profiles: PoopProfile[];
  activeProfileId: string | null;
  poopLogs: PoopLog[];
  waterLogs: WaterLog[];
  foodLogs: FoodLog[];
  loading: boolean;
  error: string | null;

  // Actions
  loadInitialData: () => Promise<void>;
  setActiveProfileId: (id: string) => void;
  setDefaultProfile: (id: string) => Promise<void>;
  addProfile: (profile: Omit<PoopProfile, 'id' | 'badges' | 'is_default'>) => Promise<void>;
  updateProfile: (id: string, updates: Partial<PoopProfile>) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;

  // Logs Actions
  addPoopLog: (log: Omit<PoopLog, 'id' | 'profile_id'>) => Promise<void>;
  updatePoopLog: (id: string, log: Partial<PoopLog>) => Promise<void>;
  deletePoopLog: (id: string) => Promise<void>;
  addWaterLog: (log: Omit<WaterLog, 'id' | 'profile_id'>) => Promise<void>;
  updateWaterLog: (id: string, log: Partial<WaterLog>) => Promise<void>;
  deleteWaterLog: (id: string) => Promise<void>;
  addFoodLog: (log: Omit<FoodLog, 'id' | 'profile_id'>) => Promise<void>;
  updateFoodLog: (id: string, log: Partial<FoodLog>) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;

  // Settings & Utilities
  clearAllData: () => Promise<void>;
  syncWithCloud: () => Promise<void>;
}

// 18 Badge definitions configuration
export const BADGE_DEFINITIONS = [
  // Tích cực (10 badges)
  { id: 'queen_medal', title: 'Bà Hoàng Tiêu Hóa 👑', desc: 'Mở khóa toàn bộ 9 huy hiệu sức khỏe tích cực.', icon: '👑', type: 'positive' },
  { id: 'discipline', title: 'Nữ Thần Kỷ Luật 🛡️', desc: 'Có ghi nhật ký bất kỳ liên tục trong 7 ngày.', icon: '🛡️', type: 'positive' },
  { id: 'anti_consti', title: 'Nữ Hiệp Diệt Táo ⚔️', desc: 'Đạt chuỗi tiêu hóa lý tưởng (Bristol 3-4) liên tục 3 ngày.', icon: '⚔️', type: 'positive' },
  { id: 'hydrate_king', title: 'Mỹ Nhân Hydrate 💧', desc: 'Đạt mục tiêu nước uống liên tiếp trong 5 ngày.', icon: '💧', type: 'positive' },
  { id: 'healthy_food', title: 'Nàng Thơ Lành Mạnh 🥗', desc: 'Ăn 10 bữa ăn lành mạnh vừa no và không bị sự cố.', icon: '🥗', type: 'positive' },
  { id: 'early_bird', title: 'Tiên Nữ Bình Minh 🌅', desc: 'Đi vệ sinh thành công vào khung giờ vàng (5h - 8h) ít nhất 3 lần.', icon: '🌅', type: 'positive' },
  { id: 'water_pro', title: 'Suối Nguồn Tươi Trẻ 🌊', desc: 'Uống đạt mốc 3000ml nước trở lên trong một ngày.', icon: '🌊', type: 'positive' },
  { id: 'fiber_expert', title: 'Bậc Thầy Slim Fit 🥦', desc: 'Ăn các thực phẩm nhiều xơ (rau, quả, cải, yến mạch...) ít nhất 5 lần.', icon: '🥦', type: 'positive' },
  { id: 'perfect_month', title: 'Tháng Vàng Tiêu Hóa 🏆', desc: 'Ghi nhận 15 ngày phân lý tưởng (Bristol 3-4) trong 30 ngày gần đây.', icon: '🏆', type: 'positive' },
  { id: 'crystal_body', title: 'Cơ Địa Pha Lê ✨', desc: 'Tỷ lệ đi ngoài lý tưởng trên 80% trong 2 tuần liên tiếp.', icon: '✨', type: 'positive' },

  // Tiêu cực / Hài hước (8 badges)
  { id: 'consti_angel', title: 'Thiên Thần Táo Bón 🌵', desc: 'Không đi ngoài thành công hoặc bị táo bón suốt 7 ngày liên tiếp.', icon: '🌵', type: 'negative' },
  { id: 'fire_mountain', title: 'Hỏa Diệm Sơn 🌋', desc: 'Đi ngoài đau rát/chảy máu kết hợp ăn đồ cay nóng 3 lần trong tuần.', icon: '🌋', type: 'negative' },
  { id: 'wind_god', title: 'Thần Gió Giận Dữ 💨', desc: 'Bị đầy hơi / khó tiêu liên tục 4 ngày.', icon: '💨', type: 'negative' },
  { id: 'sugar_addict', title: 'Tín Đồ Đường Hóa Học 🥤', desc: 'Uống nước ngọt hoặc trà sữa ít nhất 5 lần trong tuần.', icon: '🥤', type: 'negative' },
  { id: 'frozen_state', title: 'Đóng Băng Tạm Temporarily 🧊', desc: 'Đi ngoài không thành công (rặn không ra) 3 lần liên tiếp.', icon: '🧊', type: 'negative' },
  { id: 'summer_rain', title: 'Cơn Mưa Mùa Hạ 🍇', desc: 'Bị tiêu chảy (Bristol loại 6-7) từ 3 lần trở lên trong vòng 2 ngày.', icon: '🍇', type: 'negative' },
  { id: 'dino_heavy', title: 'Khủng Long Ăn Thịt 🥩', desc: 'Ăn 5 bữa nhiều thịt/quá no liên tiếp không có chất xơ.', icon: '🥩', type: 'negative' },
  { id: 'camel_desert', title: 'Lạc Đà Sa Mạc 🐫', desc: 'Uống tổng lượng nước dưới 800ml trong một ngày.', icon: '🐫', type: 'negative' }
];

// Calculate badges for a profile
export function recalculateBadges(
  profileId: string,
  poopLogs: PoopLog[],
  waterLogs: WaterLog[],
  foodLogs: FoodLog[],
  profileInfo: PoopProfile
): string[] {
  const profilePoops = poopLogs.filter(l => l.profile_id === profileId).sort((a, b) => a.date.localeCompare(b.date));
  const profileWaters = waterLogs.filter(l => l.profile_id === profileId).sort((a, b) => a.date.localeCompare(b.date));
  const profileFoods = foodLogs.filter(l => l.profile_id === profileId).sort((a, b) => a.date.localeCompare(b.date));

  const earned: string[] = [];

  // Helper: check continuous days with a check function
  const checkStreak = (dates: string[], minStreak: number): boolean => {
    if (dates.length < minStreak) return false;
    const uniqueDates = Array.from(new Set(dates)).sort();
    let currentStreak = 1;
    let maxStreak = 1;

    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1]);
      const curr = new Date(uniqueDates[i]);
      const diffTime = Math.abs(curr.getTime() - prev.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else if (diffDays > 1) {
        currentStreak = 1;
      }
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    }
    return maxStreak >= minStreak;
  };

  // 1. discipline (Nữ Thần Kỷ Luật): Ghi nhật ký bất kỳ liên tục 7 ngày
  const allLogDates = [
    ...profilePoops.map(l => l.date),
    ...profileWaters.map(l => l.date),
    ...profileFoods.map(l => l.date)
  ];
  if (checkStreak(allLogDates, 7)) earned.push('discipline');

  // 2. anti_consti (Nữ Hiệp Diệt Táo): Đi ngoài Bristol 3-4 liên tiếp 3 ngày
  const perfectPoopDates = profilePoops
    .filter(l => l.success && (l.bristol_type === 3 || l.bristol_type === 4))
    .map(l => l.date);
  if (checkStreak(perfectPoopDates, 3)) earned.push('anti_consti');

  // 3. hydrate_king (Mỹ Nhân Hydrate): Đạt water_goal liên tiếp 5 ngày
  const dailyWaterMap: Record<string, number> = {};
  profileWaters.forEach(w => {
    dailyWaterMap[w.date] = (dailyWaterMap[w.date] || 0) + w.amount;
  });
  const goalWaterDates = Object.keys(dailyWaterMap).filter(
    date => dailyWaterMap[date] >= (profileInfo.water_goal || 2000)
  );
  if (checkStreak(goalWaterDates, 5)) earned.push('hydrate_king');

  // 4. healthy_food (Nàng Thơ Lành Mạnh): Ăn 10 bữa lành mạnh (normal/light) và 24h sau không gặp sự cố táo bón/tiêu chảy/đau rát
  let healthyMealsCount = 0;
  profileFoods.forEach(f => {
    if (f.portion_size === 'normal' || f.portion_size === 'light') {
      const mealTime = new Date(`${f.date}T${f.time}`);
      const hasIssue = profilePoops.some(p => {
        const poopTime = new Date(`${p.date}T${p.time}`);
        const diffHours = (poopTime.getTime() - mealTime.getTime()) / (1000 * 60 * 60);
        return (
          diffHours > 0 &&
          diffHours <= 24 &&
          (!p.success || p.bristol_type <= 2 || p.bristol_type >= 6 || p.symptoms.includes('pain') || p.symptoms.includes('bleeding'))
        );
      });
      if (!hasIssue) healthyMealsCount++;
    }
  });
  if (healthyMealsCount >= 10) earned.push('healthy_food');

  // 5. early_bird (Tiên Nữ Bình Minh): Đi ngoài success 5h-8h ít nhất 3 lần
  const earlyPoops = profilePoops.filter(p => {
    if (!p.success) return false;
    const hour = parseInt(p.time.split(':')[0]);
    return hour >= 5 && hour < 8;
  });
  if (earlyPoops.length >= 3) earned.push('early_bird');

  // 6. water_pro (Suối Nguồn Tươi Trẻ): Có ngày uống >= 3000ml nước
  const hasWaterPro = Object.values(dailyWaterMap).some(amount => amount >= 3000);
  if (hasWaterPro) earned.push('water_pro');

  // 7. fiber_expert (Bậc Thầy Slim Fit): Ăn thực phẩm nhiều xơ >= 5 lần
  const fiberKeywords = ['xơ', 'rau', 'quả', 'cải', 'yến mạch', 'salad', 'chuối', 'táo', 'trái cây', 'sinh tố', 'khoai lang'];
  const fiberMeals = profileFoods.filter(f =>
    fiberKeywords.some(kw => f.food_name.toLowerCase().includes(kw))
  );
  if (fiberMeals.length >= 5) earned.push('fiber_expert');

  // 8. perfect_month (Tháng Vàng Tiêu Hóa): 15 ngày phân lý tưởng (3-4) trong 30 ngày gần đây
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const perfectPoopsLast30Days = profilePoops.filter(p => {
    const pDate = new Date(p.date);
    return pDate >= thirtyDaysAgo && p.success && (p.bristol_type === 3 || p.bristol_type === 4);
  });
  const uniquePerfectDays = new Set(perfectPoopsLast30Days.map(p => p.date));
  if (uniquePerfectDays.size >= 15) earned.push('perfect_month');

  // 9. crystal_body (Cơ Địa Pha Lê): Tỷ lệ đi ngoài lý tưởng >= 80% trong 2 tuần gần nhất (tối thiểu 5 lần đi)
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const poopsLast14Days = profilePoops.filter(p => {
    const pDate = new Date(p.date);
    return pDate >= fourteenDaysAgo && p.success;
  });
  if (poopsLast14Days.length >= 5) {
    const perfectCount = poopsLast14Days.filter(p => p.bristol_type === 3 || p.bristol_type === 4).length;
    if (perfectCount / poopsLast14Days.length >= 0.8) {
      earned.push('crystal_body');
    }
  }

  // 10. queen_medal (Bà Hoàng Tiêu Hóa): Mở khóa toàn bộ 9 huy hiệu tích cực ở trên
  const positiveBadges = ['discipline', 'anti_consti', 'hydrate_king', 'healthy_food', 'early_bird', 'water_pro', 'fiber_expert', 'perfect_month', 'crystal_body'];
  const hasAllPositive = positiveBadges.every(b => earned.includes(b));
  if (hasAllPositive) earned.push('queen_medal');

  // === TIÊU CỰC / HÀI HƯỚC ===

  // 11. consti_angel (Thiên Thần Táo Bón): 7 ngày liên tục không đi ngoài thành công hoặc táo bón nặng
  if (allLogDates.length > 0) {
    const sortedAllDates = Array.from(new Set(allLogDates)).map(d => new Date(d)).sort((a,b)=>a.getTime()-b.getTime());
    const minDate = sortedAllDates[0];
    const maxDate = new Date();
    let constiStreak = 0;
    let maxConstiStreak = 0;

    for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const hasSuccessPoop = profilePoops.some(p => p.date === dateStr && p.success && p.bristol_type >= 3 && p.bristol_type <= 5);
      if (!hasSuccessPoop) {
        constiStreak++;
      } else {
        constiStreak = 0;
      }
      if (constiStreak > maxConstiStreak) maxConstiStreak = constiStreak;
    }
    if (maxConstiStreak >= 7) earned.push('consti_angel');
  }

  // 12. fire_mountain (Hỏa Diệm Sơn): Đi ngoài đau rát/chảy máu + ăn đồ cay nóng 3 lần trong tuần
  let fireMountainCount = 0;
  profilePoops.forEach(p => {
    if (p.symptoms.includes('bleeding') || p.symptoms.includes('strain')) {
      const poopDate = new Date(p.date);
      const hasCayNong = profileFoods.some(f => {
        const foodDate = new Date(f.date);
        const diffHours = (poopDate.getTime() - foodDate.getTime()) / (1000 * 60 * 60);
        const foodKeywords = ['cay', 'nóng', 'ớt', 'mì cay', 'lẩu thái', 'sa tế'];
        return (
          diffHours >= 0 &&
          diffHours <= 24 &&
          foodKeywords.some(kw => f.food_name.toLowerCase().includes(kw))
        );
      });
      if (hasCayNong) fireMountainCount++;
    }
  });
  if (fireMountainCount >= 3) earned.push('fire_mountain');

  // 13. wind_god (Thần Gió Giận Dữ): Bị đầy hơi / khó tiêu liên tục 4 ngày
  const bloatingDates = profilePoops
    .filter(p => p.symptoms.includes('bloating'))
    .map(p => p.date);
  if (checkStreak(bloatingDates, 4)) earned.push('wind_god');

  // 14. sugar_addict (Tín Đồ Đường Hóa Học): Trà sữa hoặc nước ngọt >= 5 lần
  const sugarDrinks = profileWaters.filter(
    w => w.beverage_type === 'soft_drink' || w.beverage_type === 'milk_tea'
  );
  if (sugarDrinks.length >= 5) earned.push('sugar_addict');

  // 15. frozen_state (Đóng Băng Tạm Thời): Đi ngoài rặn không ra (success == false) 3 lần liên tiếp
  let failedStreak = 0;
  let maxFailedStreak = 0;
  profilePoops.forEach(p => {
    if (!p.success) {
      failedStreak++;
    } else {
      failedStreak = 0;
    }
    if (failedStreak > maxFailedStreak) maxFailedStreak = failedStreak;
  });
  if (maxFailedStreak >= 3) earned.push('frozen_state');

  // 16. summer_rain (Cơn Mưa Mùa Hạ): Tiêu chảy (bristol 6-7) >= 3 lần trong vòng 2 ngày
  let hasSummerRain = false;
  for (let i = 0; i < profilePoops.length; i++) {
    const p1 = profilePoops[i];
    if (p1.bristol_type === 6 || p1.bristol_type === 7) {
      const d1 = new Date(p1.date);
      const count = profilePoops.filter(p2 => {
        const d2 = new Date(p2.date);
        const diffHours = Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60);
        return diffHours <= 48 && (p2.bristol_type === 6 || p2.bristol_type === 7);
      }).length;
      if (count >= 3) {
        hasSummerRain = true;
        break;
      }
    }
  }
  if (hasSummerRain) earned.push('summer_rain');

  // 17. dino_heavy (Khủng Long Ăn Thịt): 5 bữa ăn heavy liên tiếp không có xơ
  let heavyStreak = 0;
  let maxHeavyStreak = 0;
  profileFoods.forEach(f => {
    if (f.portion_size === 'heavy') {
      const fiberKeywords = ['xơ', 'rau', 'quả', 'cải', 'yến mạch', 'salad', 'chuối', 'táo', 'trái cây', 'sinh tố', 'khoai lang'];
      const hasFiber = fiberKeywords.some(kw => f.food_name.toLowerCase().includes(kw));
      if (!hasFiber) {
        heavyStreak++;
      } else {
        heavyStreak = 0;
      }
    } else {
      heavyStreak = 0;
    }
    if (heavyStreak > maxHeavyStreak) maxHeavyStreak = heavyStreak;
  });
  if (maxHeavyStreak >= 5) earned.push('dino_heavy');

  // 18. camel_desert (Lạc Đà Sa Mạc): Uống tổng lượng nước ngày < 800ml (chỉ tính ngày có ghi nhận nước)
  const daysWithLowWater = Object.keys(dailyWaterMap).filter(
    date => dailyWaterMap[date] < 800
  );
  if (daysWithLowWater.length >= 1) earned.push('camel_desert');

  return earned;
}

export const usePoopTrackerStore = create<PoopTrackerState>((set, get) => ({
  profiles: [],
  activeProfileId: null,
  poopLogs: [],
  waterLogs: [],
  foodLogs: [],
  loading: false,
  error: null,

  loadInitialData: async () => {
    set({ loading: true, error: null });
    try {
      if (!supabase) throw new Error('Supabase is not configured');

      // 1. Tải danh sách profile
      let { data: dbProfiles, error: profileErr } = await supabase
        .from('poop_profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (profileErr) throw profileErr;

      // 2. Nếu chưa có profile nào, khởi tạo tự động 2 profile mặc định Miliket & Omachi
      if (!dbProfiles || dbProfiles.length === 0) {
        const miliketProfileDb = {
          id: DEFAULT_MILIKET_ID,
          profile_name: 'Miliket 🍎',
          avatar: '🍎',
          gender: 'female',
          target_water: 1800,
        };

        const omachiProfileDb = {
          id: DEFAULT_OMACHI_ID,
          profile_name: 'Omachi 🍏',
          avatar: '🍏',
          gender: 'female',
          target_water: 1800,
        };

        const { data: inserted, error: insertErr } = await supabase
          .from('poop_profiles')
          .insert([miliketProfileDb, omachiProfileDb])
          .select();

        if (insertErr) throw insertErr;
        dbProfiles = inserted;
      }

      // 3. Map dbProfiles to local format
      const localProfiles: PoopProfile[] = JSON.parse(localStorage.getItem('pt_profiles') || '[]');
      let mappedDbProfiles: PoopProfile[] = (dbProfiles || []).map(dbP => {
        const locP = localProfiles.find(lp => lp.id === dbP.id) || {} as Partial<PoopProfile>;
        return {
          id: dbP.id,
          name: dbP.profile_name,
          avatar: dbP.avatar || '😊',
          gender: dbP.gender as 'male' | 'female' | 'other' || 'female',
          age: locP.age || 24,
          weight: locP.weight || 50,
          height: locP.height || 160,
          water_goal: dbP.target_water || 2000,
          badges: locP.badges || [],
          is_default: locP.is_default || false,
        };
      });

      // Thêm các local profile chưa có trên DB
      const dbIds = new Set(mappedDbProfiles.map(p => p.id));
      localProfiles.forEach(lp => {
        if (!dbIds.has(lp.id)) {
          mappedDbProfiles.push(lp);
        }
      });

      // Xác định profile active
      let activeId = localStorage.getItem('pt_active_profile_id');
      const profileExists = mappedDbProfiles.some(p => p.id === activeId);

      if (!activeId || !profileExists) {
        const defaultProfile = mappedDbProfiles.find(p => p.is_default) || mappedDbProfiles[0];
        activeId = defaultProfile ? defaultProfile.id : null;
        if (activeId) {
          localStorage.setItem('pt_active_profile_id', activeId);
        }
      }

      // 4. Tải logs tương ứng
      const { data: dbPoops, error: poopErr } = await supabase.from('poop_logs').select('*');
      const { data: dbWaters, error: waterErr } = await supabase.from('water_logs').select('*');
      const { data: dbFoods, error: foodErr } = await supabase.from('food_logs').select('*');

      if (poopErr) throw poopErr;
      if (waterErr) throw waterErr;
      if (foodErr) throw foodErr;

      // Map dbPoops (profile_name -> profile_id, type -> success)
      const mappedDbPoops: PoopLog[] = (dbPoops || []).map(dbL => {
        const p = mappedDbProfiles.find(prof => prof.name === dbL.profile_name);
        return {
          id: dbL.id,
          profile_id: p ? p.id : '',
          date: dbL.date,
          time: dbL.time,
          success: dbL.type === 'success',
          bristol_type: dbL.bristol_type || 4,
          symptoms: Array.isArray(dbL.symptoms) ? dbL.symptoms : [],
          notes: dbL.notes || '',
        };
      }).filter((l: any) => l.profile_id !== '');

      set({
        profiles: mappedDbProfiles,
        activeProfileId: activeId,
        poopLogs: mappedDbPoops,
        waterLogs: dbWaters || [],
        foodLogs: dbFoods || [],
        loading: false,
      });

      await get().syncWithCloud();
    } catch (err: any) {
      console.warn('Đang chạy ở chế độ Offline (LocalStorage Local-First):', err);
      try {
        let localProfiles: PoopProfile[] = JSON.parse(localStorage.getItem('pt_profiles') || '[]');
        
        if (!localProfiles || localProfiles.length === 0) {
          localProfiles = [
            {
              id: DEFAULT_MILIKET_ID,
              name: 'Miliket 🍎',
              avatar: '🍎',
              gender: 'female',
              age: 23,
              weight: 48,
              height: 158,
              water_goal: 1800,
              badges: [],
              is_default: true,
            },
            {
              id: DEFAULT_OMACHI_ID,
              name: 'Omachi 🍏',
              avatar: '🍏',
              gender: 'female',
              age: 24,
              weight: 47,
              height: 156,
              water_goal: 1800,
              badges: [],
              is_default: false,
            },
          ];
          localStorage.setItem('pt_profiles', JSON.stringify(localProfiles));
        } else {
          // Sanitize existing local profiles to migrate non-UUID IDs or missing names
          let isModified = false;
          const idMap: Record<string, string> = {};

          localProfiles = localProfiles.map((p, idx) => {
            let updatedId = p.id;
            if (!isValidUUID(p.id)) {
              isModified = true;
              if (p.id === 'miliket-local-id' || idx === 0) {
                updatedId = DEFAULT_MILIKET_ID;
              } else if (p.id === 'omachi-local-id' || idx === 1) {
                updatedId = DEFAULT_OMACHI_ID;
              } else {
                updatedId = generateUUID();
              }
              idMap[p.id] = updatedId;
            }

            const updatedName = (p.name && p.name.trim()) ? p.name : (idx === 0 ? 'Miliket 🍎' : (idx === 1 ? 'Omachi 🍏' : `Hồ sơ ${idx + 1}`));
            if (updatedName !== p.name || updatedId !== p.id) {
              isModified = true;
            }

            return {
              ...p,
              id: updatedId,
              name: updatedName,
              avatar: p.avatar || (idx === 0 ? '🍎' : '🍏')
            };
          });

          if (isModified) {
            localStorage.setItem('pt_profiles', JSON.stringify(localProfiles));
            // Cập nhật profile_id trong logs nếu có chuyển đổi ID
            if (Object.keys(idMap).length > 0) {
              ['pt_poop_logs', 'pt_water_logs', 'pt_food_logs'].forEach(key => {
                const logs = JSON.parse(localStorage.getItem(key) || '[]');
                const updatedLogs = logs.map((l: any) => ({
                  ...l,
                  profile_id: idMap[l.profile_id] || l.profile_id
                }));
                localStorage.setItem(key, JSON.stringify(updatedLogs));
              });
            }
          }
        }

        const localPoops = JSON.parse(localStorage.getItem('pt_poop_logs') || '[]');
        const localWaters = JSON.parse(localStorage.getItem('pt_water_logs') || '[]');
        const localFoods = JSON.parse(localStorage.getItem('pt_food_logs') || '[]');
        
        let localActiveId = localStorage.getItem('pt_active_profile_id');
        if (!localActiveId || !localProfiles.some(p => p.id === localActiveId)) {
          const defaultProf = localProfiles.find(p => p.is_default) || localProfiles[0];
          localActiveId = defaultProf ? defaultProf.id : null;
          if (localActiveId) {
            localStorage.setItem('pt_active_profile_id', localActiveId);
          }
        }

        set({
          profiles: localProfiles,
          poopLogs: localPoops,
          waterLogs: localWaters,
          foodLogs: localFoods,
          activeProfileId: localActiveId,
          loading: false,
          error: null
        });
      } catch (localErr) {
        set({ loading: false, error: (localErr as any).message });
      }
    }
  },

  setActiveProfileId: (id: string) => {
    localStorage.setItem('pt_active_profile_id', id);
    set({ activeProfileId: id });
  },

  setDefaultProfile: async (id: string) => {
    try {
      const updatedProfiles = get().profiles.map(p => ({
        ...p,
        is_default: p.id === id,
      }));

      set({ profiles: updatedProfiles });

      if (supabase) {
        const { error: err1 } = await supabase
          .from('poop_profiles')
          .update({ is_default: false })
          .not('id', 'eq', id);
        const { error: err2 } = await supabase
          .from('poop_profiles')
          .update({ is_default: true })
          .eq('id', id);

        if (err1 || err2) {
          console.warn('Lỗi đồng bộ default profile lên cloud:', err1 || err2);
        }
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ mặc định profile (đang chạy offline):', err);
    } finally {
      await get().syncWithCloud();
    }
  },

  addProfile: async (profile) => {
    const newProfile = {
      ...profile,
      id: generateUUID(),
      badges: [],
      is_default: false,
    };

    try {
      if (supabase) {
        const dbPayload = {
          id: newProfile.id,
          profile_name: newProfile.name,
          avatar: newProfile.avatar,
          target_water: newProfile.water_goal,
          gender: newProfile.gender,
        };
        const { error } = await supabase
          .from('poop_profiles')
          .insert([dbPayload]);

        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ thêm hồ sơ (đang chạy offline):', err);
    } finally {
      set(state => ({
        profiles: [...state.profiles, newProfile],
      }));
      localStorage.setItem('pt_profiles', JSON.stringify(get().profiles));
    }
  },

  updateProfile: async (id, updates) => {
    // Luôn cập nhật local state và localStorage trước tiên
    set(state => ({
      profiles: state.profiles.map(p => (p.id === id ? { ...p, ...updates } : p)),
    }));
    localStorage.setItem('pt_profiles', JSON.stringify(get().profiles));

    try {
      if (supabase && isValidUUID(id)) {
        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.profile_name = updates.name;
        if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
        if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
        if (updates.water_goal !== undefined) dbUpdates.target_water = updates.water_goal;

        if (Object.keys(dbUpdates).length > 0) {
          const { error } = await supabase
            .from('poop_profiles')
            .update(dbUpdates)
            .eq('id', id);
          if (error) {
            console.warn('Lỗi Supabase khi update profile:', error);
          }
        }
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ cập nhật hồ sơ (đang chạy offline):', err);
    }
  },

  deleteProfile: async (id) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('poop_profiles').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ xóa hồ sơ (đang chạy offline):', err);
    } finally {
      set(state => {
        const nextProfiles = state.profiles.filter(p => p.id !== id);
        let nextActiveId = state.activeProfileId;
        if (nextActiveId === id) {
          nextActiveId = nextProfiles[0]?.id || null;
        }
        return {
          profiles: nextProfiles,
          activeProfileId: nextActiveId,
          poopLogs: state.poopLogs.filter(l => l.profile_id !== id),
          waterLogs: state.waterLogs.filter(l => l.profile_id !== id),
          foodLogs: state.foodLogs.filter(l => l.profile_id !== id),
        };
      });

      localStorage.setItem('pt_profiles', JSON.stringify(get().profiles));
    }
  },

  addPoopLog: async (log) => {
    const activeId = get().activeProfileId;
    if (!activeId) return;

    const newLog = {
      ...log,
      id: generateUUID(),
      profile_id: activeId,
    };

    try {
      if (supabase) {
        const activeProfile = get().profiles.find(p => p.id === activeId);
        const profileName = activeProfile ? activeProfile.name : 'Unknown';

        const dbPayload = {
          id: newLog.id,
          profile_name: profileName,
          type: newLog.success ? 'success' : 'fail',
          date: newLog.date,
          time: newLog.time,
          bristol_type: newLog.bristol_type,
          symptoms: newLog.symptoms,
          notes: newLog.notes,
        };

        const { error } = await supabase
          .from('poop_logs')
          .insert([dbPayload]);

        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ ghi nhật ký đại tiện (đang chạy offline):', err);
    } finally {
      set(state => ({
        poopLogs: [...state.poopLogs, newLog],
      }));
      await get().syncWithCloud();
    }
  },

  updatePoopLog: async (id, log) => {
    try {
      if (supabase) {
        const dbUpdates: Record<string, any> = {};
        
        if (log.success !== undefined) dbUpdates.type = log.success ? 'success' : 'fail';
        if (log.date !== undefined) dbUpdates.date = log.date;
        if (log.time !== undefined) dbUpdates.time = log.time;
        if (log.bristol_type !== undefined) dbUpdates.bristol_type = log.bristol_type;
        if (log.symptoms !== undefined) dbUpdates.symptoms = log.symptoms;
        if (log.notes !== undefined) dbUpdates.notes = log.notes;
        
        if (Object.keys(dbUpdates).length > 0) {
          const { error } = await supabase
            .from('poop_logs')
            .update(dbUpdates)
            .eq('id', id);
          if (error) throw error;
        }
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ sửa nhật ký đại tiện:', err);
    } finally {
      set(state => ({
        poopLogs: state.poopLogs.map(l => l.id === id ? { ...l, ...log } : l),
      }));
      await get().syncWithCloud();
    }
  },

  deletePoopLog: async (id) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('poop_logs').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ xóa nhật ký đại tiện (đang chạy offline):', err);
    } finally {
      set(state => ({
        poopLogs: state.poopLogs.filter(l => l.id !== id),
      }));

      await get().syncWithCloud();
    }
  },

  addWaterLog: async (log) => {
    const activeId = get().activeProfileId;
    if (!activeId) return;

    // Lọc sạch payload để chỉ gửi các trường cột hợp lệ cho bảng water_logs trong Supabase DB
    const newLog: WaterLog = {
      id: generateUUID(),
      profile_id: activeId,
      date: log.date,
      time: log.time,
      amount: Number(log.amount),
      beverage_type: log.beverage_type || 'pure_water'
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('water_logs')
          .insert([newLog])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          set(state => ({
            waterLogs: [...state.waterLogs, data[0]],
          }));
        } else {
          set(state => ({
            waterLogs: [...state.waterLogs, newLog],
          }));
        }
      } else {
        set(state => ({
          waterLogs: [...state.waterLogs, newLog],
        }));
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ ghi nhật ký nước (đang chạy offline):', err);
      // Fallback local
      set(state => ({
        waterLogs: [...state.waterLogs, newLog],
      }));
    } finally {
      await get().syncWithCloud();
    }
  },

  updateWaterLog: async (id, log) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from('water_logs')
          .update(log)
          .eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ sửa nhật ký nước:', err);
    } finally {
      set(state => ({
        waterLogs: state.waterLogs.map(l => l.id === id ? { ...l, ...log } : l),
      }));
      await get().syncWithCloud();
    }
  },

  deleteWaterLog: async (id) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('water_logs').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ xóa nhật ký nước (đang chạy offline):', err);
    } finally {
      set(state => ({
        waterLogs: state.waterLogs.filter(l => l.id !== id),
      }));

      await get().syncWithCloud();
    }
  },

  addFoodLog: async (log) => {
    const activeId = get().activeProfileId;
    if (!activeId) return;

    const newLog = {
      ...log,
      id: generateUUID(),
      profile_id: activeId,
    };

    try {
      if (supabase) {
        const { data, error } = await supabase
          .from('food_logs')
          .insert([newLog])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          set(state => ({
            foodLogs: [...state.foodLogs, data[0]],
          }));
        } else {
          set(state => ({
            foodLogs: [...state.foodLogs, newLog],
          }));
        }
      } else {
        set(state => ({
          foodLogs: [...state.foodLogs, newLog],
        }));
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ ghi nhật ký ăn uống (đang chạy offline):', err);
      // Fallback local
      set(state => ({
        foodLogs: [...state.foodLogs, newLog],
      }));
    } finally {
      await get().syncWithCloud();
    }
  },

  updateFoodLog: async (id, log) => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from('food_logs')
          .update(log)
          .eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ sửa nhật ký ăn uống:', err);
    } finally {
      set(state => ({
        foodLogs: state.foodLogs.map(l => l.id === id ? { ...l, ...log } : l),
      }));
      await get().syncWithCloud();
    }
  },

  deleteFoodLog: async (id) => {
    try {
      if (supabase) {
        const { error } = await supabase.from('food_logs').delete().eq('id', id);
        if (error) throw error;
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ xóa nhật ký ăn uống (đang chạy offline):', err);
    } finally {
      set(state => ({
        foodLogs: state.foodLogs.filter(l => l.id !== id),
      }));

      await get().syncWithCloud();
    }
  },

  clearAllData: async () => {
    const activeId = get().activeProfileId;
    if (!activeId) return;

    try {
      if (supabase) {
        const activeProfile = get().profiles.find(p => p.id === activeId);
        const profileName = activeProfile ? activeProfile.name : '';
        if (profileName) {
          await supabase.from('poop_logs').delete().eq('profile_name', profileName);
        }
        await supabase.from('water_logs').delete().eq('profile_id', activeId);
        await supabase.from('food_logs').delete().eq('profile_id', activeId);
      }
    } catch (err: any) {
      console.warn('Lỗi đồng bộ xóa dữ liệu (đang chạy offline):', err);
    } finally {
      set(state => ({
        poopLogs: state.poopLogs.filter(l => l.profile_id !== activeId),
        waterLogs: state.waterLogs.filter(l => l.profile_id !== activeId),
        foodLogs: state.foodLogs.filter(l => l.profile_id !== activeId),
      }));

      await get().syncWithCloud();
    }
  },

  syncWithCloud: async () => {
    localStorage.setItem('pt_profiles', JSON.stringify(get().profiles));
    localStorage.setItem('pt_poop_logs', JSON.stringify(get().poopLogs));
    localStorage.setItem('pt_water_logs', JSON.stringify(get().waterLogs));
    localStorage.setItem('pt_food_logs', JSON.stringify(get().foodLogs));

    try {
      const { profiles, poopLogs, waterLogs, foodLogs } = get();

      for (const p of profiles) {
        const computedBadges = recalculateBadges(p.id, poopLogs, waterLogs, foodLogs, p);
        const currentBadges = p.badges || [];
        
        const isDiff =
          currentBadges.length !== computedBadges.length ||
          !currentBadges.every(b => computedBadges.includes(b));

        if (isDiff) {
          set(state => ({
            profiles: state.profiles.map(prof =>
              prof.id === p.id ? { ...prof, badges: computedBadges } : prof
            ),
          }));
          
          // Ghi chú: Không đồng bộ badges lên Supabase vì bảng poop_profiles không có cột badges.
          // Badges sẽ được lưu trữ hoàn toàn ở Local Storage.
        }
      }
    } catch (err) {
      console.warn('Lỗi chạy đồng bộ huy hiệu (đang chạy offline):', err);
    }
  },
}));
