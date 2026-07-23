import "@testing-library/jest-dom/vitest";

// Variaveis minimas para que getPublicEnv()/getServerEnv() nao lancem durante
// os testes unitarios que nao mockam @/lib/env explicitamente.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "https://test-project.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "test-anon-key";
process.env.NEXT_PUBLIC_APP_URL ||= "http://localhost:3000";
