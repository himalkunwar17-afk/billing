import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';

// Load environment-specific file first, then optional .env fallback without overwriting explicit env vars
dotenv.config({ path: path.join(rootDir, envFile), override: false });
dotenv.config({ path: path.join(rootDir, '.env'), override: false });

export { nodeEnv, envFile, rootDir };
