import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const { submitted, sentence } = await request.json();
    if (!submitted || !sentence?.english) return NextResponse.json({ error: "Thiếu dữ liệu câu trả lời." }, { status: 400 });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ localFallback: true }, { status: 503 });

    const prompt = `Bạn là giáo viên tiếng Anh cho người Việt. Phân tích thật ngắn gọn câu trả lời sai dưới đây.
Câu tiếng Việt: ${sentence.vietnamese}
Đáp án tự nhiên: ${sentence.english}
Người học trả lời: ${submitted}
Trả về JSON thuần với đúng 4 trường: title, message, explanation, memoryTip. Viết bằng tiếng Việt, thân thiện, chỉ ra lỗi cụ thể, không markdown, mỗi trường tối đa 35 từ.`;

    const model = process.env.GEMINI_ANALYSIS_MODEL || "gemini-2.5-flash";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.25, responseMimeType: "application/json" } }),
    });
    if (!response.ok) return NextResponse.json({ error: "AI analysis unavailable" }, { status: 502 });
    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return NextResponse.json({ error: "Empty AI response" }, { status: 502 });
    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error("Analyze route error", error);
    return NextResponse.json({ error: "Không thể phân tích câu trả lời." }, { status: 500 });
  }
}
