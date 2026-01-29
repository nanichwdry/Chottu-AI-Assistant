# Chottu AI Assistant 🤖

Chottu is a high-performance, low-latency AI personal assistant powered by the Gemini 2.5 Flash Native Audio API. Designed for real-world efficiency, Chottu handles voice commands, manages integrations, and provides a sleek, futuristic interface.

## ✨ Features

- **Real-Time Voice Interaction**: Sub-second response times using raw PCM audio streaming.
- **Intelligent Tooling**:
    - 📧 **Outlook/Gmail**: Fetch, search, and summarize your latest emails.
    - 🔗 **LinkedIn**: Check notifications and network requests.
    - 💻 **Laptop OS Control**: Execute system-level tasks and file searches via a simulated bridge.
- **Adaptive Persona**: Switches between concise "Daily Mode" (1-3 witty sentences) and "Deep Dive" mode for complex tasks.
- **Technical Terminal**: Technical data and code snippets are automatically diverted to a dedicated UI terminal for clarity.
- **Dynamic Visualization**: A custom-built SVG/Canvas visualizer that reacts to voice frequencies and system states.

## 🚀 Tech Stack

- **Framework**: React 19 (ESM)
- **AI Engine**: Google GenAI SDK (@google/genai)
- **Model**: `gemini-2.5-flash-native-audio-preview-12-2025`
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Audio**: Custom Web Audio API implementation for raw PCM decoding/encoding.

## 🛠️ Getting Started

### Prerequisites

- A Gemini API Key from [Google AI Studio](https://aistudio.google.com/).
- A modern web browser with Microphone permissions enabled.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/nanichwdry/Chottu-AI-Assistant.git
   ```
2. Open `index.html` in your browser (or serve it via a local dev server like `npx serve`).
3. Ensure your `API_KEY` is configured in your environment variables.

## 🔧 Configuration

Chottu is built to be production-ready out of the box. Key performance tweaks include:
- **Audio Buffer**: Optimized to 1024 samples for minimal latency.
- **VAD (Voice Activity Detection)**: Custom instructional heuristics to prevent "long-silence" waiting.

## 📜 License

MIT License. Free to use and modify.

---
*Built with ❤️ by Chottu AI Team.*
