import { genkit } from '@genkit-ai/next';
import { googleAI } from '@genkit-ai/google-genai';
import {GEMINI_API_KEY} from '@/lib/config';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: GEMINI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
