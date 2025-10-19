import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;

const loadFFmpeg = async () => {
    if (ffmpeg) return ffmpeg;

    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
        // console.log(message);
    });
     ffmpeg.on('progress', ({ progress }) => {
        self.postMessage({
            type: 'conversion-progress',
            progress: Math.max(0, Math.min(1, progress)),
        });
    });

    // These URLs are stable and recommended for wasm version
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
        coreURL: await fetchFile(`${baseURL}/ffmpeg-core.js`),
        wasmURL: await fetchFile(`${baseURL}/ffmpeg-core.wasm`),
    });
    return ffmpeg;
};

self.onmessage = async (event) => {
    const { type, data } = event.data;

    if (type === 'convert') {
        try {
            const ffmpegInstance = await loadFFmpeg();
            const inputName = 'input.webm';
            const outputName = 'output.mp4';
            
            await ffmpegInstance.writeFile(inputName, new Uint8Array(data));

            // Run FFmpeg command to convert webm to mp4
            // -i: input file
            // -c:v copy: copies the video stream without re-encoding (fast)
            // -c:a aac: re-encodes the audio to AAC, which is standard for mp4
            // -b:a 192k: audio bitrate
            await ffmpegInstance.exec(['-i', inputName, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', outputName]);

            const outputData = await ffmpegInstance.readFile(outputName);
            
            await ffmpegInstance.deleteFile(inputName);
            await ffmpegInstance.deleteFile(outputName);

            self.postMessage({
                type: 'conversion-complete',
                data: (outputData as Uint8Array).buffer,
            }, [(outputData as Uint8Array).buffer]);

        } catch (error: any) {
            self.postMessage({
                type: 'conversion-error',
                error: error.message,
            });
        }
    }
};

export {};
