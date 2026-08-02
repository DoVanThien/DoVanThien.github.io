'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Home, Sparkles, Cloud, CloudOff, Languages, Tag, RefreshCw, 
  Send, Volume2, VolumeX, Brain, Shuffle, BookOpen, 
  Trash2, FileJson, FileInput, Plus, Star, X, Info, ChevronDown, CheckCircle, AlertTriangle, Mic, MicOff
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
  "Lịch sự, tự nhiên (đồng nghiệp/đối tác)",
  "Thân mật, nói đùa, dùng từ lóng hàng ngày",
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

interface EssayHistoryItem {
  id?: string;
  title: string;
  promptVi: string;
  userEssay: string;
  bandScore: string;
  taskAchievement: number;
  coherenceCohesion: number;
  lexicalResource: number;
  grammarAccuracy: number;
  nativeRewrite: string;
  feedbackVi: string;
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
  const [essayHistory, setEssayHistory] = useState<EssayHistoryItem[]>([]);
  const [vocabList, setVocabList] = useState<VocabItem[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  
  const [allTranslationsVisible, setAllTranslationsVisible] = useState(false);
  const [visibleTranslationIndices, setVisibleTranslationIndices] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'sentences' | 'vocab'>('sentences');
  const [allVocabTranslationsVisible, setAllVocabTranslationsVisible] = useState(false);
  const [visibleVocabIndices, setVisibleVocabIndices] = useState<Record<number, boolean>>({});
  
  // CEFR Level & Study Mode
  const [userLevel, setUserLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('B1');
  const [studyMode, setStudyMode] = useState<'spoken' | 'writing'>('spoken');

  // Writing Challenge States
  const [writingTask, setWritingTask] = useState<{
    title: string;
    promptVi: string;
    guidingQuestions: string[];
    minWords: number;
    maxWords: number;
  } | null>(null);
  const [userEssay, setUserEssay] = useState('');
  const [isLoadingWritingTask, setIsLoadingWritingTask] = useState(false);
  const [isLoadingWritingCheck, setIsLoadingWritingCheck] = useState(false);
  const [writingResult, setWritingResult] = useState<{
    bandScore: string;
    taskAchievement: number;
    coherenceCohesion: number;
    lexicalResource: number;
    grammarAccuracy: number;
    nativeRewrite: string;
    feedbackVi: string;
  } | null>(null);

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
  
  // Voice Input Speech-to-Text State & Handler
  const [isListening, setIsListening] = useState(false);

  const startVoiceInput = (target: 'spoken' | 'writing') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      triggerToast('Trình duyệt chưa hỗ trợ nhận diện giọng nói (Web Speech API). Hãy sử dụng Google Chrome hoặc Microsoft Edge!', 'warning');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        triggerToast('🎙️ Đang lắng nghe giọng nói tiếng Anh của bạn...', 'success');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (target === 'spoken') {
          setUserTranslation(prev => (prev ? prev + ' ' + transcript : transcript));
        } else {
          setUserEssay(prev => (prev ? prev + ' ' + transcript : transcript));
        }
        setIsListening(false);
        triggerToast('✅ Đã chuyển giọng nói thành văn bản thành công!', 'success');
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        triggerToast('Lỗi nhận diện giọng nói. Vui lòng nói lại rõ ràng hơn!', 'error');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Toast triggers
  const triggerToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3800);
  };

  const changeUserLevel = async (lvl: 'A1' | 'A2' | 'B1' | 'B2' | 'C1') => {
    setUserLevel(lvl);
    triggerToast(`Đã chuyển trình độ mục tiêu sang Level ${lvl}!`, 'success');

    if (hasCloud && supabase) {
      try {
        await supabase
          .from('ai_english_profiles')
          .upsert({
            profile_name: activeProfile,
            user_level: lvl,
            updated_at: new Date().toISOString()
          }, { onConflict: 'profile_name' });
      } catch (e) {
        console.error('Error updating level in Supabase:', e);
      }
    }
  };

  const handleGenerateWritingTask = async () => {
    setIsLoadingWritingTask(true);
    setWritingResult(null);
    setUserEssay('');

    try {
      const systemPrompt = `Bạn là giám khảo chuyên nghiệp chấm thi viết tiếng Anh (IELTS / Cambridge Writing Specialist).
Nhiệm vụ: Tạo 1 đề thi viết đoạn văn/bài luận ngắn bằng tiếng Việt phù hợp với trình độ tiếng Anh ${userLevel} của học viên.

Yêu cầu đề thi:
- Chủ đề chính: "${currentTopic}".
- Trình độ target: "${userLevel}".
- Đề bài phải hấp dẫn, liên quan tới bối cảnh đời sống/công sở thực tế, yêu cầu người học viết đoạn văn (80-150 từ) bằng tiếng Anh.
- Nêu rõ 3 gợi ý câu hỏi chính mà bài viết cần đáp ứng.

Trả về dữ liệu dưới dạng JSON có cấu trúc:
{
  "title": "Tiêu đề bài thi viết",
  "promptVi": "Nội dung đề bài chi tiết bằng tiếng Việt",
  "guidingQuestions": ["Gợi ý 1", "Gợi ý 2", "Gợi ý 3"],
  "minWords": 80,
  "maxWords": 150
}`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': 'ai-english-mentor-secure-v2'
        },
        body: JSON.stringify({
          prompt: `Tạo đề thi viết essay chủ đề ${currentTopic}`,
          systemPrompt,
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              promptVi: { type: "STRING" },
              guidingQuestions: { type: "ARRAY", items: { type: "STRING" } },
              minWords: { type: "NUMBER" },
              maxWords: { type: "NUMBER" }
            },
            required: ["title", "promptVi", "guidingQuestions", "minWords", "maxWords"]
          }
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);

