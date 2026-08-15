# PronouncePath
PronouncePath is a full-stack gamified web application designed to help users improve their pronunciation, speech fluency, and phonetics. Built with a modern tech stack, it evaluates real-time microphone recordings against target sentences, tracks user progression through tiers, and provides detailed word-by-word feedback.


# Key Features
1. Speech Evaluation: Uses machine learning models (`Wav2Vec2`) to analyze audio and score pronunciation accuracy.
2. Gamified Progression: Earn XP as you practice, unlock new tiers (Beginner , Intermediate , Advanced), and track your growth.
3. Phonetic Breakdown: Visual word-by-word comparison using G2P (Grapheme-to-Phoneme) mapping to show which sounds were correct or missed.
4. Smart Audio Guard: Automatically detects and blocks blank recordings or background silence to prevent false scoring.
5. Attempt History: Logs past practice sessions so users can review their progress over time.


# Tech Stack
* Frontend: React, Vite, JavaScript, CSS
* Backend: FastAPI, Python, PyTorch, SQLAlchemy
* Database: SQLite
* AI/NLP: Hugging Face Transformers (`Wav2Vec2`), `g2p_en`, PyAV (Audio Processing)
