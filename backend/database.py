from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker


DATABASE_URL = "postgresql://postgres:rohit14@localhost:5432/netshield_db"


engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


try:
    with engine.connect() as connection:
        print("Database connected successfully!")
except Exception as e:
    print("Database connection failed:")
    print(e)
    
  