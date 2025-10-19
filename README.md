# Sonic Weaver

Sonic Weaver is a web application that allows you to transform standard audio files into immersive spatial audio experiences. Using the power of the Web Audio API, you can apply 4D, 8D, and 11D effects, or create your own custom soundscapes in real-time.

## Features

*   **Spatial Audio Processor**: Upload any audio track and apply unique spatial effects.
*   **Multiple Effect Types**: Choose from presets like **4D (Wide Arc)**, **8D (Circle)**, and **11D (Figure-8)**.
*   **Custom Mode**: Fine-tune the audio with controls for movement path, speed, width, reverb, and a 3-band EQ.
*   **Real-time Preview**: Listen to the changes as you make them with a looping preview.
*   **Download Processed Audio**: Render and download your creation as a high-quality `.wav` file.
*   **Interactive Demo**: Instantly toggle between original mono audio and the processed 11D effect to hear the difference.
*   **Spatial Sound Game**: Test your ears with a fun game where you have to pinpoint the location of a sound.

## Technology Stack

This project is built with modern web technologies to create a fast and interactive experience, all running directly in your browser.

*   **Frontend**: [Next.js](https://nextjs.org/) (with App Router) and [React](https://react.dev/).
*   **Audio Processing**: All audio manipulation is handled client-side using the **Web Audio API**, primarily leveraging the `PannerNode` with the `HRTF` (Head-Related Transfer Function) model for high-fidelity 3D sound.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
*   **UI Components**: A beautiful and accessible component library built with [ShadCN UI](https://ui.shadcn.com/).

## Getting Started

To get the project running locally, follow these steps:

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Run the development server**:
    ```bash
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can start by exploring the components on the home page at `src/app/page.tsx` or dive into the main application logic in `src/app/app/page.tsx`.
