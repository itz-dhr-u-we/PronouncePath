from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    current_tier = Column(String, default="Beginner")  # Beginner, Intermediate, Advanced
    beginner_xp = Column(Integer, default=0)
    intermediate_xp = Column(Integer, default=0)
    advanced_xp = Column(Integer, default=0)
    xp = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    attempts = relationship("AttemptHistory", back_populates="user")

class AttemptHistory(Base):
    __tablename__ = "attempt_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    tier = Column(String, nullable=False, default="Beginner")
    sentence = Column(String, nullable=False)
    score = Column(Float, nullable=False)
    duration = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="attempts")