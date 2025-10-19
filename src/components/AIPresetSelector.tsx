'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Wand, Sparkles, Music } from 'lucide-react';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export default function AIPresetSelector() {
  return (
    <Card className="shadow-lg bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl tracking-tight flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            AI Preset Generation
        </CardTitle>
        <CardDescription>Let AI craft the perfect spatial effect for your track.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="music-description">Describe your music</Label>
          <Textarea 
            id="music-description"
            placeholder='e.g., "A fast-paced electronic song with a heavy bassline."'
            className='bg-background/50'
          />
        </div>
        <div className="space-y-2">
            <Label htmlFor="style-select">Select a style</Label>
            <Select>
                <SelectTrigger id="style-select" className='bg-background/50'>
                    <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="Subtle">Subtle</SelectItem>
                    <SelectItem value="Dynamic">Dynamic</SelectItem>
                    <SelectItem value="Immersive">Immersive</SelectItem>
                    <SelectItem value="Experimental">Experimental</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <Button disabled className='w-full'>
          <Wand className="mr-2 h-4 w-4" />
          Generate with AI
        </Button>
      </CardContent>
    </Card>
  );
}
