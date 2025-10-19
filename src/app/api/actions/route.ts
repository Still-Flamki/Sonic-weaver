import {createNextApi} from '@genkit-ai/next';
import {processAudioFlow} from '@/ai/flows/process-audio-flow';

export const POST = createNextApi({
  flows: [processAudioFlow],
});
