'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Home, Sparkles, Cloud, CloudOff, Languages, Tag, RefreshCw, 
  Send, Volume2, VolumeX, Brain, Shuffle, BookOpen, 
  Trash2, FileJson, FileInput, Plus, Star, X, Info, ChevronDown, CheckCircle, AlertTriangle
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Topics list
const TOPICS = [
  "Công sở & Đồng nghiệp",
  "Du lịch & Khám phá",
  "Sức khỏe & Phòng khám",
  "Mua sắm & Trả giá",
  "Sở thích & Giải trí",
  "Giao thông & Đường sá",
  "Công nghệ & Điện thoại",
  "Gia đình & Họ hàng",
  "Thời tiết & Thiên tai",
  "Học tập & Trường học",
  "Hẹn hò & Tình cảm",
  "Phàn nàn & Khiếu nại dịch vụ",
  "Thủ tục hành chính & Giấy tờ",
  "Đồ gia dụng & Sửa chữa nhà cửa",
  "Thể thao & Gym",
  "Tài chính, Vay mượn & Tiền bạc",
  "Hàng xóm & Khu phố",
  "Thú cưng & Động vật",
  "Đi phỏng vấn xin việc",
  "Tán gẫu xã giao (Small Talk)",
  "Chữa cháy & Sự cố bất ngờ",
  "Kế hoạch cuối tuần & Party"
];

// Scenarios/Tones list
const TONES = [
  "Đang rất vội vã",
  "Lịch sự và vô cùng trang trọng",
  "Thân mật, nói đùa, dùng từ lóng",
  "Đang tức giận hoặc phàn nàn",
  "Ngập ngừng, bối rối khi nói chuyện",
  "Gặp sự cố bất ngờ",
  "Chia sẻ hào hứng, vui vẻ",
  "Nói chuyện điện thoại",
  "Trao đổi nhanh qua tin nhắn",
  "Bày tỏ sự tiếc nuối, xin lỗi"
];

interface HistoryItem {
  id?: string;
  vi: string;
  en: string;
  date: string;
  profile_name: string;
}

interface VocabItem {
  id?: string;
  word: string;
  phonetic: string;
  translation: string;
  date: string;
  profile_name: string;
}

