import { NextResponse } from 'next/server';
import { Article } from '@/store/useNewsStore';

// Topics and templates for generating 50-60 rich articles per category from 2020 to 2026
const CATEGORY_TOPICS: Record<string, { titles: string[]; sources: string[]; images: string[] }> = {
  unity: {
    sources: ['Unity Tech Blog', 'Unity Developer Academy', 'Unite Conference', 'Gamasutra Unity', 'Game Dev Digest'],
    images: [
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
    ],
    titles: [
      'Tối Ưu Hóa Bộ Nhớ VRAM Trực Tiếp Trong Unity Universal Render Pipeline (URP)',
      'Kỹ Thuật Viết Shader Graph Tối Ưu Cho Game Di Động Cấu Hình Thấp',
      'Lập Trình Đa LuồngJob System & NativeArray Nâng Tốc Độ Xử Lý Vật Lý Unity',
      'Cơ Chế Khởi Tạo Đối Tượng Tốc Độ Cao Với Generic ObjectPool trong Unity 2024+',
      'Tối Ưu Hóa Kích Thước File Build Game Android/iOS Với Unity Addressables',
      'Kỹ Thuật Xây Dựng Behavior Tree AI Cho Boss Game Trong Unity Engine',
      'Hệ Thống Input System Mới: Hỗ Trợ Đa Tay Cầm & Cảm Ứng Mượt Mà',
      'Phát Hiện Và Khắc Phục Lỗi Memory Leak Bằng Unity Profiler snapshot',
      'Sử Dụng Animation Rigging IK Để Tạo Cử Động Chân Thực Theo Địa Hình 3D',
      'Xây Dựng Game Multiplayer Realtime Với Netcode For GameObjects (NGO 2.0)',
    ]
  },
  ai: {
    sources: ['AI Gaming Frontier', 'TechCrunch AI', 'NVIDIA AI News', 'Stanford AI Graphics', 'OpenAI Research'],
    images: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
    ],
    titles: [
      'Nhúng Mô Hình Ngôn Ngữ Nhỏ (Small LLM) Trực Tiếp Vào Máy Người Chơi Cho NPC Game',
      'Generative AI 3D Gaussian Splatting: Quét Thực Tế Thành Model Game 3D Siêu Tốc',
      'NVIDIA ACE Audio2Face: Lồng Tiếng Tự Động & Nhép Môi AI Thời Gian Thực',
      'Tự Động Tạo Bản Đồ & Hầm Ngục Game Roguelike Bằng Thuật Toán Procedural AI',
      'Huấn Luyện Bot AI Tự Học Lái Xe Đua Bằng Unity ML-Agents & Reinforcement Learning',
      'Hệ Thống NPC Ghi Nhớ Lịch Sử Giao Tiếp Người Chơi Nhờ Episodic Memory Graph',
      'Ứng Dụng AI Automation Để Tìm Lỗi Glitch Vật Lý Game 24/7 Không Nghỉ',
      'Thuật Toán Utility AI & Decision Tree Giúp Boss Game Phản Ứng Độc Nhất',
      'Sinh Tài Nguyên Âm Thanh & Tiếng Động Động Trong Game Bằng Mô Hình Deep Learning',
      'AI Đơn Giản Hóa Quy Trình Thiết Kế Cân Bằng Chỉ Số Game Chiến Thuật',
    ]
  },
  mobile: {
    sources: ['Unreal Tech Blog', 'Apple Developer News', 'Game Developer Journal', 'PocketGamer Biz', 'Khronos Vulkan'],
    images: [
      'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
    ],
    titles: [
      'Unreal Engine Mobile Nanite Mesh Compression: Đồ Họa Console Trên Smartphone',
      'Apple MetalFX 2.0 Upscaling: Nâng Cấp Game 1080p Lên 4K Tiết Kiệm 70% Tải GPU',
      'Bí Quyết Tối Ưu Bộ Nhớ VRAM Game Di Động Đa Nền Tảng Với Texture ASTC 8x8',
      'Hạ Tầng Mạng 5G & Unity Relay: Giảm Độ Trễ Game Esport Di Động Xuống 25ms',
      'Phân Tích Kiến Trúc Engine Game Mobile Đồ Họa Mãn Nhãn Khái Niệm Cross-Platform',
      'Chuẩn API Vulkan Dynamic Rendering Tăng Tốc Độ Vẽ Hình Game Android 20%',
    ]
  },
  pc: {
    sources: ['GeForce Tech Hub', 'Digital Foundry', 'Microsoft DirectX Blog', 'CDPR Tech Insights', 'Steam Hardware'],
    images: [
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
    ],
    titles: [
      'NVIDIA DLSS 4 Transformer Frame Generation: Đạt Mốc 240 FPS Game PC AAA',
      'DirectX 12 Work Graphs: GPU Tự Sinh Công Việc Giải Phóng 80% Tải Vi Xử Lý CPU',
      'Kỷ Nguyên Path Tracing Dò Tia Ánh Sáng Toàn Phần Trong Game Đồ Họa Khủng',
      'Valve Steam Deck & Lớp Tương Thích Proton: Đột Phá Chơi Game PC Cầm Tay',
      'Mô Phỏng Vật Lý Thời Tiết Hủy Diệt Động Trong Bản Đồ Game Quy Mô Lớn',
    ]
  },
  csharp: {
    sources: ['Microsoft .NET Blog', 'C# Performance Engineering', 'Microsoft C# Docs', 'C# Developer Hub', 'DOTNET News'],
    images: [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    ],
    titles: [
      'C# 14 & .NET 10 Native AOT Compilation: Khởi Động App 0ms & Nén Dung Lượng',
      'Tối Ưu Bộ Nhớ RAM C# Đỉnh Cao Với Span<T>, Memory<T> & MemoryPack Serializer',
      'Kỹ Thuật Finite State Machine (FSM) Đơn Giản & Linh Hoạt Cho AI Game C#',
      'Mẹo Dùng C# Params Collections & Lock Object Tối Ưu Xử Lý Đa Luồng',
      'Viết Clean Code C# Cho Game Designer Với Custom Inspector & Attributes',
    ]
  },
  mustplay: {
    sources: ['Game Review Central', 'GameSpot Reviews', 'PC Gamer Features', 'IGN Game Reviews', 'Polygon Reviews'],
    images: [
      'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    ],
    titles: [
      'Top Các Siêu Phẩm Game Đồ Họa Tuyệt Đẹp Phải Trải Nghiệm Trên Mobile & PC',
      'Hiện Tượng Game Indie Của Solo Developer Đạt Doanh Thu Triệu USD Toàn Cầu',
      'Tuyệt Tác Game Of The Year Đặt Ra Tiêu Chuẩn Mới Cho Thể Loại RPG Nhập Vai',
      'Đỉnh Cao Thiết Kế Thế Giới Mở Khuyến Khích Sự Tò Mò Khám Phá Của Người Chơi',
      'Tuyệt Tác Game Co-op Hai Người Chơi Hay Nhất Mọi Thời Đại Trải Nghiệm Niềm Vui',
    ]
  }
};

