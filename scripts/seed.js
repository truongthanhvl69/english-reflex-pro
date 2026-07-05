const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local variables manually
const envPath = path.join(__dirname, "../.env.local");
if (!fs.existsSync(envPath)) {
  console.error("Không tìm thấy tệp .env.local. Vui lòng chạy ứng dụng trước.");
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[key] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// Static UUIDs for references
const categoryIdA1 = "a1000000-0000-0000-0000-0000000000a1";
const lessonIds = Array.from({ length: 10 }, (_, i) => `ae100000-0000-0000-0000-0000000000${String(i + 1).padStart(2, "0")}`);

// Raw seed data representing sentences from sentences.ts
const a1Seed = [
  ["I am Vietnamese.", "Tôi là người Việt Nam.", ["I'm Vietnamese."], "I am + quốc tịch"],
  ["What is your name?", "Bạn tên là gì?", ["What's your name?"], "What is + danh từ?"],
  ["My name is Minh.", "Tên tôi là Minh.", ["I'm Minh."], "My name is + tên"],
  ["Nice to meet you.", "Rất vui được gặp bạn."],
  ["How are you today?", "Hôm nay bạn khỏe không?", ["How are you doing today?"]],
  ["I am fine, thank you.", "Tôi khỏe, cảm ơn bạn.", ["I'm fine, thank you.", "I'm good, thanks."]],
  ["Where are you from?", "Bạn đến từ đâu?", ["Where do you come from?"]],
  ["I live in Ho Chi Minh City.", "Tôi sống ở Thành phố Hồ Chí Minh.", ["I live in Saigon."]],
  ["This is my friend.", "Đây là bạn của tôi."],
  ["See you tomorrow.", "Hẹn gặp bạn ngày mai."],
  ["I have a small family.", "Tôi có một gia đình nhỏ."],
  ["She is my older sister.", "Cô ấy là chị gái của tôi.", ["She's my older sister."]],
  ["He works at a bank.", "Anh ấy làm việc ở ngân hàng."],
  ["My parents live in Da Nang.", "Bố mẹ tôi sống ở Đà Nẵng."],
  ["We often eat dinner together.", "Chúng tôi thường ăn tối cùng nhau."],
  ["Do you have any brothers?", "Bạn có anh em trai không?"],
  ["I have one younger brother.", "Tôi có một em trai."],
  ["Her daughter is five years old.", "Con gái cô ấy năm tuổi.", ["Her daughter is five."]],
  ["Our house is near the park.", "Nhà chúng tôi ở gần công viên."],
  ["They are very kind.", "Họ rất tốt bụng.", ["They're very kind."]],
  ["I wake up at six.", "Tôi thức dậy lúc sáu giờ."],
  ["I brush my teeth.", "Tôi đánh răng."],
  ["I take a shower every morning.", "Tôi tắm mỗi sáng."],
  ["She goes to work by bus.", "Cô ấy đi làm bằng xe buýt."],
  ["We start work at eight.", "Chúng tôi bắt đầu làm việc lúc tám giờ."],
  ["I have lunch at home.", "Tôi ăn trưa ở nhà."],
  ["He finishes work at five.", "Anh ấy tan làm lúc năm giờ."],
  ["I usually cook dinner.", "Tôi thường nấu bữa tối."],
  ["I go to bed before eleven.", "Tôi đi ngủ trước mười một giờ."],
  ["What do you do on weekends?", "Bạn làm gì vào cuối tuần?"],
  ["I would like some coffee.", "Tôi muốn một chút cai phê.", ["I'd like some coffee."]],
  ["Can I see the menu?", "Tôi có thể xem thực đơn không?", ["May I see the menu?"]],
  ["This soup is delicious.", "Món súp này rất ngon."],
  ["I do not eat meat.", "Tôi không ăn thịt.", ["I don't eat meat."]],
  ["Could I have some water?", "Cho tôi xin một chút nước được không?", ["Can I have some water?"]],
  ["The bill, please.", "Cho tôi xin hóa đơn."],
  ["How much is this?", "Cái này giá bao nhiêu?"],
  ["It is too expensive.", "Nó quá đắt.", ["It's too expensive."]],
  ["Do you have a smaller size?", "Bạn có cỡ nhỏ hơn không?"],
  ["I like this blue shirt.", "Tôi thích chiếc áo sơ mi màu xanh này."],
  ["Can I try it on?", "Tôi có thể thử nó không?"],
  ["I will take it.", "Tôi sẽ lấy nó.", ["I'll take it."]],
  ["Where is the restroom?", "Nhà vệ sinh ở đâu?", ["Where is the bathroom?", "Where's the restroom?"]],
  ["Please speak more slowly.", "Vui lòng nói chậm hơn."],
  ["I do not understand.", "Tôi không hiểu.", ["I don't understand."]],
  ["Can you help me?", "Bạn có thể giúp tôi không?", ["Could you help me?"]],
  ["What time is it?", "Bây giờ là mấy giờ?"],
  ["It is half past seven.", "Bây giờ là bảy giờ rưỡi.", ["It's seven thirty."]],
  ["Today is Monday.", "Hôm nay là thứ Hai."],
  ["The weather is nice today.", "Hôm nay thời tiết đẹp."],
];

const categories = ["Giao tiếp hằng ngày", "Gia đình", "Thói quen", "Ăn uống", "Du lịch", "Công sở"];

async function seed() {
  console.log("Bắt đầu đẩy dữ liệu mẫu lên Supabase...");

  try {
    // 1. Seed Categories
    console.log("Đang chèn Danh mục (Categories)...");
    const { error: catError } = await supabase.from("categories").upsert({
      id: categoryIdA1,
      slug: "a1",
      title: "Nền tảng A1",
      description: "Câu thiết yếu cho người mới bắt đầu",
      level: "A1",
      icon: "🌱",
      sort_order: 1,
      published: true,
    });

    if (catError) throw new Error("Lỗi chèn category: " + catError.message);

    // 2. Seed Lessons
    console.log("Đang chèn Bài học (Lessons)...");
    const lessonsData = Array.from({ length: 10 }, (_, index) => ({
      id: lessonIds[index],
      category_id: categoryIdA1,
      slug: `lesson-${index + 1}`,
      title: `Bài ${String(index + 1).padStart(2, "0")}`,
      description: ["Chào hỏi & giới thiệu", "Gia đình & bạn bè", "Thói quen mỗi ngày", "Ăn uống", "Mua sắm", "Thời gian", "Công việc", "Di chuyển", "Sở thích", "Ôn tập phản xạ"][index],
      required_exp: 0,
      sort_order: index + 1,
      published: true,
    }));

    const { error: lesError } = await supabase.from("lessons").upsert(lessonsData);
    if (lesError) throw new Error("Lỗi chèn lessons: " + lesError.message);

    // 3. Seed Sentences
    console.log("Đang chèn Câu luyện tập (Sentences)...");
    const sentencesData = a1Seed.map((seed, index) => {
      const [english, vietnamese, alternatives = [], note = "Mẫu câu giao tiếp tự nhiên"] = seed;
      const lessonIndex = Math.floor(index / 5); // 5 sentences per lesson for quick seed
      const lessonId = lessonIds[lessonIndex % 10];

      return {
        id: `c0000000-0000-0000-0000-000000000${String(index + 1).padStart(3, "0")}`,
        lesson_id: lessonId,
        english,
        vietnamese,
        ipa: index === 0 ? "/aɪ æm ˌvjet.nəˈmiːz/" : "",
        level: "A1",
        category_label: categories[index % categories.length],
        part_of_speech: "phrase",
        grammar_note: note,
        alternative_answers: alternatives,
        word_bank: english.replace(/[.!?]/g, "").split(/\s+/),
        published: true,
      };
    });

    const { error: senError } = await supabase.from("sentences").upsert(sentencesData);
    if (senError) throw new Error("Lỗi chèn sentences: " + senError.message);

    console.log("🎉 Đẩy dữ liệu mẫu lên Supabase thành công!");
  } catch (error) {
    console.error("❌ Thất bại:", error.message);
  }
}

seed();