export default function AIEnglishMentor() {
  const [profiles, setProfiles] = useState<string[]>(['Miliket', 'Omachi']);
  const [activeProfile, setActiveProfile] = useState<string>('Miliket');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = useState(false);
  const [newProfileNameInput, setNewProfileNameInput] = useState('');
  
  // App States
  const [currentTopic, setCurrentTopic] = useState('Tán gẫu xã giao (Small Talk)');
  const [currentTone, setCurrentTone] = useState('Chia sẻ hào hứng, vui vẻ');
  const [topicSelection, setTopicSelection] = useState('random');
  const [currentQuestion, setCurrentQuestion] = useState('Ê, tối qua mới cày xong bộ phim Hàn Quốc mới á, cuốn dã man luôn! Tính ra coi từ 8 giờ tối tới 3 giờ sáng luôn không biết mệt!');
  
  const [userTranslation, setUserTranslation] = useState('');
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  const [isLoadingCheck, setIsLoadingCheck] = useState(false);
  
  // AI Feedback result
  const [resultVisible, setResultVisible] = useState(false);
  const [aiScore, setAiScore] = useState(0);
  const [aiTitle, setAiTitle] = useState('');
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  
  // Collections & Streaks
  const [studyHistory, setStudyHistory] = useState<HistoryItem[]>([]);
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [allTranslationsVisible, setAllTranslationsVisible] = useState(false);
  const [visibleTranslationIndices, setVisibleTranslationIndices] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'sentences' | 'vocab'>('sentences');
  const [allVocabTranslationsVisible, setAllVocabTranslationsVisible] = useState(false);
  const [visibleVocabIndices, setVisibleVocabIndices] = useState<Record<number, boolean>>({});
  
  // Modals & Popups
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState({ title: '', message: '', onConfirm: () => {} });
  
  // Speech synthesis variables
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingAudioText, setPlayingAudioText] = useState('');
  
  // Word selection state
  const [selectedWord, setSelectedWord] = useState('');
  const [selectionPosition, setSelectionPosition] = useState({ top: 0, left: 0, show: false, arrowDown: true });
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ phonetic: string; translation: string } | null>(null);
  
  // Toast list
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'warning' | 'error' }[]>([]);
  
  // Cloud Engine Config
  const hasCloud = isSupabaseConfigured();
  
  const selectionPopupRef = useRef<HTMLDivElement>(null);
  
  // Toast triggers
  const triggerToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  // Load Profiles & Config
  useEffect(() => {
    const savedProfiles = localStorage.getItem('ai_english_profiles');
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles));
      } catch (e) {
        console.error(e);
      }
    } else {
      setProfiles(['Miliket', 'Omachi']);
      localStorage.setItem('ai_english_profiles', JSON.stringify(['Miliket', 'Omachi']));
    }
    
    const savedActiveProfile = localStorage.getItem('ai_english_active_profile');
    if (savedActiveProfile) {
      setActiveProfile(savedActiveProfile);
    } else {
      setActiveProfile('Miliket');
      localStorage.setItem('ai_english_active_profile', 'Miliket');
    }
  }, []);

  // Fetch data (LocalStorage fallback + Supabase Cloud sync)
  const loadDataForProfile = async (profileName: string) => {
    // 1. Load LocalStorage first
    const localHistoryKey = `ai_english_history_${profileName}`;
    const localVocabKey = `ai_english_vocab_${profileName}`;
    const localStreakKey = `ai_english_streak_${profileName}`;
    
    let localHistory: HistoryItem[] = [];
    let localVocabs: VocabItem[] = [];
    let localStreak = 0;
    
    try {
      localHistory = JSON.parse(localStorage.getItem(localHistoryKey) || '[]');
      localVocabs = JSON.parse(localStorage.getItem(localVocabKey) || '[]');
      localStreak = parseInt(localStorage.getItem(localStreakKey) || '0', 10);
    } catch (e) {
      console.error(e);
    }
    
    setStudyHistory(localHistory);
    setVocabList(localVocabs);
    setCurrentStreak(localStreak);
    
    // 2. Fetch from Supabase cloud if configured
    if (hasCloud && supabase) {
      try {
        // Fetch history
        const { data: cloudHistory, error: historyErr } = await supabase
          .from('ai_english_history')
          .select('*')
          .eq('profile_name', profileName)
          .order('created_at', { ascending: false });
          
        if (!historyErr && cloudHistory) {
          const formattedHistory: HistoryItem[] = cloudHistory.map(row => ({
            id: row.id,
            vi: row.vietnamese_text,
            en: row.english_translation,
            date: new Date(row.created_at).toLocaleDateString('vi-VN'),
            profile_name: row.profile_name
          }));
          
          // Merge local and cloud history
          const mergedHistory = mergeLists(localHistory, formattedHistory, 'vi');
          setStudyHistory(mergedHistory);
          localStorage.setItem(localHistoryKey, JSON.stringify(mergedHistory));
        }

        // Fetch vocab
        const { data: cloudVocab, error: vocabErr } = await supabase
          .from('ai_english_vocab')
          .select('*')
          .eq('profile_name', profileName)
          .order('created_at', { ascending: false });
          
        if (!vocabErr && cloudVocab) {
          const formattedVocab: VocabItem[] = cloudVocab.map(row => ({
            id: row.id,
            word: row.word,
            phonetic: row.phonetic,
            translation: row.translation,
            date: new Date(row.created_at).toLocaleDateString('vi-VN'),
            profile_name: row.profile_name
          }));
          
          const mergedVocab = mergeLists(localVocabs, formattedVocab, 'word');
          setVocabList(mergedVocab);
          localStorage.setItem(localVocabKey, JSON.stringify(mergedVocab));
        }
      } catch (err) {
        console.warn('Sync with cloud failed. Using local data.', err);
      }
    }
  };

  const mergeLists = <T extends any>(local: T[], cloud: T[], key: keyof T): T[] => {
    const map = new Map<string, T>();
    // Cloud takes precedence for duplicates
    local.forEach(item => map.set(String(item[key]).toLowerCase(), item));
    cloud.forEach(item => map.set(String(item[key]).toLowerCase(), item));
    return Array.from(map.values()) as T[];
  };

  useEffect(() => {
    loadDataForProfile(activeProfile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProfile]);

  // Click outside listener for profile switcher
  useEffect(() => {
    const clickHandler = () => {
      setProfileDropdownOpen(false);
    };
    window.addEventListener('click', clickHandler);
    return () => window.removeEventListener('click', clickHandler);
  }, []);

  // Text selection handler for fast word dictionary lookup
  useEffect(() => {
    const handleTextSelection = (e: MouseEvent | TouchEvent) => {
      if (selectionPopupRef.current && selectionPopupRef.current.contains(e.target as Node)) {
        return;
      }
      
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';
      
      if (
        selectedText.length > 0 && 
        selectedText.split(/\s+/).length <= 5 && 
        /^[a-zA-Z\s,.'"-]+$/.test(selectedText)
      ) {
        try {
          const range = selection!.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const isMobile = window.innerWidth < 640;
          
          if (isMobile) {
            setSelectionPosition({
              top: window.innerHeight - 200,
              left: 16,
              show: true,
              arrowDown: false
            });
          } else {
            setSelectionPosition({
              top: rect.top + window.scrollY - 180, // Offset for popup height
              left: rect.left + window.scrollX + (rect.width / 2) - 140, // Centered
              show: true,
              arrowDown: true
            });
          }
          
          setSelectedWord(selectedText);
          setIsLoadingLookup(true);
          setLookupResult(null);
          fetchWordLookup(selectedText);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSelectionPosition(prev => ({ ...prev, show: false }));
      }
    };

    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('touchend', handleTextSelection);
    };
  }, []);

  // Fetch word definition using Gemini API Route Handler
  const fetchWordLookup = async (word: string) => {
    try {
      const prompt = `Bạn là một từ điển Anh-Việt thông thái, nhanh nhẹn. Hãy tra cứu từ/cụm từ sau: "${word}".
      Trả về kết quả dưới định dạng JSON có cấu trúc chính xác sau đây:
      {
          "phonetic": "phiên âm IPA của từ, ví dụ /həˈloʊ/",
          "translation": "nghĩa tiếng Việt ngắn gọn, súc tích và dễ hiểu nhất"
      }`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-signature': 'ai-english-mentor-secure-v2'
        },
        body: JSON.stringify({
          prompt,
          responseSchema: {
            type: "OBJECT",
            properties: {
              phonetic: { type: "STRING" },
              translation: { type: "STRING" }
            },
            required: ["phonetic", "translation"]
          }
        })
      });

      if (!response.ok) throw new Error();
      const data = await response.json();
      const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
      
      setLookupResult({
        phonetic: result.phonetic || "/N/A/",
        translation: result.translation || "Không rõ nghĩa"
      });
      setIsLoadingLookup(false);
    } catch (err) {
      setLookupResult({
        phonetic: "/error/",
        translation: "Không thể kết nối API. Vui lòng cấu hình GEMINI_API_KEY."
      });
      setIsLoadingLookup(false);
    }
  };

  const saveSelectedWord = async () => {
    if (!lookupResult) return;
    
    const exists = vocabList.some(v => v.word.toLowerCase() === selectedWord.toLowerCase());
    if (exists) {
      triggerToast(`Từ "${selectedWord}" đã có trong sổ tay của bạn!`, 'warning');
      return;
    }

    const newVocab: VocabItem = {
      word: selectedWord,
      phonetic: lookupResult.phonetic,
      translation: lookupResult.translation,
      date: new Date().toLocaleDateString('vi-VN'),
      profile_name: activeProfile
    };

    const updatedList = [newVocab, ...vocabList];
    setVocabList(updatedList);
    localStorage.setItem(`ai_english_vocab_${activeProfile}`, JSON.stringify(updatedList));

    if (hasCloud && supabase) {
      try {
        await supabase.from('ai_english_vocab').insert({
          profile_name: activeProfile,
          word: newVocab.word,
          phonetic: newVocab.phonetic,
          translation: newVocab.translation
        });
      } catch (e) {
        console.error(e);
      }
    }

    triggerToast(`Đã lưu "${selectedWord}" vào sổ tay từ vựng!`, 'success');
    setSelectionPosition(prev => ({ ...prev, show: false }));
  };

  // Generate a situation utilizing Gemini API Router
  const handleGenerateQuestion = async () => {
    const chosenTopic = topicSelection === 'random'
      ? TOPICS[Math.floor(Math.random() * TOPICS.length)]
      : topicSelection;
      
    const chosenTone = TONES[Math.floor(Math.random() * TONES.length)];

    setCurrentTopic(chosenTopic);
    setCurrentTone(chosenTone);
    setIsLoadingQuestion(true);
    setResultVisible(false);

    try {
      const systemPrompt = `Bạn là một giáo viên dạy tiếng Anh giao tiếp cực kỳ thực tế, trẻ trung, dùng ngôn ngữ đời thường năng động.
      Nhiệm vụ của bạn là tạo ra một câu thoại tiếng Việt giao tiếp đời thực, cực kỳ tự nhiên, sinh động và thực tế.
      
      YÊU CẦU ĐẶC BIỆT VỀ CHẤT LIỆU TIẾNG VIỆT:
      - Chủ đề chính: "${chosenTopic}".
      - Sắc thái/Cảm xúc/Bối cảnh giao tiếp: "${chosenTone}".
      - Câu thoại phải NGẮN GỌN, SÚC TÍCH (tối đa 15-20 từ tiếng Việt), là một câu nói trực tiếp mà một người thực sự sẽ thốt ra trong đời sống hàng ngày ngày nay.
      - Tuyệt đối TRÁNH các câu sách giáo khoa sáo rỗng, khô cứng vô hồn (như "Bạn có khỏe không?", "Tôi đi đến rạp chiếu phim để xem phim").
      - Tuyệt đối TRÁNH các câu mang tính kể lể hoàn cảnh, dẫn dắt rườm rà. Chỉ trả về chính xác CÂU THOẠI cần dịch.
      - Sử dụng linh hoạt các thán từ, trợ từ tự nhiên của tiếng Việt đời thường (ví dụ: ê, nha, á, trời ơi, ghê, luôn, hả, đi, cơ...).
      - Ví dụ:
        + "Trời ơi kẹt xe cứng ngắc rồi, trễ giờ làm chắc luôn!"
        + "Ủa bớt bớt cho em tí đi chị ơi, giá này chát quá mua hổng nổi."
        + "Ê, cái áo tao mua online nhìn như cái giẻ lau vậy á, bực ghê!"
        + "Tí đi ăn trưa hú tao với nha, đang cày nốt đống báo cáo."
        + "Alo anh giao tới nhanh giùm em nha, em đang vội đi họp gấp rồi."
      - Phải trả về dữ liệu đúng định dạng JSON có chứa trường "vietnamese_content" mô tả câu thoại tiếng Việt sinh động đó.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-signature': 'ai-english-mentor-secure-v2'
        },
        body: JSON.stringify({
          prompt: "Hãy tạo một câu tiếng Việt độc đáo dựa trên yêu cầu hệ thống.",
          systemPrompt,
          responseSchema: {
            type: "OBJECT",
            properties: {
              vietnamese_content: { type: "STRING" }
            },
            required: ["vietnamese_content"]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
      
      setCurrentQuestion(result.vietnamese_content || "Trời ơi, kẹt xe cứng ngắc rồi, kiểu này trễ giờ làm chắc luôn!");
      setUserTranslation('');
      setIsLoadingQuestion(false);
    } catch (error: any) {
      setCurrentQuestion("Không thể tải tình huống. Vui lòng kiểm tra cấu hình biến môi trường GEMINI_API_KEY.");
      triggerToast("Lỗi kết nối AI: " + error.message, 'error');
      setIsLoadingQuestion(false);
    }
  };

  // Trigger initial generate on load
  useEffect(() => {
    handleGenerateQuestion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Grade translation
  const handleCheckAnswer = async () => {
    const trimmed = userTranslation.trim();
    if (!trimmed) {
      triggerToast("Vui lòng viết bản dịch của bạn trước khi nộp!", 'warning');
      return;
    }

    setIsLoadingCheck(true);

    try {
      const systemPrompt = `Bạn là chuyên gia chấm điểm tiếng Anh giao tiếp bản ngữ cực kỳ chuyên nghiệp và thực tế.
      Hãy nhận xét và chấm điểm bài dịch từ tiếng Việt sang tiếng Anh của học viên.
      Câu gốc tiếng Việt: "${currentQuestion}"
      
      TIÊU CHÍ CHẤM ĐIỂM:
      1. Điểm số (0-100): Dựa trên ngữ pháp, và đặc biệt là độ tự nhiên, cách dùng từ có giống người bản xứ giao tiếp thực tế hay không.
      2. Tiêu đề ngắn phản ánh chất lượng (ví dụ: "Tuyệt vời", "Cần cải thiện độ tự nhiên").
      3. Trả về đề xuất dịch mẫu đỉnh nhất, áp dụng các cụm từ (collocations, idioms) hiện đại đời thường của người Mỹ/Anh.
      4. Nhận xét chi tiết bằng tiếng Việt: Nêu rõ lỗi sai từ vựng/ngữ pháp và hướng dẫn thay thế các từ vựng trang trọng khô cứng bằng văn phong giao tiếp tự nhiên.
      
      Trả về dữ liệu dưới dạng JSON như cấu trúc yêu cầu.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-app-signature': 'ai-english-mentor-secure-v2'
        },
        body: JSON.stringify({
          prompt: `Học viên dịch là: "${trimmed}"`,
          systemPrompt,
          responseSchema: {
            type: "OBJECT",
            properties: {
              score: { type: "NUMBER" },
              title: { type: "STRING" },
              suggestion: { type: "STRING" },
              explanation: { type: "STRING" }
            },
            required: ["score", "title", "suggestion", "explanation"]
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);

      const score = result.score || 0;
      const title = result.title || "Kết quả";
      const suggestion = result.suggestion || "N/A";
      const explanation = result.explanation || "Không có nhận xét";

      setAiScore(score);
      setAiTitle(title);
      setAiSuggestion(suggestion);
      setAiExplanation(explanation);
      setResultVisible(true);

      if (score >= 50) {
        savePhraseToHistory(currentQuestion, suggestion);
      } else {
        triggerToast("Bản dịch chưa đạt mốc 50 điểm để được lưu trữ, hãy sửa chữa thêm nhé!", 'warning');
      }

      setIsLoadingCheck(false);
      
      setTimeout(() => {
        document.getElementById('resultCard')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      triggerToast("Lỗi phân tích bài: " + error.message, 'error');
      setIsLoadingCheck(false);
    }
  };

  const savePhraseToHistory = async (vi: string, en: string) => {
    const exists = studyHistory.some(item => item.vi === vi);
    if (exists) return;

    const newHistory: HistoryItem = {
      vi,
      en,
      date: new Date().toLocaleDateString('vi-VN'),
      profile_name: activeProfile
    };

    const updatedHistory = [newHistory, ...studyHistory];
    setStudyHistory(updatedHistory);
    localStorage.setItem(`ai_english_history_${activeProfile}`, JSON.stringify(updatedHistory));

    const newStreak = currentStreak + 1;
    setCurrentStreak(newStreak);
    localStorage.setItem(`ai_english_streak_${activeProfile}`, newStreak.toString());

    if (hasCloud && supabase) {
      try {
        await supabase.from('ai_english_history').insert({
          profile_name: activeProfile,
          vietnamese_text: newHistory.vi,
          english_translation: newHistory.en
        });
      } catch (e) {
        console.error(e);
      }
    }

    if (newStreak === 5) {
      triggerToast("🎉 Tuyệt vời! Bạn đã hoàn thành chuỗi 5 câu ngày học!", 'success');
    }
  };

  // Text-To-Speech Pronunciation engine
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); 
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.92; 
      utterance.pitch = 1.0;

      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.lang.startsWith('en-US') && v.name.includes('Google')) ||
                           voices.find(v => v.lang.startsWith('en-') && v.localService === true) || 
                           voices.find(v => v.lang.startsWith('en-'));
      if (premiumVoice) {
        utterance.voice = premiumVoice;
      }

      utterance.onstart = () => {
        setIsPlayingAudio(true);
        setPlayingAudioText(text);
      };

      utterance.onend = () => {
        setIsPlayingAudio(false);
      };

      utterance.onerror = () => {
        setIsPlayingAudio(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      triggerToast("Trình duyệt không hỗ trợ đọc âm mẫu!", 'warning');
    }
  };

  // Profile Switching & Adding
  const switchProfile = (profile: string) => {
    setActiveProfile(profile);
    localStorage.setItem('ai_english_active_profile', profile);
    triggerToast(`Đã chuyển sang hồ sơ: ${profile}`, 'success');
  };

  const createProfile = () => {
    const name = newProfileNameInput.trim();
    if (!name) return;
    if (profiles.includes(name)) {
      triggerToast('Tên hồ sơ này đã tồn tại!', 'warning');
      return;
    }

    const updated = [...profiles, name];
    setProfiles(updated);
    localStorage.setItem('ai_english_profiles', JSON.stringify(updated));
    setActiveProfile(name);
    localStorage.setItem('ai_english_active_profile', name);
    
    setNewProfileNameInput('');
    setShowAddProfileModal(false);
    triggerToast(`Đã tạo hồ sơ mới: ${name}`, 'success');
  };

  // Cleaning History
  const clearHistory = async () => {
    setStudyHistory([]);
    setCurrentStreak(0);
    localStorage.removeItem(`ai_english_history_${activeProfile}`);
    localStorage.setItem(`ai_english_streak_${activeProfile}`, '0');

    if (hasCloud && supabase) {
      try {
        await supabase
          .from('ai_english_history')
          .delete()
          .eq('profile_name', activeProfile);
      } catch (e) {
        console.error(e);
      }
    }
    triggerToast('Đã làm sạch lịch sử của profile!', 'success');
  };

  const clearVocab = async () => {
    setVocabList([]);
    localStorage.removeItem(`ai_english_vocab_${activeProfile}`);

    if (hasCloud && supabase) {
      try {
        await supabase
          .from('ai_english_vocab')
          .delete()
          .eq('profile_name', activeProfile);
      } catch (e) {
        console.error(e);
      }
    }
    triggerToast('Đã xóa toàn bộ sổ tay từ vựng!', 'success');
  };

  return (
    <div className="min-h-screen text-slate-800 font-sans bg-slate-50 flex flex-col justify-between">
      {/* HEADER NAV */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link 
            href="/" 
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <Home className="w-5 h-5" />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">AI Platform</span>
            <span className="font-extrabold text-base flex items-center gap-1.5 text-blue-600">
              <Languages className="w-5 h-5" /> AI English Mentor
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cloud Status Indicator */}
          <button 
            onClick={() => setShowConfigModal(true)}
            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition ${
              hasCloud 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' 
                : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            }`}
          >
            {hasCloud ? <Cloud className="w-4 h-4 text-emerald-500" /> : <CloudOff className="w-4 h-4 text-amber-500" />}
            <span>{hasCloud ? 'Cloud Synced' : 'Local Storage'}</span>
          </button>

          {/* Profile Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProfileDropdownOpen(!profileDropdownOpen);
              }}
              className="flex items-center gap-2 bg-slate-100 border border-slate-200/80 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-200/80 transition"
            >
              <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                {activeProfile[0].toUpperCase()}
              </div>
              <span>{activeProfile}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2.5 animate-fadeInUp">
                <div className="px-4 py-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-50 mb-1.5">
                  Chọn hồ sơ học tập
                </div>
                {profiles.map(p => (
                  <button
                    key={p}
                    onClick={() => switchProfile(p)}
                    className={`w-full text-left px-4 py-2 text-sm font-semibold hover:bg-slate-50 flex items-center justify-between ${
                      p === activeProfile ? 'text-blue-600 bg-blue-50/30' : 'text-slate-700'
                    }`}
                  >
                    <span>{p}</span>
                    {p === activeProfile && <CheckCircle className="w-4 h-4 text-blue-500" />}
                  </button>
                ))}
                <div className="border-t border-slate-50 mt-2 pt-2 px-2">
                  <button
                    onClick={() => setShowAddProfileModal(true)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" /> Thêm hồ sơ mới
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 items-start flex-grow">
        
        {/* CỘT TRÁI: HỌC TẬP CHÍNH */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* TOPIC BADGE AREA */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> <span>{currentTopic}</span>
              </span>
              <span className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5" /> <span>{currentTone}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <select 
                value={topicSelection}
                onChange={(e) => {
                  setTopicSelection(e.target.value);
                  setTimeout(() => handleGenerateQuestion(), 100);
                }}
                className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer transition"
              >
                <option value="random">🎲 Đổi chủ đề ngẫu nhiên</option>
                {TOPICS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button 
                onClick={handleGenerateQuestion}
                disabled={isLoadingQuestion}
                className="bg-blue-50 text-blue-600 p-2.5 rounded-xl text-xs font-bold hover:bg-blue-100 transition shadow-sm disabled:opacity-50"
                title="Tải câu tình huống mới"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingQuestion ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* QUESTION BOX */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2.5 h-full bg-blue-600"></div>
            <div className="flex items-center gap-2 mb-4 text-blue-600 font-extrabold pl-2">
              <Languages className="w-5 h-5" />
              <span>Tình huống thực tế cần dịch:</span>
            </div>
            
            {isLoadingQuestion ? (
              <div className="flex items-center gap-2 text-slate-400 font-medium py-3 pl-2 animate-pulse">
                <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                <span className="text-sm sm:text-base">AI đang thiết lập tình huống giao tiếp đời thực...</span>
              </div>
            ) : (
              <div className="text-lg sm:text-xl text-slate-800 leading-relaxed font-bold mb-4 pl-2">
                {currentQuestion}
              </div>
            )}
            
            <div className="text-xs text-slate-400 italic pl-2 flex items-start gap-1.5">
              <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
              <span>Dịch câu nói trên theo văn phong tự nhiên đời sống hằng ngày của người bản xứ. Bạn có thể bôi đen bất kỳ chữ tiếng Anh nào để tra nghĩa nhanh!</span>
            </div>
          </div>

          {/* INPUT FORM */}
          <div className="space-y-4">
            <div className="flex justify-between items-center ml-1">
              <label className="block text-sm font-bold text-slate-700">Bản dịch tiếng Anh của bạn:</label>
              <span className="text-xs text-slate-400">{userTranslation.length} ký tự</span>
            </div>
            <textarea 
              value={userTranslation}
              onChange={(e) => setUserTranslation(e.target.value)}
              rows={3} 
              className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-base sm:text-lg resize-none shadow-inner bg-white font-medium" 
              placeholder="Nhập câu dịch tiếng Anh của bạn tại đây..."
            />
            
            <button 
              onClick={handleCheckAnswer}
              disabled={isLoadingCheck || !userTranslation.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg transform active:scale-[0.98] transition shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
            >
              <Send className="w-5 h-5" /> Gửi Chấm Điểm AI
            </button>
          </div>

          {/* FEEDBACK RESULT AREA */}
          {resultVisible && (
            <div id="resultCard" className="space-y-4 animate-fadeInUp">
              <div className="flex items-center gap-2 mt-6">
                <div className="h-px bg-slate-200 flex-grow"></div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Phân tích chuyên sâu từ AI Mentor</span>
                <div className="h-px bg-slate-200 flex-grow"></div>
              </div>

              <div className={`bg-white rounded-2xl p-6 border-l-[10px] border border-slate-100 shadow-sm ${
                aiScore >= 80 ? 'border-l-emerald-500' : aiScore >= 50 ? 'border-l-amber-500' : 'border-l-rose-500'
              }`}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                  <div className="text-lg font-extrabold text-slate-800">{aiTitle}</div>
                  <div className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${
                    aiScore >= 80 ? 'bg-emerald-50 text-emerald-700' : aiScore >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    Điểm: {aiScore}/100
                  </div>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">Cách dịch tự nhiên nhất đề xuất:</p>
                      <button 
                        onClick={() => speakText(aiSuggestion)} 
                        className="text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1 rounded-lg font-bold flex items-center gap-1 transition"
                      >
                        <Volume2 className="w-3.5 h-3.5" /> Nghe đọc mẫu
                      </button>
                    </div>
                    <p className="text-emerald-800 font-bold text-lg bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 shadow-sm leading-relaxed">
                      {aiSuggestion}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs text-slate-400 mb-1.5 font-extrabold uppercase tracking-wider">Nhận xét chi tiết &amp; sửa đổi ngữ pháp:</p>
                    <div className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm whitespace-pre-line">
                      {aiExplanation}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </section>

        {/* CỘT PHẢI: TIẾN TRÌNH & BỘ SƯU TẬP */}
        <aside className="lg:col-span-5 space-y-6">
          
          {/* STATS PROGRESS CARD */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wide">Tiến độ ngày học (Hồ sơ: {activeProfile})</div>
                <div className="text-sm font-bold text-slate-700 mt-0.5">
                  {currentStreak >= 5 ? (
                    <span className="text-emerald-600 font-extrabold">🎉 Đủ chuỗi 5 câu hôm nay!</span>
                  ) : (
                    <span>Cần học thêm {5 - currentStreak} bài ({currentStreak}/5)</span>
                  )}
                </div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden relative">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${Math.min((currentStreak / 5) * 100, 100)}%` }} 
              />
            </div>
          </div>

          {/* QUICK DASHBOARD GOLD BOARD */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <h3 className="font-extrabold text-sm uppercase tracking-wider mb-4 text-blue-300">Bảng vàng tích lũy</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="text-xs text-slate-400">Câu thoại tích lũy</div>
                <div className="text-2xl font-black text-amber-400 mt-1">{studyHistory.length}</div>
              </div>
              <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                <div className="text-xs text-slate-400">Sổ tay từ vựng</div>
                <div className="text-2xl font-black text-blue-300 mt-1">{vocabList.length}</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs text-slate-400">
              <span>Hồ sơ đang dùng:</span>
              <span className="bg-blue-600 text-white px-2.5 py-1 rounded-full font-bold uppercase tracking-wide">
                {activeProfile}
              </span>
            </div>
          </div>

          {/* TABS CONTAINER */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
            {/* Tabs Selector */}
            <div className="flex border-b border-slate-100">
              <button 
                onClick={() => setActiveTab('sentences')}
                className={`flex-1 py-2 text-center text-sm font-bold border-b-2 transition outline-none ${
                  activeTab === 'sentences' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Languages className="inline-block w-4 h-4 mr-1.5" /> Câu thoại ({studyHistory.length})
              </button>
              <button 
                onClick={() => setActiveTab('vocab')}
                className={`flex-1 py-2 text-center text-sm font-bold border-b-2 transition outline-none ${
                  activeTab === 'vocab' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <BookOpen className="inline-block w-4 h-4 mr-1.5" /> Sổ tay từ ({vocabList.length})
              </button>
            </div>

            {/* TAB 1: SENTENCES LIST */}
            {activeTab === 'sentences' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 italic">Mặc định ẩn câu tiếng Anh để tự ôn luyện nhẩm</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setConfirmModalData({
                          title: 'Xóa toàn bộ lịch sử',
                          message: 'Bạn có chắc chắn muốn làm sạch toàn bộ dữ liệu học tập đã tích lũy của hồ sơ này không? Hành động này không thể hoàn tác.',
                          onConfirm: () => clearHistory()
                        });
                        setShowConfirmModal(true);
                      }} 
                      className="text-[10px] text-rose-500 hover:underline font-bold"
                    >
                      Xóa lịch sử
                    </button>
                    <button 
                      onClick={() => setAllTranslationsVisible(!allTranslationsVisible)} 
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-2.5 py-0.5 rounded transition"
                    >
                      {allTranslationsVisible ? 'Ẩn tất cả' : 'Hiện tất cả'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {studyHistory.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 italic text-sm">Chưa có câu nào được lưu.</p>
                  ) : (
                    studyHistory.map((item, index) => (
                      <div key={index} className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 bg-slate-50/50 shadow-inner group transition relative">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-grow pr-2">
                            <div className="text-[9px] font-bold text-blue-500 mb-1 uppercase tracking-tighter">{item.date}</div>
                            <div className="text-slate-800 font-bold mb-1.5 text-xs sm:text-sm">
                              <span className="text-blue-500 mr-1.5 font-bold">VN:</span> {item.vi}
                            </div>
                            
                            {(allTranslationsVisible || visibleTranslationIndices[index]) && (
                              <div className="text-emerald-600 font-extrabold text-xs sm:text-sm bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-100/50 mt-2 flex items-center justify-between gap-1.5 animate-fadeInUp">
                                <span><span className="text-emerald-400 mr-1.5 font-bold">EN:</span> {item.en}</span>
                                <button 
                                  onClick={() => speakText(item.en)} 
                                  className="text-emerald-600 hover:text-emerald-800 p-1 flex-shrink-0"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                          <button 
                            onClick={() => {
                              setVisibleTranslationIndices(prev => ({
                                ...prev,
                                [index]: !prev[index]
                              }));
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg bg-white border border-slate-100 transition shadow-sm flex-shrink-0"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              visibleTranslationIndices[index] ? 'rotate-180' : ''
                            }`} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: VOCABULARY LIST */}
            {activeTab === 'vocab' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-slate-400 italic">Mặc định ẩn nghĩa để tự ôn luyện nhẩm</p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setConfirmModalData({
                          title: 'Xóa sổ tay từ vựng',
                          message: 'Bạn có chắc chắn muốn xóa toàn bộ sổ tay từ vựng của hồ sơ này không? Hành động này không thể hoàn tác.',
                          onConfirm: () => clearVocab()
                        });
                        setShowConfirmModal(true);
                      }} 
                      className="text-[10px] text-rose-500 hover:underline font-bold"
                    >
                      Xóa sổ tay
                    </button>
                    <button 
                      onClick={() => setAllVocabTranslationsVisible(!allVocabTranslationsVisible)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold px-2.5 py-0.5 rounded transition"
                    >
                      {allVocabTranslationsVisible ? 'Ẩn tất cả' : 'Hiện tất cả'}
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                  {vocabList.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 italic text-sm">Chưa có từ vựng nào được lưu.</p>
                  ) : (
                    vocabList.map((item, index) => (
                      <div key={index} className="p-4 rounded-xl border border-slate-100 hover:border-emerald-200 bg-slate-50/50 shadow-inner transition relative">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-grow">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-extrabold text-blue-700 text-sm">{item.word}</span>
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-mono font-bold">
                                {item.phonetic}
                              </span>
                              <button onClick={() => speakText(item.word)} className="text-blue-500 hover:text-blue-700 p-0.5">
                                <Volume2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            
                            {(allVocabTranslationsVisible || visibleVocabIndices[index]) && (
                              <div className="text-slate-600 text-xs font-semibold pt-1 border-t border-slate-100 mt-1.5 animate-fadeInUp">
                                {item.translation}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setVisibleVocabIndices(prev => ({
                                  ...prev,
                                  [index]: !prev[index]
                                }));
                              }}
                              className="text-slate-400 hover:text-blue-600 p-1.5 rounded-lg bg-white border border-slate-100 transition shadow-sm"
                            >
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                visibleVocabIndices[index] ? 'rotate-180' : ''
                              }`} />
                            </button>
                            <button 
                              onClick={async () => {
                                const updated = vocabList.filter(v => v.word !== item.word);
                                setVocabList(updated);
                                localStorage.setItem(`ai_english_vocab_${activeProfile}`, JSON.stringify(updated));
                                if (hasCloud && supabase) {
                                  try {
                                    await supabase.from('ai_english_vocab').delete().eq('profile_name', activeProfile).eq('word', item.word);
                                  } catch (e) { console.error(e); }
                                }
                                triggerToast('Đã xóa từ vựng', 'success');
                              }}
                              className="text-slate-300 hover:text-rose-500 p-1.5 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

          </div>

        </aside>
      </main>

      {/* AUDIO WAVE FLOATING BAR */}
      {isPlayingAudio && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900/95 backdrop-blur-md text-white px-6 py-3.5 rounded-full shadow-2xl border border-slate-800 z-50 flex items-center gap-4 animate-fadeInUp w-[calc(100%-32px)] sm:w-auto">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full animate-pulse"></span>
            <span className="w-1.5 h-6 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.15s' }}></span>
            <span className="w-1.5 h-3 bg-blue-600 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></span>
            <span className="w-1.5 h-5 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '0.45s' }}></span>
          </div>
          <div className="text-xs font-semibold tracking-wider text-slate-300 flex flex-col">
            <span className="text-[10px] uppercase text-blue-400 font-bold">Đang phát âm mẫu</span>
            <span className="max-w-[150px] truncate">{playingAudioText}</span>
          </div>
          <button 
            onClick={() => {
              window.speechSynthesis.cancel();
              setIsPlayingAudio(false);
            }} 
            className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition w-8 h-8 flex items-center justify-center"
            title="Dừng đọc"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SELECTION POPUP WORD LOOKUP */}
      {selectionPosition.show && (
        <div 
          ref={selectionPopupRef}
          className="fixed z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 max-w-[280px] w-full transform scale-100 transition-all duration-200"
          style={{
            top: `${selectionPosition.top}px`,
            left: `${selectionPosition.left}px`,
          }}
        >
          {selectionPosition.arrowDown && (
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-slate-200 rotate-45"></div>
          )}
          <div className="relative z-10 space-y-3">
            <div className="flex items-start justify-between gap-1.5">
              <span className="font-extrabold text-blue-700 text-base truncate pr-2">{selectedWord}</span>
              <button 
                onClick={() => speakText(selectedWord)} 
                className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg text-xs transition flex items-center justify-center w-7 h-7"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
            
            {isLoadingLookup ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 font-medium py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>AI đang phân tích nghĩa nhanh...</span>
              </div>
            ) : lookupResult ? (
              <div className="space-y-2">
                <div className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded font-mono font-bold w-fit">
                  {lookupResult.phonetic}
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-semibold border-t border-slate-100 pt-1.5">
                  {lookupResult.translation}
                </div>
              </div>
            ) : null}

            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
              <button 
                onClick={saveSelectedWord}
                disabled={isLoadingLookup || !lookupResult}
                className="text-[10px] text-emerald-600 hover:text-emerald-800 disabled:opacity-50 font-bold flex items-center gap-1"
              >
                <Star className="w-3 h-3 fill-current" /> Lưu sổ tay
              </button>
              <button 
                onClick={() => setSelectionPosition(prev => ({ ...prev, show: false }))} 
                className="text-[10px] text-slate-400 hover:text-slate-600 font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIG */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 transform scale-100 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" /> Trạng thái Đồng bộ Đám mây
              </h3>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                {hasCloud ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-emerald-800">Đã kết nối với Cloud</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Dữ liệu đang được đồng bộ tự động lên Supabase Database.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-amber-800">Đang lưu trữ Offline</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Lưu trữ trên trình duyệt (LocalStorage). Học trên máy tính sẽ không đồng bộ sang điện thoại.</p>
                    </div>
                  </>
                )}
              </div>

              {!hasCloud && (
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-xs leading-relaxed space-y-1.5">
                  <p className="font-bold text-blue-800 flex items-center gap-1">
                    <Info className="w-4 h-4" /> Cách kích hoạt đồng bộ đám mây:
                  </p>
                  <p>Mở file <code className="font-mono bg-blue-100 px-1 py-0.5 rounded text-blue-900">.env.local</code> ở thư mục gốc của dự án và điền đầy đủ các thông tin:</p>
                  <ul className="list-disc list-inside space-y-1 font-mono text-[10px] text-slate-500 bg-white p-2 rounded border border-blue-50">
                    <li>NEXT_PUBLIC_SUPABASE_URL=...</li>
                    <li>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</li>
                    <li>GEMINI_API_KEY=...</li>
                  </ul>
                  <p className="mt-2 text-slate-400">Sau khi điền key và khởi động lại Server (hoặc deploy lại trên Vercel), dữ liệu sẽ được tự động đồng bộ mà không cần cấu hình thêm!</p>
                </div>
              )}
            </div>
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 transform scale-100 transition-all duration-300">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{confirmModalData.title}</h3>
            <p className="text-slate-600 text-sm mb-6">{confirmModalData.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={() => {
                  confirmModalData.onConfirm();
                  setShowConfirmModal(false);
                }} 
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD PROFILE MODAL */}
      {showAddProfileModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 transform scale-100 transition-all duration-300">
            <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-500" /> Tạo hồ sơ mới
              </h3>
              <button onClick={() => setShowAddProfileModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">Tên hồ sơ mới:</label>
                <input 
                  type="text" 
                  value={newProfileNameInput}
                  onChange={(e) => setNewProfileNameInput(e.target.value)}
                  placeholder="Nhập tên người học (ví dụ: Thiên, Hảo Hảo...)"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-semibold"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setShowAddProfileModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={createProfile}
                disabled={!newProfileNameInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition"
              >
                Tạo hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM CONTAINER */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full px-4">
        {toasts.map(t => (
          <div 
            key={t.id}
            className={`p-4 rounded-xl shadow-lg border-l-4 flex items-center justify-between gap-3 text-sm font-semibold mb-2 bg-white/95 backdrop-blur border border-slate-100 animate-fadeInUp ${
              t.type === 'success' 
                ? 'border-l-emerald-500 text-emerald-800' 
                : t.type === 'warning' 
                  ? 'border-l-amber-500 text-amber-800' 
                  : 'border-l-rose-500 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {t.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              ) : t.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              )}
              <span>{t.message}</span>
            </div>
          </div>
        ))}
      </div>

      <footer className="text-center py-6 text-xs text-slate-400 border-t border-slate-200 bg-white">
        <p>&copy; 2026 Do Van Thien. Built with premium Next.js & Supabase integration.</p>
      </footer>
    </div>
  );
}
