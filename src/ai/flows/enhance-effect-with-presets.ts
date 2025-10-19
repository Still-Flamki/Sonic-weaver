'use server';
/**
 * @fileOverview An AI agent that enhances the 3D audio effect based on song and style selections.
 *
 * - enhanceEffectWithPresets - A function that takes song and style preferences to refine the 3D audio effect.
 * - EnhanceEffectWithPresetsInput - The input type for the enhanceEffectWithPresets function.
 * - EnhanceEffectWithPresetsOutput - The return type for the enhanceEffectWithPresets function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const EnhanceEffectWithPresetsInputSchema = z.object({
  songName: z.string().describe('The name of the song to be processed.'),
  effectType: z.enum(['4D', '8D', '11D']).describe('The type of 3D audio effect to apply.'),
  stylePreferences: z.string().describe('User preferences for the audio style, such as genre or mood.'),
});
export type EnhanceEffectWithPresetsInput = z.infer<typeof EnhanceEffectWithPresetsInputSchema>;

const EnhanceEffectWithPresetsOutputSchema = z.object({
  refinedEffectSettings: z.string().describe('JSON string of refined audio effect settings based on the inputs.'),
});
export type EnhanceEffectWithPresetsOutput = z.infer<typeof EnhanceEffectWithPresetsOutputSchema>;

export async function enhanceEffectWithPresets(
  input: EnhanceEffectWithPresetsInput
): Promise<EnhanceEffectWithPresetsOutput> {
  return enhanceEffectWithPresetsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'enhanceEffectWithPresetsPrompt',
  input: {schema: EnhanceEffectWithPresetsInputSchema},
  output: {schema: EnhanceEffectWithPresetsOutputSchema},
  prompt: `You are an AI audio engineer specializing in 3D audio effects. A user has requested a specific 3D audio effect for their song. Given the song name, effect type, and style preferences, generate refined audio effect settings to enhance the listening experience. The output should be a JSON string that can be parsed.

Song Name: {{{songName}}}
Effect Type: {{{effectType}}}
Style Preferences: {{{stylePreferences}}}

Refined Effect Settings (JSON string):`,
});

const enhanceEffectWithPresetsFlow = ai.defineFlow(
  {
    name: 'enhanceEffectWithPresetsFlow',
    inputSchema: EnhanceEffectWithPresetsInputSchema,
    outputSchema: EnhanceEffectWithPresetsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
