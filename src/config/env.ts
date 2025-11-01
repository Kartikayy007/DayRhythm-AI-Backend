import dotenv from 'dotenv';

dotenv.config();

interface EnvConfig {
  PORT: number;
  NODE_ENV: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_KEY: string;
  GROQ_API_KEY: string;
  GEMINI_API_KEY?: string;
  CORS_ORIGIN: string;
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value;
};

export const env: EnvConfig = {
  PORT: parseInt(getEnvVar('PORT', '3000'), 10),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  SUPABASE_URL: getEnvVar('SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_KEY: getEnvVar('SUPABASE_SERVICE_KEY'),
  GROQ_API_KEY: getEnvVar('GROQ_API_KEY'),
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  CORS_ORIGIN: getEnvVar('CORS_ORIGIN', '*'),
};