      setWritingTask(result);
      setIsLoadingWritingTask(false);
    } catch (err: any) {
      triggerToast('Lỗi tạo đề thi viết: ' + err.message, 'error');
      setIsLoadingWritingTask(false);
    }
  };

  const handleCheckWritingEssay = async () => {
    if (!userEssay.trim()) {
      triggerToast('Vui lòng nhập bài viết essay của bạn trước khi nộp!', 'warning');
      return;
    }

    setIsLoadingWritingCheck(true);

    try {
      const systemPrompt = `Bạn là giám khảo chuyên nghiệp chấm thi viết tiếng Anh (IELTS/Cambridge Writing Examiner).
Nhiệm vụ: Chấm điểm bài viết luận/đoạn văn của học viên dựa trên đề bài: "${writingTask?.promptVi || currentTopic}".
Trình độ kỳ vọng của học viên: "${userLevel}".

Học viên đã nộp bài viết tiếng Anh sau:
"${userEssay}"

YÊU CẦU ĐÁNH GIÁ CHUYÊN SÂU:
1. "bandScore": Thang điểm Band (VD: "Band 6.5 / Level ${userLevel}").
2. "taskAchievement": Điểm khả năng đáp ứng đề bài (0-100).
3. "coherenceCohesion": Điểm mạch luận, kết nối câu và đoạn văn (0-100).
4. "lexicalResource": Điểm vốn từ vựng & collocations (0-100).
5. "grammarAccuracy": Điểm ngữ pháp và đa dạng cấu trúc (0-100).
6. "nativeRewrite": Bản viết lại toàn bộ bài essay sao cho hoàn hảo, tự nhiên nhất như người bản xứ hoặc bài mẫu Band 8.0+.
7. "feedbackVi": Nhận xét chi tiết bằng tiếng Việt: Chỉ rõ ưu điểm, từ nối hay, lỗi sai cần khắc phục và bí quyết nâng band điểm.

Trả về JSON như cấu trúc yêu cầu.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-app-signature': 'ai-english-mentor-secure-v2'
        },
        body: JSON.stringify({
          prompt: `Chấm bài viết essay tiếng Anh: "${userEssay}"`,
          systemPrompt,
          responseSchema: {
            type: "OBJECT",
            properties: {
              bandScore: { type: "STRING" },
              taskAchievement: { type: "NUMBER" },
              coherenceCohesion: { type: "NUMBER" },
              lexicalResource: { type: "NUMBER" },
              grammarAccuracy: { type: "NUMBER" },
              nativeRewrite: { type: "STRING" },
              feedbackVi: { type: "STRING" }
            },
            required: ["bandScore", "taskAchievement", "coherenceCohesion", "lexicalResource", "grammarAccuracy", "nativeRewrite", "feedbackVi"]
          }
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);

      setWritingResult(result);
      setIsLoadingWritingCheck(false);

      const newEssayItem: EssayHistoryItem = {
        title: writingTask?.title || "Bài Thi Viết Essay",
        promptVi: writingTask?.promptVi || "",
        userEssay: userEssay.trim(),
        bandScore: result.bandScore || "Band 6.5",
        taskAchievement: result.taskAchievement || 80,
        coherenceCohesion: result.coherenceCohesion || 80,
        lexicalResource: result.lexicalResource || 80,
        grammarAccuracy: result.grammarAccuracy || 80,
        nativeRewrite: result.nativeRewrite || "",
        feedbackVi: result.feedbackVi || "",
        date: new Date().toLocaleDateString('vi-VN'),
        profile_name: activeProfile
      };

      const updatedEssayHistory = [newEssayItem, ...essayHistory];
      setEssayHistory(updatedEssayHistory);

      const newStreak = currentStreak + 1;
      const newMaxStreak = Math.max(maxStreak, newStreak);
      setCurrentStreak(newStreak);
      setMaxStreak(newMaxStreak);

      if (hasCloud && supabase) {
        try {
          await supabase.from('ai_english_essay_history').insert({
            profile_name: activeProfile,
            title: newEssayItem.title,
            prompt_vi: newEssayItem.promptVi,
            user_essay: newEssayItem.userEssay,
            band_score: newEssayItem.bandScore,
            task_achievement: newEssayItem.taskAchievement,
            coherence_cohesion: newEssayItem.coherenceCohesion,
            lexical_resource: newEssayItem.lexicalResource,
            grammar_accuracy: newEssayItem.grammarAccuracy,
            native_rewrite: newEssayItem.nativeRewrite,
            feedback_vi: newEssayItem.feedbackVi
          });

          await supabase.from('ai_english_profiles').upsert({
            profile_name: activeProfile,
            user_level: userLevel,
            current_streak: newStreak,
            max_streak: newMaxStreak,
            updated_at: new Date().toISOString()
          }, { onConflict: 'profile_name' });
        } catch (e) {
          console.error(e);
        }
      }

      triggerToast('🎉 Đã chấm xong bài viết Essay của bạn!', 'success');
    } catch (err: any) {
      triggerToast('Lỗi chấm bài thi viết: ' + err.message, 'error');
      setIsLoadingWritingCheck(false);
    }
  };

  // Load Profiles & Config from Supabase
  const loadProfiles = async () => {
    if (hasCloud && supabase) {
      try {
        const { data, error } = await supabase
          .from('ai_english_profiles')
          .select('profile_name')
          .order('profile_name', { ascending: true });
        
        if (!error && data && data.length > 0) {
          const names = data.map(row => row.profile_name);
          setProfiles(names);
          if (!names.includes(activeProfile)) {
            setActiveProfile(names[0]);
          }
          return;
        }
      } catch (err) {
        console.error('Error loading profiles:', err);
      }
    }
    setProfiles(['Miliket', 'Omachi']);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // Fetch data directly from Supabase
  const loadDataForProfile = async (profileName: string) => {
    if (hasCloud && supabase) {
      try {
        // 1. Profile metadata (level, streak, max_streak)
        const { data: profileData } = await supabase
          .from('ai_english_profiles')
          .select('*')
          .eq('profile_name', profileName)
          .maybeSingle();

        if (profileData) {
          setUserLevel(profileData.user_level || 'B1');
          setCurrentStreak(profileData.current_streak || 0);
          setMaxStreak(profileData.max_streak || 0);
        } else {
          await supabase.from('ai_english_profiles').insert({
            profile_name: profileName,
            user_level: 'B1',
            current_streak: 0,
            max_streak: 0
          });
          setUserLevel('B1');
          setCurrentStreak(0);
          setMaxStreak(0);
        }

        // 2. Fetch history
        const { data: cloudHistory } = await supabase
          .from('ai_english_history')
          .select('*')
          .eq('profile_name', profileName)
          .order('created_at', { ascending: false });
          
        if (cloudHistory) {
          const formattedHistory: HistoryItem[] = cloudHistory.map(row => ({
            id: row.id,
            vi: row.vietnamese_text,
            en: row.english_translation,
            date: new Date(row.created_at).toLocaleDateString('vi-VN'),
            profile_name: row.profile_name
          }));
          setStudyHistory(formattedHistory);
        } else {
          setStudyHistory([]);
        }

        // 3. Fetch essay history
        const { data: cloudEssayHistory } = await supabase
          .from('ai_english_essay_history')
          .select('*')
          .eq('profile_name', profileName)
          .order('created_at', { ascending: false });

        if (cloudEssayHistory) {
          const formattedEssay: EssayHistoryItem[] = cloudEssayHistory.map(row => ({
            id: row.id,
            title: row.title || 'Bài Thi Viết Essay',
            promptVi: row.prompt_vi || '',
            userEssay: row.user_essay || '',
            bandScore: row.band_score || 'Band 6.5',
            taskAchievement: row.task_achievement || 80,
            coherenceCohesion: row.coherence_cohesion || 80,
            lexicalResource: row.lexical_resource || 80,
            grammarAccuracy: row.grammar_accuracy || 80,
            nativeRewrite: row.native_rewrite || '',
            feedbackVi: row.feedback_vi || '',
            date: new Date(row.created_at).toLocaleDateString('vi-VN'),
            profile_name: row.profile_name
          }));
          setEssayHistory(formattedEssay);
        } else {
          setEssayHistory([]);
        }

        // 4. Fetch vocab
        const { data: cloudVocab } = await supabase
          .from('ai_english_vocab')
          .select('*')
          .eq('profile_name', profileName)
          .order('created_at', { ascending: false });
          
        if (cloudVocab) {
          const formattedVocab: VocabItem[] = cloudVocab.map(row => ({
            id: row.id,
            word: row.word,
            phonetic: row.phonetic,
            translation: row.translation,
            date: new Date(row.created_at).toLocaleDateString('vi-VN'),
            profile_name: row.profile_name
          }));
          setVocabList(formattedVocab);
        } else {
          setVocabList([]);
        }
      } catch (err) {
        console.error('Fetch data from Supabase failed:', err);
      }
    }
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

  // Save word to Supabase
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
      const systemPrompt = `Bạn là chuyên gia ngôn ngữ tiếng Anh & tiếng Việt giao tiếp khẩu ngữ đời thực (Real-life Spoken Language Expert).
      Nhiệm vụ: Tạo ra DUY NHẤT 1 tình huống tiếng Việt KHẨU NGỮ GIAO TIẾP ĐỜI THƯỜNG mà người Việt thực sự thốt ra khi nói chuyện ngoài đời.

      QUY TẮC BẮT BUỘC VỀ CÂU THOẠI TIẾNG VIỆT:
      1. Chủ đề: "${chosenTopic}".
      2. Bối cảnh/Sắc thái: "${chosenTone}".
      3. TRÌNH ĐỘ CEFR MỤC TIÊU: "${userLevel}". Cấu trúc từ vựng và câu tạo ra phải vừa vặn phù hợp với độ khó của trình độ ${userLevel} (A1: cực đơn giản, A2: cơ bản, B1: trung cấp đời sống, B2: khá giỏi công sở, C1: nâng cao từ vựng sắc sảo).
      4. ĐỘ DÀI ĐAN XEN LINH HOẠT (LÚC NGẮN LÚC DÀI):
         - Đan xen ngẫu nhiên giữa câu NGẮN (bày tỏ phản xạ nhanh, từ 6 - 12 từ) và tình huống DÀI HƠN CÓ GIẢI THÍCH (từ 15 - 30 từ).
         - Khi câu DÀI giải thích tình huống: phải là lời giải thích bằng văn nói truyền miệng đời thực (gồm 1-2 câu ngắn nối tiếp nhau tự nhiên), KHÔNG ĐƯỢC khô cứng như văn viết.
      5. VĂN NÓI KHẨU NGỮ NGUYÊN BẢN 100%:
         - BẮT BUỘC dùng văn phong giao tiếp hàng ngày của người Việt: có thán từ (trời ơi, ê, thôi xong, thiệt tình, tự nhiên...), trợ từ (nha, á, nè, xíu, coi, hú, cày, bao, đuối, vội, hả, với...).
         - Sử dụng từ nối khẩu ngữ tự nhiên khi giải thích (Chuyện là..., Tự nhiên..., Nói nghe nè..., Tưởng đâu... ai ngờ..., Chẳng hiểu sao..., Thề luôn...).
         - TUYỆT ĐỐI TRÁNH văn viết trang trọng, từ ngữ sách giáo khoa gượng gạo (VD TRÁNH: "Tôi rất tiếc khi phải thông báo...", "Tôi đang gặp trục trặc kỹ thuật...").
      6. VÍ DỤ MINH HỌA (ĐAN XEN NGẮN & DÀI):
         [Ví dụ tình huống ngắn]:
         + "Trời ơi kẹt xe cứng ngắc rồi, chắc trễ họp quá!"
         + "Ê tí đi ăn trưa nhớ hú tao với nha!"
         + "Alo anh ship tới đâu rồi, em đang vội đi họp gấp nè!"
         [Ví dụ tình huống dài có giải thích bối cảnh]:
         + "Nói nghe nè, tối qua đang cày báo cáo thì tự nhiên máy tính sập nguồn cái rụi, làm mất sạch dữ liệu chưa kịp lưu luôn á! Giờ không biết sao làm cho kịp deadline nữa..."
         + "Chuyện là tuần sau em có chuyến công tác đột xuất ở Đà Nẵng, mà giờ lên web đặt vé máy bay thì thấy hết sạch chuyến giờ đẹp rồi, bực ghê!"
         + "Tự nhiên hôm nay cái xe bị dở chứng đề máy không lên, phải dắt bộ cả km tìm tiệm sửa đuối muốn xỉu luôn!"

      Chỉ trả về dữ liệu đúng định dạng JSON có chứa trường "vietnamese_content" mô tả tình huống tiếng Việt khẩu ngữ sinh động đó.`;

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
      const systemPrompt = `Bạn là chuyên gia ngôn ngữ tiếng Anh giao tiếp bản xứ (Native English Speaker & Communication Coach).
      Nhiệm vụ: Đánh giá câu dịch của học viên từ tiếng Việt sang tiếng Anh và đưa ra đáp án dịch mẫu ĐÃ ĐƯỢC CHUẨN HÓA VĂN NÓI BẢN XỨ (Native Spoken English).

      Câu gốc tiếng Việt (Văn nói): "${currentQuestion}"
      Trình độ CEFR Mục Tiêu Học Viên: "${userLevel}"

      YÊU CẦU ĐẶC BIỆT VỀ ĐÁP ÁN MẪU (suggestion):
      1. DÙNG TIẾNG ANH GIAO TIẾP ĐỜI THƯỜNG (Spoken English): Đáp án mẫu 'suggestion' bắt buộc phải là câu mà người bản xứ (Mỹ/Anh) thực sự mở miệng nói hàng ngày (dùng Phrasal Verbs, Collocations, Idioms, Slang đời sống) phù hợp với trình độ ${userLevel}.
      2. TUYỆT ĐỐI TRÁNH: Dịch thô từng từ (Chinglish/Việt-lish) hoặc dùng tiếng Anh trang trọng sách vở gượng gạo (Formal/Textbook English).
         - Ví dụ: Với câu "Trời ơi kẹt xe cứng ngắc rồi, chắc trễ họp quá!"
           + ĐÚNG NATIVE SPOKEN: "I'm stuck in bumper-to-bumper traffic, I'm gonna be late for the meeting!"
           + SAI/SÁCH VỞ: "I am experiencing heavy traffic jam, so I will be late for the meeting."

      YÊU CẦU ĐÁNH GIÁ & NHẬN XÉT:
      1. "score": Thang điểm 0-100 (Ưu tiên đánh giá cao các câu dịch dùng từ tự nhiên, chuẩn văn nói bản xứ hơn là đúng ngữ pháp sách vở mà cứng nhắc, đánh giá tương ứng với kỳ vọng ở trình độ ${userLevel}).
      2. "title": Tiêu đề ngắn phản ánh chất lượng (VD: "Rất tự nhiên!", "Chuẩn văn nói bản xứ!", "Cần tự nhiên hơn").
      3. "suggestion": 1 câu tiếng Anh chuẩn khẩu ngữ bản xứ nhất.
      4. "explanation": Nhận xét chi tiết bằng tiếng Việt: Chỉ rõ tại sao cách dùng từ của học viên đã tự nhiên hay chưa. Cung cấp thêm 1-2 cách nói bản xứ khác (VD: 1 cách thân mật xuề xòa & 1 cách giao tiếp công sở tự nhiên) để học viên mở rộng vốn câu giao tiếp.

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

    const newStreak = currentStreak + 1;
    const newMaxStreak = Math.max(maxStreak, newStreak);
    setCurrentStreak(newStreak);
    setMaxStreak(newMaxStreak);

    if (hasCloud && supabase) {
      try {
        await supabase.from('ai_english_history').insert({
          profile_name: activeProfile,
          vietnamese_text: newHistory.vi,
          english_translation: newHistory.en
        });

        await supabase.from('ai_english_profiles').upsert({
          profile_name: activeProfile,
          user_level: userLevel,
          current_streak: newStreak,
          max_streak: newMaxStreak,
          updated_at: new Date().toISOString()
        }, { onConflict: 'profile_name' });
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

  // Profile Switching
  const switchProfile = (profile: string) => {
    setActiveProfile(profile);
    triggerToast(`Đã chuyển sang hồ sơ: ${profile}`, 'success');
  };

  const clearEssayHistory = async () => {
    setEssayHistory([]);
    if (hasCloud && supabase) {
      try {
        await supabase
          .from('ai_english_essay_history')
          .delete()
          .eq('profile_name', activeProfile);
      } catch (e) {
        console.error(e);
      }
    }
    triggerToast('Đã làm sạch lịch sử bài viết Essay!', 'success');
  };

  // Cleaning History
  const clearHistory = async () => {
    setStudyHistory([]);
    setCurrentStreak(0);

    if (hasCloud && supabase) {
      try {
        await supabase
          .from('ai_english_history')
          .delete()
          .eq('profile_name', activeProfile);

        await supabase
          .from('ai_english_profiles')
          .update({ current_streak: 0, updated_at: new Date().toISOString() })
          .eq('profile_name', activeProfile);
      } catch (e) {
        console.error(e);
      }
    }
    triggerToast('Đã làm sạch lịch sử của profile!', 'success');
  };

  const clearVocab = async () => {
    setVocabList([]);

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
      <header className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 z-40 px-2 sm:px-8 py-2 sm:py-3.5 flex items-center justify-between gap-1.5 sm:gap-4 shadow-sm max-w-full">
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider hidden xs:block">AI Platform</span>
            <span className="font-extrabold text-xs sm:text-lg flex items-center gap-1 sm:gap-2 text-blue-600">
              <Languages className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" /> 
              <span className="hidden sm:inline">AI English Mentor Pro</span>
              <span className="sm:hidden font-black text-xs text-blue-600">English Pro</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
          {/* STREAK BADGE DISPLAY */}
          <div className="flex items-center gap-1 px-1.5 py-1 sm:px-3 sm:py-1.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-200/80 text-amber-800 rounded-xl text-[11px] sm:text-xs font-extrabold shadow-sm flex-shrink-0">
            <span className="text-xs sm:text-sm">🔥</span>
            <span className="hidden sm:inline">{currentStreak} Ngày Streak</span>
            <span className="sm:hidden">{currentStreak}D</span>
          </div>

          {/* CEFR LEVEL BADGE & SELECTOR */}
          <div className="relative flex-shrink-0">
            <select
              value={userLevel}
              onChange={(e) => changeUserLevel(e.target.value as any)}
              className="bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[11px] sm:text-xs px-1.5 py-1 sm:px-3 sm:py-1.5 rounded-xl outline-none cursor-pointer hover:bg-indigo-100 transition shadow-sm"
              title="Nhấp để thay đổi trình độ mục tiêu"
            >
              <option value="A1">🎓 A1</option>
              <option value="A2">🎓 A2</option>
              <option value="B1">🎓 B1</option>
              <option value="B2">🎓 B2</option>
              <option value="C1">🎓 C1</option>
            </select>
          </div>

          {/* Profile Switcher Dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProfileDropdownOpen(!profileDropdownOpen);
              }}
              className="flex items-center gap-1 sm:gap-2 bg-slate-100 border border-slate-200/80 px-2 py-1 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-sm font-bold text-slate-700 hover:bg-slate-200/80 transition"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-black flex-shrink-0">
                {activeProfile[0].toUpperCase()}
              </div>
              <span className="font-bold text-slate-800 text-[11px] sm:text-sm">{activeProfile}</span>
              <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 flex-shrink-0" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-xs sm:max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-4 animate-fadeInUp space-y-3.5">
                {/* PROFILE LEVEL & PROGRESS CARD */}
                <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white p-4 rounded-xl space-y-3 shadow-inner">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">
                      Hồ Sơ: {activeProfile}
                    </span>
                    <span className="px-2.5 py-0.5 bg-indigo-500/30 border border-indigo-400/40 rounded-full text-[10px] font-black text-indigo-200">
                      Level {userLevel}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">Trình độ:</span>
                    <span className="text-amber-300">
                      {userLevel === 'A1' ? 'Sơ Cấp (Beginner)' :
                       userLevel === 'A2' ? 'Cơ Bản (Elementary)' :
                       userLevel === 'B1' ? 'Trung Cấp (Intermediate)' :
                       userLevel === 'B2' ? 'Khá Giỏi (Upper-Int)' : 'Nâng Cao (Advanced)'}
                    </span>
                  </div>

                  {/* STREAK STATS */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/10 text-xs">
                    <div className="bg-white/10 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-300">🔥 Current Streak</div>
                      <div className="font-black text-amber-300 text-sm">{currentStreak} Ngày</div>
                    </div>
                    <div className="bg-white/10 p-2 rounded-lg">
                      <div className="text-[10px] text-slate-300">🏆 Longest Streak</div>
                      <div className="font-black text-emerald-300 text-sm">{maxStreak} Ngày</div>
                    </div>
                  </div>

                  {/* THỐNG KÊ TÍCH LŨY */}
                  <div className="pt-2 border-t border-white/10 space-y-1">
                    <div className="text-[10px] text-indigo-300 font-extrabold uppercase tracking-wider">Thống Kê Tích Lũy</div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="bg-white/10 p-1.5 rounded-lg">
                        <div className="text-[9px] text-slate-300">🗣️ Câu thoại</div>
                        <div className="font-black text-amber-300 text-xs">{studyHistory.length}</div>
                      </div>
                      <div className="bg-white/10 p-1.5 rounded-lg">
                        <div className="text-[9px] text-slate-300">✍️ Bài Essay</div>
                        <div className="font-black text-purple-300 text-xs">{essayHistory.length}</div>
                      </div>
                      <div className="bg-white/10 p-1.5 rounded-lg">
                        <div className="text-[9px] text-slate-300">📖 Sổ từ vựng</div>
                        <div className="font-black text-blue-300 text-xs">{vocabList.length}</div>
                      </div>
                    </div>
                  </div>
              </div>

                {/* LEVEL QUICK SWITCHER */}
                <div className="space-y-1.5">
                  <div className="px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Đổi trình độ mục tiêu:
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => changeUserLevel(lvl)}
                        className={`py-1.5 text-xs font-black rounded-lg border transition ${
                          userLevel === lvl
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2 space-y-1">
                  <div className="px-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Chuyển hồ sơ khác:
                  </div>
                  {profiles.map(p => (
                    <button
                      key={p}
                      onClick={() => switchProfile(p)}
                      className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center justify-between transition ${
                        p === activeProfile ? 'text-blue-600 bg-blue-50/40 font-bold' : 'text-slate-700'
                      }`}
                    >
                      <span>{p}</span>
                      {p === activeProfile && <CheckCircle className="w-3.5 h-3.5 text-blue-500" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 p-3 sm:p-6 items-start flex-grow overflow-x-hidden">
        
        {/* CỘT TRÁI: HỌC TẬP CHÍNH */}
        <section className="lg:col-span-7 space-y-6">
          
          {/* STUDY MODE SWITCHER BAR */}
          <div className="bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-2">
            <button
              onClick={() => setStudyMode('spoken')}
              className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 sm:gap-2 ${
                studyMode === 'spoken'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Languages className="w-4 h-4 flex-shrink-0" /> <span>🗣️ Luyện Dịch </span>
            </button>
            <button
              onClick={() => {
                setStudyMode('writing');
                if (!writingTask) handleGenerateWritingTask();
              }}
              className={`flex-1 py-2.5 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-1.5 sm:gap-2 relative ${
                studyMode === 'writing'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 flex-shrink-0" /> <span>✍️ Thi Viết Essay</span>
            </button>
          </div>

          {/* CHẾ ĐỘ 1: LUYỆN DỊCH*/}
          {studyMode === 'spoken' && (
            <div className="space-y-6">
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

              {/* INPUT FORM FOR SPOKEN TRANSLATION */}
              <div className="space-y-4">
                <div className="flex justify-between items-center ml-1">
                  <label className="block text-sm font-bold text-slate-700">Bản dịch tiếng Anh của bạn:</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startVoiceInput('spoken')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200'
                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                      }`}
                      title="Nhấn để nói tiếng Anh (tự động chuyển giọng nói thành văn bản)"
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-blue-600" />}
                      <span>{isListening ? 'Đang nghe...' : '🎙️ Nhập giọng nói'}</span>
                    </button>
                    <span className="text-xs text-slate-400">{userTranslation.length} ký tự</span>
                  </div>
                </div>
                <textarea 
                  value={userTranslation}
                  onChange={(e) => setUserTranslation(e.target.value)}
                  rows={3} 
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition text-base sm:text-lg resize-none shadow-inner bg-white font-medium" 
                  placeholder="Nhập câu dịch tiếng Anh của bạn hoặc bấm biểu tượng mic để nói..."
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
            </div>
          )}

          {/* CHẾ ĐỘ 2: THI VIẾT ESSAY (EXTENDED WRITING CHALLENGE) */}
          {studyMode === 'writing' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 text-white rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden border border-purple-800/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-3 py-1 bg-purple-500/25 text-purple-200 border border-purple-400/30 text-[11px] font-bold rounded-lg uppercase tracking-wider whitespace-nowrap">
                        Writing Challenge • Level {userLevel}
                      </span>
                    </div>
                    
                    <h3 className="text-base sm:text-xl font-extrabold flex items-start gap-2.5 text-white leading-snug">
                      <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-300 flex-shrink-0 mt-0.5" /> 
                      <span className="break-words">{writingTask?.title || "Bài Thi Viết Essay Ôn Tập"}</span>
                    </h3>

                    <p className="text-purple-200/90 text-xs sm:text-sm leading-relaxed">
                      Luyện tập kỹ năng viết câu dài, triển khai ý tưởng và kết nối đoạn văn theo chuẩn bài thi IELTS / Cambridge.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateWritingTask}
                    disabled={isLoadingWritingTask}
                    className="self-start sm:self-auto w-full sm:w-auto justify-center bg-white/15 hover:bg-white/25 active:scale-95 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 flex-shrink-0 border border-white/20 shadow-sm"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWritingTask ? 'animate-spin' : ''}`} /> 
                    <span>Đổi đề khác</span>
                  </button>
                </div>

                {isLoadingWritingTask ? (
                  <div className="mt-4 p-4 bg-white/10 rounded-xl animate-pulse text-xs text-purple-200 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-300 flex-shrink-0" />
                    <span>AI Giám Khảo đang soạn đề bài viết essay phù hợp với trình độ {userLevel}...</span>
                  </div>
                ) : writingTask && (
                  <div className="mt-4 p-4 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 space-y-3 shadow-inner">
                    <p className="text-xs sm:text-sm font-bold text-amber-300 leading-relaxed flex items-start gap-2">
                      <span className="text-sm flex-shrink-0">📌</span>
                      <span><strong className="text-amber-200">Đề bài:</strong> {writingTask.promptVi}</span>
                    </p>
                    
                    <div className="text-xs text-purple-100 space-y-1.5 pt-2 border-t border-white/10">
                      <p className="font-extrabold text-white text-xs">
                        Gợi ý nội dung cần viết ({writingTask.minWords}-{writingTask.maxWords} từ):
                      </p>
                      <ul className="space-y-1.5 text-purple-200 pl-1">
                        {writingTask.guidingQuestions?.map((q, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 flex-shrink-0 mt-1.5"></span>
                            <span className="leading-relaxed">{q}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* ESSAY TEXTAREA */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 ml-1">
                  <label className="block text-sm font-bold text-slate-700">Bài essay tiếng Anh của bạn:</label>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => startVoiceInput('writing')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isListening
                          ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-200'
                          : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200/60'
                      }`}
                      title="Nhấn để nói/đọc bài essay bằng giọng nói"
                    >
                      {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-purple-600" />}
                      <span>{isListening ? 'Đang nghe...' : '🎙️ Nhập giọng nói'}</span>
                    </button>
                    <span className="text-xs font-semibold text-slate-500">
                      {userEssay.trim() ? userEssay.trim().split(/\s+/).length : 0} từ
                    </span>
                  </div>
                </div>
                <textarea 
                  value={userEssay}
                  onChange={(e) => setUserEssay(e.target.value)}
                  rows={8} 
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-purple-100 focus:border-purple-400 outline-none transition text-sm sm:text-base resize-none shadow-inner bg-white font-medium leading-relaxed" 
                  placeholder="Write your English essay here (100 - 150 words)..."
                />
                
                <button 
                  onClick={handleCheckWritingEssay}
                  disabled={isLoadingWritingCheck || !userEssay.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white py-4 rounded-2xl font-bold text-lg transform active:scale-[0.98] transition shadow-lg shadow-purple-100 flex items-center justify-center gap-2"
                >
                  {isLoadingWritingCheck ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" /> Giám Khảo AI Đang Chấm Bài Essay...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" /> Nộp Bài Chấm Điểm Essay
                    </>
                  )}
                </button>
              </div>

              {/* ESSAY EVALUATION RESULT */}
              {writingResult && (
                <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg space-y-6 animate-fadeInUp">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Kết quả bài thi viết</span>
                      <h4 className="text-xl font-black text-purple-700">{writingResult.bandScore}</h4>
                    </div>
                    <div className="px-4 py-2 bg-purple-50 text-purple-700 font-black rounded-xl text-sm border border-purple-100">
                      Cambridge Writing Evaluation
                    </div>
                  </div>

                  {/* 4 CRITERIA RATINGS */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>Task Achievement</span>
                        <span>{writingResult.taskAchievement}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full" style={{ width: `${writingResult.taskAchievement}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>Coherence & Cohesion</span>
                        <span>{writingResult.coherenceCohesion}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: `${writingResult.coherenceCohesion}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>Lexical Resource</span>
                        <span>{writingResult.lexicalResource}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${writingResult.lexicalResource}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                        <span>Grammar Accuracy</span>
                        <span>{writingResult.grammarAccuracy}/100</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${writingResult.grammarAccuracy}%` }}></div>
                      </div>
                    </div>
                  </div>

                  {/* NATIVE REWRITE */}
                  <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2">
                    <p className="text-xs font-extrabold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Bài Viết Luận Mẫu Bản Xứ Hoàn Hảo (Native Rewrite):
                    </p>
                    <p className="text-sm font-medium text-slate-800 leading-relaxed italic bg-white p-3 rounded-lg border border-purple-100">
                      "{writingResult.nativeRewrite}"
                    </p>
                  </div>

                  {/* DETAILED FEEDBACK */}
                  <div className="space-y-2">
                    <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Nhận xét chi tiết & Hướng dẫn cải thiện:</p>
                    <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                      {writingResult.feedbackVi}
                    </p>
                  </div>
                </div>
              )}
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
                    <span className="text-emerald-600 font-extrabold">🎉 Đủ chuỗi 5 bài hôm nay!</span>
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
                {studyMode === 'spoken' ? (
                  <><Languages className="inline-block w-4 h-4 mr-1.5" /> Câu thoại ({studyHistory.length})</>
                ) : (
                  <><BookOpen className="inline-block w-4 h-4 mr-1.5" /> Bài Essay ({essayHistory.length})</>
                )}
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

            {/* TAB 1: SENTENCES / ESSAY HISTORY LIST */}
            {activeTab === 'sentences' && (
              <div className="space-y-4">
                {studyMode === 'spoken' ? (
                  /* SPOKEN MODE SENTENCES HISTORY */
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 italic">Mặc định ẩn câu tiếng Anh để tự ôn luyện nhẩm</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setConfirmModalData({
                              title: 'Xóa toàn bộ lịch sử câu thoại',
                              message: 'Bạn có chắc chắn muốn làm sạch toàn bộ dữ liệu câu thoại đã tích lũy của hồ sơ này không?',
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
                              </div>
                            </div>

                            <div className="mt-2 pt-2 border-t border-slate-200/50 flex justify-between items-center">
                              <button 
                                onClick={() => {
                                  setVisibleTranslationIndices(prev => ({
                                    ...prev,
                                    [index]: !prev[index]
                                  }));
                                }} 
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                              >
                                {(allTranslationsVisible || visibleTranslationIndices[index]) ? 'Ẩn bản dịch EN' : 'Hiện bản dịch EN'}
                              </button>
                              
                              <button 
                                onClick={() => speakText(item.en)}
                                className="text-xs bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 px-2 py-1 rounded-lg transition flex items-center gap-1 shadow-sm font-semibold"
                              >
                                <Volume2 className="w-3.5 h-3.5 text-blue-500" /> Nghe
                              </button>
                            </div>

                            {(allTranslationsVisible || visibleTranslationIndices[index]) && (
                              <div className="mt-2.5 text-emerald-800 font-semibold bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100 text-xs sm:text-sm animate-fadeIn">
                                <span className="text-emerald-600 font-bold mr-1.5">EN:</span> {item.en}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  /* ESSAY WRITING MODE HISTORY */
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-slate-400 italic">Danh sách các bài essay đã nộp chấm điểm</p>
                      {essayHistory.length > 0 && (
                        <button 
                          onClick={() => {
                            setConfirmModalData({
                              title: 'Xóa toàn bộ lịch sử Essay',
                              message: 'Bạn có chắc chắn muốn làm sạch toàn bộ bài essay đã nộp của hồ sơ này không?',
                              onConfirm: () => clearEssayHistory()
                            });
                            setShowConfirmModal(true);
                          }} 
                          className="text-[10px] text-rose-500 hover:underline font-bold"
                        >
                          Xóa lịch sử essay
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                      {essayHistory.length === 0 ? (
                        <p className="text-center py-8 text-slate-400 italic text-sm">Chưa có bài essay nào được nộp.</p>
                      ) : (
                        essayHistory.map((item, index) => (
                          <div key={index} className="p-4 rounded-xl border border-purple-100 bg-purple-50/30 space-y-2 relative">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-extrabold text-slate-400">{item.date}</span>
                              <span className="px-2.5 py-0.5 bg-purple-600 text-white text-xs font-black rounded-lg shadow-sm">
                                {item.bandScore}
                              </span>
                            </div>

                            <h5 className="font-extrabold text-sm text-purple-950">{item.title}</h5>
                            
                            <div className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-100 font-medium leading-relaxed italic line-clamp-3">
                              "{item.userEssay}"
                            </div>

                            <div className="bg-purple-100/60 p-3 rounded-lg text-xs space-y-1 border border-purple-200/50">
                              <p className="font-extrabold text-purple-900 flex items-center gap-1 text-[11px]">
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Bài mẫu bản xứ (Native Rewrite):
                              </p>
                              <p className="text-purple-900 font-semibold italic text-xs leading-relaxed">
                                "{item.nativeRewrite}"
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                )}
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
