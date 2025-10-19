'use server';

import {ai} from '@/ai/genkit';
import {processAudioFlow, ProcessAudioInput} from '@/ai/flows/process-audio-flow';

export async function processAudio(input: ProcessAudioInput) {
  const result = await processAudioFlow(input);
  return result;
}
