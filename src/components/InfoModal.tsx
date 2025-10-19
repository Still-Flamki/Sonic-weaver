'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

export function InfoModal({ children }: { children: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-3xl">
            About The Audio Effects
          </DialogTitle>
          <DialogDescription>
            A breakdown of the technology and creative possibilities.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-6">
          <div className="prose prose-invert prose-p:text-muted-foreground prose-h4:text-foreground prose-h4:font-headline prose-h4:tracking-tight prose-headings:font-headline prose-headings:tracking-tight prose-strong:text-foreground">
            <h4>The Technology: Web Audio API & HRTF</h4>
            <p>
              This app uses the powerful{' '}
              <strong>Web Audio API</strong> built into modern browsers to
              manipulate audio in real-time. The core of the spatial effect comes
              from the <strong>PannerNode</strong>, which is set to the 'HRTF'
              (Head-Related Transfer Function) panning model.
            </p>
            <p>
              HRTF is a high-fidelity spatialization algorithm that simulates how
              our ears perceive sound in a 3D space. It accounts for tiny
              differences in timing, volume, and frequency between our left and
              right ears to create a convincing, immersive soundscape that you can
              perceive with any pair of standard headphones.
            </p>

            <Separator className="my-6" />

            <h4>Effect Breakdowns</h4>
            <p>
              <strong>4D: Wide Arc</strong>
              <br />
              This effect creates a clean, wide sweep in front of the listener.
              The sound moves in a semi-circle from far left to far right,
              providing a sense of width and movement without being overly
              distracting. It's great for adding a professional stereo polish to a
              track.
            </p>
            <p>
              <strong>8D: Circle</strong>
              <br />
              The classic "8D Audio" effect. The sound source orbits your head in a
              perfect 360-degree circle. This creates a continuous sense of motion
              and is popular for creating a hypnotic, engaging listening
              experience, especially in electronic and ambient music.
            </p>
            <p>
              <strong>11D: Figure-8</strong>
              <br />
              This is the most complex path, adding a vertical dimension to the
              movement. The sound travels in a figure-eight pattern, moving not
              just left-to-right but also up-and-down. This effect also includes
              dynamic gain and filtering—the sound gets quieter and darker when
              it's further away or behind you, creating a highly realistic and
              dynamic sense of space.
            </p>
            <p>
              <strong>Custom</strong>
              <br />
              This mode gives you direct control over the audio engine. You can
              mix and match parameters to design your own unique spatial effects,
              from subtle enhancements to wild, creative soundscapes.
            </p>
            
            <Separator className="my-6" />

            <h4>Custom Mode Preset Suggestions</h4>
            <p>
              These are starting points. Experiment to find what works for your
              track!
            </p>
            <p>
              <strong>Hip Hop / Beat Vocal:</strong>
              <br />
              For adding a sense of space to a vocal track over a beat.
              <br />
              - <strong>Movement:</strong> Wide Arc <br />
              - <strong>Speed:</strong> 2-3 (Slow) <br />
              - <strong>Width:</strong> 4-5 (Medium) <br />
              - <strong>Reverb:</strong> 0.1-0.2 (Subtle) <br />
              - <strong>EQ:</strong> Boost Bass slightly (+1dB), cut Mids slightly (-1dB).
            </p>
             <p>
              <strong>Rock / Guitar Solo:</strong>
              <br />
              To make a guitar solo soar and feel larger than life.
              <br />
              - <strong>Movement:</strong> Circle <br />
              - <strong>Speed:</strong> 4-5 (Moderate) <br />
              - <strong>Width:</strong> 7-8 (Wide) <br />
              - <strong>Reverb:</strong> 0.25-0.35 (Noticeable) <br />
              - <strong>EQ:</strong> Boost Mids and Treble (+2dB).
            </p>
            <p>
              <strong>Classical / Orchestral:</strong>
              <br />
              To enhance the sense of being in a large concert hall.
              <br />
              - <strong>Movement:</strong> Figure-8 <br />
              - <strong>Speed:</strong> 1-2 (Very Slow) <br />
              - <strong>Width:</strong> 9-10 (Very Wide) <br />g
              - <strong>Reverb:</strong> 0.4-0.6 (Hall-like) <br />
              - <strong>EQ:</strong> Flat (0dB on all bands), or a slight Treble boost (+1dB).
            </p>
            <p>
              <strong>Electronic / Synth Pad:</strong>
              <br />
              Create a swirling, atmospheric texture.
              <br />
              - <strong>Movement:</strong> Figure-8 or Circle <br />
              - <strong>Speed:</strong> 6-8 (Fast) <br />
              - <strong>Width:</strong> 6-7 (Wide) <br />
              - <strong>Reverb:</strong> 0.5+ (Heavy) <br />
              - <strong>EQ:</strong> Cut Bass (-2dB), boost Treble (+2dB).
            </p>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
