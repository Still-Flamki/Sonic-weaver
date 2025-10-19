'use client';

import { useState } from 'react';
import AudioProcessor from '@/components/AudioProcessor';
import PresetEnhancer from '@/components/PresetEnhancer';

export type EffectType = '4D' | '8D' | '11D';

export default function SonicWeaverApp() {
  const [effectType, setEffectType] = useState<EffectType>('8D');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <div className="lg:col-span-3">
          <AudioProcessor
            effectType={effectType}
            setEffectType={setEffectType}
            audioFile={audioFile}
            setAudioFile={setAudioFile}
          />
        </div>
        <div className="lg:col-span-2">
          <PresetEnhancer effectType={effectType} audioFile={audioFile} />
        </div>
      </div>
    </div>
  );
}
