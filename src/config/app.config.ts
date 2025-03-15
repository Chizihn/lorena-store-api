import { getEnv } from "../utils/get-env";

const appConfig = () => ({
  PORT: getEnv("PORT", "5000"),
  NODE_ENV: getEnv("NODE_ENV", "development"),
  MONGO_URI: getEnv("MONGO_URI"),
  JWT_SECRET: getEnv("JWT_SECRET", "mysecret"),
  JWT_EXPIRES_IN: getEnv("JWT_EXPIRES_IN", "1d"),

  BASE_PATH: getEnv("BASE_PATH"),

  FRONTEND_ORIGIN: getEnv("FRONTEND_ORIGIN", "localhost:3000"),

  SMTP: {
    HOST: getEnv("SMTP_HOST"),
    PORT: getEnv("SMTP_PORT"),
    USER: getEnv("SMTP_USER"),
    PASS: getEnv("SMTP_PASS"),
    FROM: getEnv("EMAIL_FROM"),
  },
});

export const config = appConfig();
