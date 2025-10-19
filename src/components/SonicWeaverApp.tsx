'use client';

import { useState } from 'react';
import AudioProcessor from '@/components/AudioProcessor';

export type EffectType = '4D' | '8D' | '11D' | 'Custom' | 'Reactive';

export default function SonicWeaverApp() {
  const [effectType, setEffectType] = useState<EffectType>('8D');
  const [audioFile, setAudioFile] = useState<File | null>(null);

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <AudioProcessor
          effectType={effectType}
          setEffectType={setEffectType}
          audioFile={audioFile}
          setAudioFile={setAudioFile}
        />
      </div>
    </div>
  );
}
