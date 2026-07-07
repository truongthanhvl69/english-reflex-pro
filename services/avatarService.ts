import { supabase } from "@/lib/supabaseClient";

export const AvatarService = {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    // Restrict size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Kích thước tệp tin không được vượt quá 5MB.");
    }

    const fileExt = file.name.split(".").pop() || "png";
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${userId}/${fileName}`;

    // 1. Upload new image file to the bucket
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      throw new Error("Không thể tải ảnh lên, vui lòng thử lại.");
    }

    // 2. Resolve public access URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    // 3. Save to profiles.avatar_url
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (profileError) {
      throw new Error("Không thể lưu ảnh đại diện vào cơ sở dữ liệu.");
    }

    // 4. Delete old avatar files to save space
    try {
      const { data: files } = await supabase.storage
        .from("avatars")
        .list(userId);

      if (files && files.length > 0) {
        const oldFiles = files
          .filter((f) => f.name !== fileName)
          .map((f) => `${userId}/${f.name}`);

        if (oldFiles.length > 0) {
          await supabase.storage.from("avatars").remove(oldFiles);
        }
      }
    } catch (e) {
      console.warn("Could not clean up old avatars:", e);
    }

    return publicUrl;
  }
};
