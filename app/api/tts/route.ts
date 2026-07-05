import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitDepth = 16) {
  const header = Buffer.alloc(44);
  const byteRate = sampleRate * channels * (bitDepth / 8);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const voice = body.voice === "Charon" ? "Charon" : "Kore";
    const accent = body.accent === "uk" ? "uk" : "us";
    if (!text || text.length > 800) return NextResponse.json({ error: "Nội dung audio không hợp lệ." }, { status: 400 });

    const cacheKey = createHash("sha256").update(`${voice}:${accent}:${text}`).digest("hex");
    const path = `sentences/${cacheKey}.wav`;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

    if (supabase) {
      const { data: cached } = await supabase.from("audio_cache").select("public_url").eq("cache_key", cacheKey).maybeSingle();
      if (cached?.public_url) return NextResponse.json({ audioUrl: cached.public_url, cached: true });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY. Xem .env.example để bật giọng đọc AI." }, { status: 503 });

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        model: process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview",
        input: `Read the following sentence exactly as written, in a warm, natural ${accent === "uk" ? "British" : "American"} English voice. Do not add or remove words. Sentence: ${text}`,
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice }] },
      }),
    });


    if (!response.ok) {
      const detail = await response.text();
      console.error("Gemini TTS error", response.status, detail.slice(0, 500));
      return NextResponse.json({ error: "Gemini TTS chưa thể tạo audio. Vui lòng thử lại." }, { status: 502 });
    }

    const result = await response.json();
    const encodedAudio = result.output_audio?.data;
    if (!encodedAudio) return NextResponse.json({ error: "Gemini không trả về dữ liệu audio." }, { status: 502 });
    const wav = pcmToWav(Buffer.from(encodedAudio, "base64"));

    if (supabase) {
      const { error: uploadError } = await supabase.storage.from("sentence-audio").upload(path, wav, { contentType: "audio/wav", cacheControl: "31536000", upsert: true });
      if (!uploadError) {
        const { data } = supabase.storage.from("sentence-audio").getPublicUrl(path);
        await supabase.from("audio_cache").upsert({ cache_key: cacheKey, text, voice, storage_path: path, public_url: data.publicUrl });
        return NextResponse.json({ audioUrl: data.publicUrl, cached: false });
      }
      console.error("Supabase audio upload error", uploadError);
    }

    return NextResponse.json({ audioUrl: `data:audio/wav;base64,${wav.toString("base64")}`, cached: false });
  } catch (error) {
    console.error("TTS route error", error);
    return NextResponse.json({ error: "Không thể xử lý yêu cầu audio." }, { status: 500 });
  }
}
