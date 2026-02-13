import os
from pathlib import Path

from sqlmodel import SQLModel, create_engine

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'app.db'}")

engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
