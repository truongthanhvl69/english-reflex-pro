import { ReflexApp } from "@/components/reflex-app";
import { AuthGuard } from "@/components/auth/AuthGuard";

export default function Home() {
  return <AuthGuard><ReflexApp /></AuthGuard>;
}