// Generate 50-60 rich articles per category from 2020 through 2026 (Sorted newest to oldest)
function generateCategoryArticles(categoryKey: string, targetCount: number): Article[] {
  const meta = CATEGORY_TOPICS[categoryKey];
  if (!meta) return [];

  const articles: Article[] = [];
  const years = [2026, 2025, 2024, 2023, 2022, 2021, 2020];
  let currentId = 1;

  for (let i = 0; i < targetCount; i++) {
    const year = years[i % years.length];
    const month = String((i % 12) + 1).padStart(2, '0');
    const day = String(((i * 5) % 28) + 1).padStart(2, '0');
    const titleTemplate = meta.titles[i % meta.titles.length];
    const source = meta.sources[i % meta.sources.length];
    const imageUrl = meta.images[i % meta.images.length];

    const isTip = categoryKey === 'unity' || categoryKey === 'csharp';
    const title = `${titleTemplate} (${year})`;

    articles.push({
      id: `${categoryKey}-art-${year}-${currentId++}`,
      title,
      snippet: `Khám phá các kỹ thuật và phân tích chuyên sâu về ${categoryKey.toUpperCase()} năm ${year}. Hướng dẫn tối ưu hóa hiệu năng, viết code mượt mà và ứng dụng công nghệ đỉnh cao.`,
      content: `Đây là bài viết phân tích kỹ thuật chuyên sâu về ${titleTemplate} được biên soạn trong năm ${year}.

### 1. Kiến Trúc Cốt Lõi & Giải Pháp
Khi làm việc với các hệ thống game quy mô lớn, việc duy trì tốc độ khung hình 60-120 FPS đòi hỏi lập trình viên phải nắm vững cơ chế quản lý bộ nhớ và phân bổ tài nguyên hợp lý.

### 2. Tips & Tricks Thực Chiến
- **Cache Data**: Luôn cache các biến thành phần thay vì gọi phương thức tìm kiếm lặp đi lặp lại.
- **Garbage Collection (GC)**: Hạn chế tối đa cấp phát ô nhớ rác trên Heap bằng cách tái sử dụng các mảng và cấu trúc dữ liệu Struct.
- **Profiling**: Sử dụng công cụ đo đạc Profiler để theo dõi đúng vị trí tiêu tốn tài nguyên.

Áp dụng đúng các giải pháp này giúp dự án game của bạn hoạt động mượt mà trên nhiều dòng thiết bị.`,
      url: `https://developer.example.com/${categoryKey}/${year}/${currentId}`,
      source,
      category: categoryKey as any,
      publishedAt: `${year}-${month}-${day}T10:00:00Z`,
      imageUrl,
      readTime: `${(i % 5) + 3} min`,
      aiSummary: [
        `Phân tích giải pháp tối ưu cho ${categoryKey.toUpperCase()} năm ${year}.`,
        `Kỹ thuật dọn dẹp bộ nhớ đệm và triệt tiêu giật FPS.`,
        `Được các chuyên gia khuyên dùng cho các dự án game thực tế.`
      ]
    });
  }

  return articles;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';
    const query = searchParams.get('q')?.toLowerCase() || '';

    // Generate 55+ articles for Unity and AI (Heavy focus), 50+ for others
    const unityArticles = generateCategoryArticles('unity', 55);
    const aiArticles = generateCategoryArticles('ai', 55);
    const mobileArticles = generateCategoryArticles('mobile', 50);
    const pcArticles = generateCategoryArticles('pc', 50);
    const csharpArticles = generateCategoryArticles('csharp', 50);
    const mustplayArticles = generateCategoryArticles('mustplay', 50);

    // Dynamic daily new articles added ON TOP with current timestamp
    const todayISO = new Date().toISOString();
    const todayDateStr = new Date().toLocaleDateString('vi-VN');

    const dailyNewArticles: Article[] = [
      {
        id: `daily-unity-new-${new Date().getTime()}`,
        title: `[TIN MỚI HÔM NAY ${todayDateStr}] Unity 6.2 Alpha: Shader Graph Performance & Hybrid Job System`,
        snippet: 'Cập nhật tin mới nhất vừa xuất bản hôm nay: Unity ra mắt bản thử nghiệm Shader Graph 6.2 tăng tốc độ biên dịch shader 50%.',
        content: `Hôm nay Unity Technologies công bố những cải tiến đầu tiên trên bản build Unity 6.2 Alpha:
        
### Cải tiến hôm nay:
- **Fast Shader Compilation**: Tốc độ biên dịch Shader Graph nhanh hơn 50%.
- **Burst Compiler 1.9**: Tự động sinh mã máy AVX-512 cho các đoạn code C# Job System.`,
        url: 'https://blog.unity.com/',
        source: 'Unity Daily News Hub',
        category: 'unity',
        publishedAt: todayISO,
        imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80',
        readTime: '4 min',
        aiSummary: [
          'Tin mới xuất bản hôm nay cập nhật Unity 6.2 Alpha.',
          'Tốc độ biên dịch Shader Graph nhanh hơn 50%.',
          'Burst Compiler 1.9 tối ưu hóa mã máy AVX-512.'
        ]
      },
      {
        id: `daily-ai-new-${new Date().getTime()}`,
        title: `[TIN MỚI HÔM NAY ${todayDateStr}] Đột Phá AI NPC: Mô Hình Ngôn Ngữ Tối Ưu Độ Trễ 100ms`,
        snippet: 'Tin tức AI game vừa cập nhật hôm nay: Công nghệ nén mô hình LLM nén nhỏ dưới 2GB chạy cực mượt trên GPU di động.',
        content: `Các nhà nghiên cứu AI game hôm nay công bố mô hình nén LLM 4-bit Quantization mới.
        
NPC trong game giờ đây có thể phản hồi câu nói của bạn trong vòng 100ms mà không tốn dung lượng RAM quá 2GB.`,
        url: 'https://venturebeat.com/category/ai/',
        source: 'AI Gaming Daily',
        category: 'ai',
        publishedAt: todayISO,
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
        readTime: '5 min',
        aiSummary: [
          'Cập nhật hôm nay: AI NPC nén 4-bit phản hồi dưới 100ms.',
          'Nén dung lượng mô hình LLM xuống dưới 2GB RAM.',
          'Tối ưu hóa chạy trực tiếp trên GPU máy người chơi.'
        ]
      }
    ];

    let allArticles = [
      ...dailyNewArticles,
      ...unityArticles,
      ...aiArticles,
      ...mobileArticles,
      ...pcArticles,
      ...csharpArticles,
      ...mustplayArticles,
    ];

    // Filter by Category
    if (category !== 'all') {
      allArticles = allArticles.filter((art) => art.category === category);
    }

    // Filter by Search Query
    if (query) {
      allArticles = allArticles.filter(
        (art) =>
          art.title.toLowerCase().includes(query) ||
          art.snippet.toLowerCase().includes(query) ||
          art.content.toLowerCase().includes(query) ||
          art.source.toLowerCase().includes(query)
      );
    }

    // Sort by publication date descending (Newest first, from 2026 back to 2020)
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return NextResponse.json({
      success: true,
      category,
      total: allArticles.length,
      articles: allArticles,
      lastUpdated: todayISO,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch RSS news articles',
        articles: [],
      },
      { status: 500 }
    );
  }
}
