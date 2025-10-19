'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { enhanceEffectWithPresets, EnhanceEffectWithPresetsInput } from '@/ai/flows/enhance-effect-with-presets';
import { Sparkles, RotateCw } from 'lucide-react';
import type { EffectType } from './SonicWeaverApp';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  songName: z.string().min(2, { message: 'Song name must be at least 2 characters.' }),
  stylePreferences: z.string().min(10, { message: 'Please describe the style in at least 10 characters.' }),
});

interface PresetEnhancerProps {
  effectType: EffectType;
  audioFile: File | null;
}

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref.current;
}

export default function PresetEnhancer({ effectType, audioFile }: PresetEnhancerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      songName: '',
      stylePreferences: '',
    },
  });

  const previousAudioFile = usePrevious(audioFile);
  useEffect(() => {
    if (audioFile && audioFile !== previousAudioFile) {
      const songName = audioFile.name.replace(/\.[^/.]+$/, "");
      form.setValue('songName', songName, { shouldValidate: true });
    }
  }, [audioFile, previousAudioFile, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);

    const aiInput: EnhanceEffectWithPresetsInput = {
      ...values,
      effectType,
    };

    try {
      const response = await enhanceEffectWithPresets(aiInput);
      const parsedResult = JSON.parse(response.refinedEffectSettings);
      setResult(JSON.stringify(parsedResult, null, 2));
    } catch (error) {
      console.error('AI Enhancement Error:', error);
      toast({
        title: 'Enhancement Failed',
        description: 'Could not generate refined settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full shadow-lg border-border/50 bg-card/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline text-2xl flex items-center gap-2">
          <Sparkles className="text-primary w-6 h-6" />
          <span>AI Preset Enhancer</span>
        </CardTitle>
        <CardDescription>Refine your chosen effect with AI-powered suggestions.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="songName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Song Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Bohemian Rhapsody" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stylePreferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Style Preferences</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Cinematic, bass-heavy, with a wide soundstage and clear vocals."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {result && (
              <div className="space-y-2">
                <Label>AI Generated Settings</Label>
                <pre className="w-full rounded-md bg-muted p-4 text-sm text-muted-foreground overflow-x-auto">
                  <code>{result}</code>
                </pre>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <>
                  <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Enhance with AI'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
