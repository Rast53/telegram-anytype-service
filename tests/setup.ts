process.env.NODE_ENV = "test";
process.env.BOT_TOKEN = process.env.BOT_TOKEN || "123456789:TEST_TOKEN_EXAMPLE";
process.env.TELEGRAM_ALLOWED_USER_IDS = process.env.TELEGRAM_ALLOWED_USER_IDS || "1";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
process.env.ANYTYPE_SPACE_ID = process.env.ANYTYPE_SPACE_ID || "test-space";
