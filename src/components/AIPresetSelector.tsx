'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Wand, Sparkles, Music } from 'lucide-react';

export default function AIPresetSelector() {
  return (
    <Card className="shadow-lg bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Preset Selection
        </CardTitle>
        <CardDescription>Let AI craft the perfect spatial effect for your track.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">This tool is coming soon!</p>
            <p className="text-sm text-muted-foreground">You will be able to select a song and a style, and our AI will generate a custom spatial audio preset for you.</p>
        </div>
        <Button disabled className='w-full'>
          <Wand className="mr-2 h-4 w-4" />
          Generate Preset
        </Button>
      </CardContent>
    </Card>
  );
}
