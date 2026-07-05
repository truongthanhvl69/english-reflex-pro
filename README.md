# English Reflex Pro

Web app luyện phản xạ tiếng Anh cho người Việt, xây bằng Next.js, React, TypeScript, Framer Motion, Supabase và Gemini TTS.

## Chạy local

Yêu cầu Node.js 20.9 trở lên.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`. Không có API key, toàn bộ UI và các chế độ luyện vẫn hoạt động; tính năng giọng đọc AI sẽ hiển thị lời nhắc cấu hình rõ ràng và tuyệt đối không tự chuyển sang Web Speech API.

## Cấu hình Gemini / Google AI Studio

1. Tạo API key trong Google AI Studio.
2. Điền `GEMINI_API_KEY` trong `.env.local`.
3. Mặc định dự án dùng `gemini-3.1-flash-tts-preview` cho TTS và `gemini-2.5-flash` cho phân tích lỗi. Có thể đổi qua `GEMINI_TTS_MODEL` và `GEMINI_ANALYSIS_MODEL` mà không sửa code.

Endpoint `/api/tts` tạo WAV 24 kHz từ PCM của Gemini. Cache key là SHA-256 của `voice:text`, nên thay đổi tốc độ phát không tạo lại audio. Khi Supabase được cấu hình, endpoint kiểm tra bảng `audio_cache`, phát file đã có từ Storage, và chỉ gọi Gemini nếu cache chưa tồn tại.

## Cấu hình Supabase

1. Tạo project Supabase.
2. Chạy [supabase/schema.sql](./supabase/schema.sql) trong SQL Editor.
3. Chạy tiếp [migration tài khoản](./supabase/migrations/20260704000000_user_accounts.sql).
4. Điền URL, anon key, site URL và service-role key vào `.env.local`.
5. Không đưa `SUPABASE_SERVICE_ROLE_KEY` ra client hoặc commit lên Git.

Schema gồm profile, course/category, lesson, sentence, attempt, tiến độ, spaced repetition, achievement, leaderboard, audio cache, RLS và bucket `sentence-audio`.

### Google OAuth và đồng bộ theo tài khoản

1. Trong Supabase Dashboard, mở **Authentication → Providers → Google**, bật Google
   và nhập Client ID/Client Secret từ Google Cloud.
2. Trong Google Cloud, thêm callback hiển thị tại trang provider của Supabase
   (thường là `https://<project-ref>.supabase.co/auth/v1/callback`) vào
   **Authorized redirect URIs**.
3. Trong **Authentication → URL Configuration**, đặt Site URL và thêm
   `http://localhost:3000/auth/callback` cùng callback của domain production
   vào redirect allow list.
4. Đặt `NEXT_PUBLIC_SITE_URL` đúng với origin của app và khởi động lại Next.js.

Browser chỉ dùng Supabase URL và anon key. RLS gắn mọi profile, tiến trình, lịch sử,
cài đặt và thành tích với `auth.uid()`. RPC `record_practice_answer` lưu câu trả
lời rồi cập nhật EXP, streak và accuracy trong cùng một transaction.

## Dữ liệu mẫu

[data/sentences.ts](./data/sentences.ts) chứa 100 câu A1–A2 đúng cấu trúc bài học. Khi chuyển sang production, import các bản ghi này vào bảng `sentences` qua CMS/CSV rồi lấy dữ liệu bằng Supabase thay vì bundle cùng client.

## Kiểm tra và deploy

```bash
npm run typecheck
npm run build
```

Để deploy Vercel: import repository, khai báo các biến môi trường giống `.env.local`, sau đó deploy. API route TTS đã đặt `maxDuration = 60`; nếu tài khoản Vercel giới hạn thấp hơn, dùng Supabase Edge Function cho bước tạo audio nền.

## Cấu trúc chính

- `app/`: route, layout và server API.
- `components/`: dashboard, thư viện, phòng luyện, tiến bộ, xếp hạng.
- `hooks/`: state và engine phiên học.
- `services/`: client service cho audio.
- `utils/`: chuẩn hóa/chấm đáp án.
- `data/`: seed course và 100 câu mẫu.
- `types/`: contract TypeScript.
- `supabase/`: database schema, RLS và Storage.

## Ghi chú production

- Bật rate limit cho `/api/tts` và `/api/analyze`.
- Chuyển tạo audio hàng loạt sang background job.
- Kiểm tra redirect allow list của Supabase khi thêm domain preview/production mới.
- Speaking UI đã dùng `MediaRecorder`; bước chấm audio production nên gửi blob tới một server route riêng, lưu score vào `attempts`, và xóa audio thô theo chính sách riêng tư đã công bố.
