from backend.database import Base, engine
from backend.db_models import Alert, User

Base.metadata.create_all(bind=engine)

print("Database tables created successfully!")

