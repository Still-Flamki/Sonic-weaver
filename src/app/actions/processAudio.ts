'use server';

import {processAudio, ProcessAudioInput} from '@/ai/flows/process-audio-flow';

export async function processAudioAction(input: ProcessAudioInput) {
  const result = await processAudio(input);
  return result;
}
