from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from pydantic import BaseModel
from g2p_en import G2p
import torch
import torchaudio
import io
import av
import numpy as np
import random
import urllib.request
import json
import ssl
from difflib import SequenceMatcher

from transformers import Wav2Vec2Processor, Wav2Vec2ForCTC

from backend.database import engine, Base, get_db
from backend.models import User

# Initialize FastAPI App
app = FastAPI(title="PronouncePath API", version="1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize G2P & Wav2Vec2 Machine Learning Models
g2p = G2p()
processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
model = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h")
model.eval()

# Create database tables automatically on startup
Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# Pydantic Request Schemas
class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class ProgressUpdate(BaseModel):
    username: str
    tier: str
    earned_xp: int
    score: float
    sentence: str
    duration: float


@app.get("/")
def home():
    return {"message": "PronouncePath API is running successfully!"}


@app.post("/signup")
def sign_up(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == user_data.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_pw = pwd_context.hash(user_data.password)
    new_user = User(username=user_data.username, hashed_password=hashed_pw)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"message": "User created successfully", "username": new_user.username}

@app.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == user_data.username).first()
    if not user or not pwd_context.verify(user_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    return {
        "message": "Login successful", 
        "username": user.username, 
        "current_tier": user.current_tier, 
        "xp": user.xp
    }

@app.post("/update-progress")
def update_progress(data: ProgressUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # save the attempt to history
    from backend.models import AttemptHistory
    new_attempt = AttemptHistory(
        user_id=user.id,
        tier=data.tier,
        sentence=data.sentence,
        score=data.score,
        duration=data.duration
    )
    db.add(new_attempt)

    # adding to total_xp and tier based xp
    user.xp += data.earned_xp
    if data.tier == "Beginner":
        user.beginner_xp += data.earned_xp
    elif data.tier == "Intermediate":
        user.intermediate_xp += data.earned_xp
    elif data.tier == "Advanced":
        user.advanced_xp += data.earned_xp
        
    # checks to unlock
    if user.beginner_xp >= 500 and user.current_tier == "Beginner":
        user.current_tier = "Intermediate"
    elif user.intermediate_xp >= 1200 and user.current_tier == "Intermediate":
        user.current_tier = "Advanced"
        
    db.commit()
    db.refresh(user)
    
    return {
        "xp": user.xp,
        "current_tier": user.current_tier,
        "beginner_xp": user.beginner_xp,
        "intermediate_xp": user.intermediate_xp,
        "advanced_xp": user.advanced_xp
    }

@app.get("/history/{username}")
def get_user_history(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Querying all attempts of the user, ordered by most recent first
    from backend.models import AttemptHistory
    attempts = db.query(AttemptHistory).filter(AttemptHistory.user_id == user.id).order_by(AttemptHistory.timestamp.desc()).all()
    
    return [
        {
            "id": a.id,
            "tier": a.tier,
            "sentence": a.sentence,
            "score": a.score,
            "duration": a.duration,
            "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M")
        }
        for a in attempts
    ]

@app.get("/get-random-sentence")
def get_random_sentence(tier: str = "Beginner"):
    length_params = {
        "Beginner": {"min": 40, "max": 80},
        "Intermediate": {"min": 100, "max": 200},
        "Advanced": {"min": 250, "max": 400}
    }
    
    params = length_params.get(tier, length_params["Beginner"])
    
    try:
        ssl_context = ssl._create_unverified_context()
        url = f"https://api.quotable.io/random?minLength={params['min']}&maxLength={params['max']}"
        
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        
        with urllib.request.urlopen(req, context=ssl_context) as response:
            data = json.loads(response.read().decode())
            sentence = data.get("content", "The quick brown fox jumps over the lazy dog.")
            author = data.get("author", "Unknown")
            
            return {
                "sentence": sentence,
                "focus": f"{tier} Level • Live Quote by {author}"
            }
            
    except Exception as e:
        print("Internet fetch failed, falling back to local tier pool:", e)
        tier_fallbacks = {
            "Beginner": [
                {"sentence": "The rain in Spain stays mainly in the plain.", "focus": "Beginner Vowels"}
            ],
            "Intermediate": [
                {"sentence": "Specific Pacific traffic statistics can become problematic.", "focus": "Intermediate Multisyllabic"}
            ],
            "Advanced": [
                {"sentence": "Pad pended plummet plummeting punctuated by particulate particles.", "focus": "Advanced Consonants"}
            ]
        }
        fallback_pool = tier_fallbacks.get(tier, tier_fallbacks["Beginner"])
        return random.choice(fallback_pool)


@app.post("/evaluate-speech")
async def evaluate_speech(
    audio: UploadFile = File(...),
    target_text: str = Form(...)
):
    try:
        audio_bytes = await audio.read()
        
        container = av.open(io.BytesIO(audio_bytes))
        stream = container.streams.audio[0]
        
        frames = []
        for frame in container.decode(stream):
            frames.append(frame.to_ndarray())
            
        if not frames:
            return {"error": "No audio frames found in stream"}, 400
            
        audio_data = np.concatenate(frames, axis=1)
        audio_data = audio_data.astype(np.float32)
        if audio_data.max() > 1.0 or audio_data.min() < -1.0:
            audio_data /= 32768.0
            
        waveform = torch.tensor(audio_data)
        sample_rate = stream.rate

        if sample_rate != 16000:
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)

        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)

        inputs = processor(waveform.squeeze().numpy(), sampling_rate=16000, return_tensors="pt", padding=True)
        with torch.no_grad():
            logits = model(inputs.input_values).logits
            predicted_ids = torch.argmax(logits, dim=-1)
            transcription = processor.decode(predicted_ids[0]).lower()

        words = target_text.split()
        recognized_words = transcription.split()
        
        clean_target_words = ["".join(filter(str.isalnum, w)).lower() for w in words]
        clean_rec_words = ["".join(filter(str.isalnum, w)).lower() for w in recognized_words]

        matcher = SequenceMatcher(None, clean_target_words, clean_rec_words)
        
        word_breakdown = []
        matched_count = 0
        matched_target_indices = set()
        match_mapping = {}
        
        for block in matcher.get_opcodes():
            tag, i1, i2, j1, j2 = block
            if tag == 'equal':
                for idx in range(i2 - i1):
                    t_idx = i1 + idx
                    r_idx = j1 + idx
                    matched_target_indices.add(t_idx)
                    match_mapping[t_idx] = r_idx
            elif tag == 'replace':
                for idx in range(min(i2 - i1, j2 - j1)):
                    t_idx = i1 + idx
                    r_idx = j1 + idx
                    t_word = clean_target_words[t_idx]
                    r_word = clean_rec_words[r_idx]
                    if len(set(t_word).intersection(set(r_word))) >= len(t_word) * 0.4:
                        matched_target_indices.add(t_idx)
                        match_mapping[t_idx] = r_idx

        for i, word in enumerate(words):
            target_phoneme_list = g2p(word)
            target_ipa = " ".join(target_phoneme_list)
            
            is_matched = i in matched_target_indices
            rec_word = ""
            recognized_ipa = ""
            
            if is_matched and i in match_mapping:
                r_idx = match_mapping[i]
                if r_idx < len(recognized_words):
                    rec_word = recognized_words[r_idx]
                    recognized_ipa = " ".join(g2p(rec_word))
            else:
                rec_word = "(missed)"
                recognized_ipa = "-"

            word_breakdown.append({
                "word": word,
                "recognized_word": rec_word,
                "status": "green" if is_matched else "red",
                "target_ipa": target_ipa,
                "recognized_ipa": recognized_ipa
            })
            if is_matched:
                matched_count += 1

        ratio = (matched_count / max(len(words), 1)) * 100
        
        audio_duration_seconds = waveform.shape[1] / 16000
        audio_length_factor = min(100.0, audio_duration_seconds * 15)
        overall_score = round(min(98.0, max(30.0, (ratio * 0.7) + (audio_length_factor * 0.3))), 1)

        pacing_feedback = "Great pronunciation!"
        if audio_duration_seconds < (len(words) * 0.15):
            pacing_feedback = "You spoke quite fast, which can clip words. Try speaking a bit slower and more deliberately."
        elif ratio < 50:
            pacing_feedback = "Some words were missed or unclearly enunciated. Remember to give a brief pause before starting to record!"
        elif overall_score > 80:
            pacing_feedback = "Excellent pacing and clear enunciation!"

        return {
            "overall_score": overall_score,
            "word_breakdown": word_breakdown,
            "recognized_text": transcription,
            "feedback": pacing_feedback,
            "duration_seconds": round(audio_duration_seconds, 2)
        }

    except Exception as e:
        print("Error processing audio via PyAV:", str(e))
        return {"error": str(e)}, 500