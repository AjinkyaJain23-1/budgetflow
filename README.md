# CulturalTune AI

Transform Any Song Into the Soul of Indian Culture.

CulturalTune AI is a full-stack platform that takes any uploaded song (or YouTube/Spotify link) and uses AI to recreate it in one of 8 authentic Indian regional folk styles (Rajasthani, Punjabi, Lavani, Baul, Sufi, Garba, Tamil, and Fusion).

## Architecture

- **Frontend**: Next.js 14, Tailwind CSS, Framer Motion, Zustand
- **Backend**: Python FastAPI, SQLAlchemy, Celery, Redis
- **Database**: PostgreSQL
- **Storage**: AWS S3
- **AI Pipeline** (via Celery workers):
  - **Demucs**: Separates vocals from instruments
  - **librosa**: Analyzes BPM, musical key, and chords
  - **MusicGen**: Generates cultural folk instrumental tracks based on custom prompts
  - **ffmpeg**: Mixes original vocals with the new AI-generated cultural backing track

## Quick Start (Docker)

The easiest way to run the entire stack locally is using Docker Compose.

1. Ensure Docker and Docker Compose are installed.
2. Clone the repository and navigate to the project root: `culturaltune-ai`.
3. Copy `.env.example` to `.env` and fill in the necessary API keys (optional for local mock dev).
4. Run the stack:
   ```bash
   docker-compose up --build
   ```
5. Access the application:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000/docs`

## AI Mock Mode

By default, the application runs with `MOCK_AI=true` in `docker-compose.yml` and `.env.example`. This allows you to develop and test the entire UI, backend, and Celery pipeline on a standard CPU machine without requiring heavy AI models or a GPU.

In mock mode:
- Demucs separation just copies the file.
- librosa returns mock BPM and Key data.
- MusicGen generates a placeholder silent audio file (or a sine wave).

**To run actual AI models (Requires GPU):**
1. Set `MOCK_AI=false`.
2. Ensure you have NVIDIA drivers, CUDA, and nvidia-docker installed.
3. Uncomment the `deploy` resources section under the `worker` service in `docker-compose.yml` to pass the GPU to the Celery worker container.
4. The worker will download the `facebook/musicgen-small` model upon the first transformation request.

## Important Notes

- **Spotify**: The Spotify API does not allow downloading audio. The app uses Spotipy to fetch metadata and falls back to searching YouTube for the audio.
- **YouTube Downloads**: Uses `yt-dlp`. Be aware that downloading YouTube audio for public commercial use violates YouTube ToS.
