'use server';
/**
 * @fileOverview An AI flow for generating custom spatial audio presets.
 *
 * - generateAudioPreset - A function that calls the Genkit flow to create a preset.
 * - GeneratePresetInput - The input type for the flow.
 * - GeneratePresetOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const GeneratePresetInputSchema = z.object({
  musicDescription: z.string().describe('A description of the music track. e.g., "fast-paced electronic song with a heavy bassline" or "slow ambient piano music"'),
  style: z.enum(['Subtle', 'Dynamic', 'Immersive', 'Experimental']).describe('The desired intensity or style of the spatial effect.'),
});
export type GeneratePresetInput = z.infer<typeof GeneratePresetInputSchema>;

export const GeneratePresetOutputSchema = z.object({
  effectType: z
    .enum(['4D', '8D', '11D', 'Custom'])
    .describe('The base effect type. Use "Custom" for unique generated paths.'),
  path: z.object({
    name: z.enum(['circular', 'figure-eight', 'lissajous', 'infinity', 'wide-arc'])
      .describe('The geometric shape of the audio path.'),
    duration: z.number().min(2).max(20).describe('The time in seconds for one full loop of the path. Shorter is faster.'),
  }),
  automation: z.object({
    gain: z.boolean().describe('Whether to apply dynamic volume changes based on the path.'),
    filter: z.boolean().describe('Whether to apply dynamic EQ filtering based on the path.'),
    reverb: z.boolean().describe('Whether to apply reverb to create a sense of space.'),
    reverbAmount: z.number().min(0.0).max(1.0).describe('The amount of reverb to apply, from 0 (none) to 1 (full). Only applies if reverb is true.'),
  }),
  explanation: z.string().describe('A brief, user-friendly explanation of why this preset was chosen for the described music.'),
});
export type GeneratePresetOutput = z.infer<typeof GeneratePresetOutputSchema>;

export async function generateAudioPreset(
  input: GeneratePresetInput
): Promise<GeneratePresetOutput> {
  return generateAudioPresetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateAudioPresetPrompt',
  input: { schema: GeneratePresetInputSchema },
  output: { schema: GeneratePresetOutputSchema },
  prompt: `You are a world-class audio engineer specializing in spatial audio (8D, 11D, etc.). Your task is to create a custom spatial audio preset based on a description of a music track and a desired style.

Analyze the user's input and generate a professional, high-quality audio preset.

- For 'Subtle', prefer simpler paths like 'wide-arc' or 'circular' with longer durations and minimal automation.
- For 'Dynamic', use more complex paths and enable gain and filter automation.
- For 'Immersive', a 'circular' path with reverb is a good choice.
- For 'Experimental', you can use more complex paths like 'lissajous' and be creative with automation.
- Match the path duration to the music's tempo. Faster music should have shorter durations.

Music Description: {{{musicDescription}}}
Desired Style: {{{style}}}

Generate the JSON output with the ideal preset and a brief, friendly explanation for the user.`,
});

const generateAudioPresetFlow = ai.defineFlow(
  {
    name: 'generateAudioPresetFlow',
    inputSchema: GeneratePresetInputSchema,
    outputSchema: GeneratePresetOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
