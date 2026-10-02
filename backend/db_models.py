from sqlalchemy import Column, Integer, String, Float, DateTime, JSON
from datetime import datetime

try:                                #just becuase i want the run button to give thats why 
    from backend.database import Base    #used for fastapi
except ModuleNotFoundError:
    from database import Base       #used for normal run


class Alert(Base):

    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)

    timestamp = Column(
        DateTime,
        default=datetime.now
    )

    attack_type = Column(String)

    risk_score = Column(Float)

    severity = Column(String)

    status = Column(String,default="OPEN")
    
    binary_confidence = Column(Float)

    attack_confidence = Column(Float)

    traffic_intensity = Column(Float)

    attack_frequency = Column(Float)

    persistence = Column(Float)

    risk_factors = Column(JSON)

    traffic_data = Column(JSON)
    
    source = Column(String)

    source_file = Column(String)
    
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(
        String,
        unique=True,
        index=True,
        nullable=False
    )

    password_hash = Column(
        String,
        nullable=False
    )

    role = Column(
        String,
        nullable=False,
        default="viewer"
    )    