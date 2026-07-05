import type { AudioSettingsState } from "@/services/audioManager";
import { supabase } from "@/lib/supabaseClient";

interface SettingsRow {
  effects_enabled: boolean;
  auto_play_correct: boolean;
  effects_volume: number | string;
  voice_volume: number | string;
  speed_rate: number | string;
  voice_type: AudioSettingsState["voiceType"];
}

function fromRow(row: SettingsRow): AudioSettingsState {
  return {
    effectsEnabled: row.effects_enabled,
    autoPlayCorrect: row.auto_play_correct,
    effectsVolume: Number(row.effects_volume),
    voiceVolume: Number(row.voice_volume),
    speedRate: Number(row.speed_rate),
    voiceType: row.voice_type,
  };
}

export async function loadUserSettings(userId: string): Promise<AudioSettingsState | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("effects_enabled, auto_play_correct, effects_volume, voice_volume, speed_rate, voice_type")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data ? fromRow(data as SettingsRow) : null;
}

export async function saveUserSettings(userId: string, settings: AudioSettingsState) {
  const { error } = await supabase.from("user_settings").upsert({
    user_id: userId,
    effects_enabled: settings.effectsEnabled,
    auto_play_correct: settings.autoPlayCorrect,
    effects_volume: settings.effectsVolume,
    voice_volume: settings.voiceVolume,
    speed_rate: settings.speedRate,
    voice_type: settings.voiceType,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  if (error) throw error;
}
