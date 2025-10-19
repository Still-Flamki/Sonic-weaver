'use client';

import { useState } from 'react';
import AudioProcessor from '@/components/AudioProcessor';
import AIPresetSelector from './AIPresetSelector';
import { Separator } from './ui/separator';

export type EffectType = '4D' | '8D' | '11D' | 'AI';

export default function SonicWeaverApp() {
  const [effectType, setEffectType] = useState<EffectType>('8D');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <AudioProcessor
            effectType={effectType}
            setEffectType={setEffectType}
            audioFile={audioFile}
            setAudioFile={setAudioFile}
          />
        </div>
        <div className="md:col-span-1">
            <AIPresetSelector />
        </div>
      </div>
    </div>
  );
}
