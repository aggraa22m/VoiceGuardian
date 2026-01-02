# VoiceGuardian Technical Documentation

This document outlines the architecture, data flow, and engineering principles behind the VoiceGuardian application.

## 🏗 Architecture Overview

VoiceGuardian is a React-based single-page application (SPA) that leverages the **Gemini 2.5 Flash Native Audio** model via the `@google/genai` Live API.

### Tech Stack
- **Frontend**: React 19 (ESM)
- **Styling**: Tailwind CSS (Utility-first UI)
- **AI Core**: Google Gemini Live API (`gemini-2.5-flash-native-audio-preview-09-2025`)
- **Audio Processing**: Web Audio API (AudioContext, AnalyserNode, ScriptProcessor)

## 🎙 Audio Engineering

The app uses a dual-context audio strategy to handle full-duplex communication.

### 1. Input Processing (User)
- **Sample Rate**: 16,000 Hz (Model standard).
- **Process**: Captures raw PCM data from `getUserMedia`, converts it to 16-bit Int16 via `createPcmBlob`, and streams it to the model in chunks of 4096 samples.
- **Visual Feedback**: An `AnalyserNode` calculates the Root Mean Square (RMS) of the input buffer to trigger the outer "ping" animation on the UI.

### 2. Output Processing (AI)
- **Sample Rate**: 24,000 Hz.
- **Process**: Receives base64-encoded PCM chunks from the model. Decodes them into an `AudioBuffer` and schedules them using a `nextStartTime` cursor to ensure gapless playback.
- **Synchronization**: A dedicated `AnalyserNode` attached to the output destination provides real-time frequency data for the "Radial Spikes" visualizer.

## 🔮 UI & Visualization Logic

The **Celestial Orb** is a complex CSS/SVG hybrid component.

- **Radial Spikes**: Rendered via a `RadialSpikes` component that maps 32 divs in a circle. The `height` and `opacity` of each spike are recalculated every animation frame based on the `outVol` (Output Volume) state.
- **Orbital Physics**: Uses CSS keyframe animations for the X/Y rotation of rings, creating a 3D depth effect without the overhead of WebGL.
- **Atmospheric Particles**: A set of absolute-positioned divs with randomized `animation-delay` and `float` paths to simulate depth.

## 🧠 Prompt Engineering

The system instruction is dynamically injected based on the selected `GuardianMode`. It enforces strict behavioral constraints:
- **Conciseness**: Mandatory 1-2 sentence limit.
- **Repetition Control**: Specific negative constraints to prevent the model from echoing user input.
- **Patience**: Instruction to allow for user pauses, mitigating "rushed" responses common in real-time LLMs.

## 🔄 Data Flow

1. **User Action**: Clicks "Begin Communion".
2. **Session Init**: `ai.live.connect` establishes a WebSocket connection.
3. **Stream Loop**:
    - `onaudioprocess` -> `sendRealtimeInput` (User -> AI)
    - `onmessage` (Audio) -> `decodeAudioData` -> `source.start()` (AI -> User)
    - `onmessage` (Transcription) -> React State Update (Text History)
4. **Visual Loop**: `requestAnimationFrame` -> `getByteFrequencyData` -> Update Orb Props.

## 🛠 Troubleshooting & Retries

- **Race Conditions**: The application uses a `sessionPromise` pattern to ensure that no `sendRealtimeInput` calls are made before the socket is fully opened.
- **Interruption Handling**: When the model sends an `interrupted` server message, the local audio queue is immediately flushed using `source.stop()` to prevent overlapping speech.

---
*Developed with a focus on low-latency emotional resonance.*