"""벡터 임베딩 모델 로딩 및 인코딩 공통 유틸리티."""
import html
import re
import threading
from pathlib import Path

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.config import Config

_DEFAULT_MODEL = "kure-v1"

_BASE_DIR = Path(__file__).parent.parent.parent
_MODELS_DIR = _BASE_DIR / "models"
_MODEL_PATHS = {
    "klue-sbert":    _MODELS_DIR / "klue-sbert",
    "kure-v1":       _MODELS_DIR / "kure-v1",
    "kure-v1-split": _MODELS_DIR / "kure-v1",  # kure-v1 별칭 (청크 분할 사용 설정)
}

_MODEL_CACHE: dict = {}
_MODEL_LOCK = threading.Lock()

AVAILABLE_MODELS = {
    "klue-sbert": {
        "name": "KLUE SBERT (기존)",
        "dimension": 768,
        "speed": "중간",
        "accuracy": "높음",
        "size": "로컬캐시",
    },
    "kure-v1": {
        "name": "KURE-v1 (한국어 특화 고성능)",
        "dimension": 1024,
        "speed": "느림",
        "accuracy": "매우 높음",
        "size": "로컬캐시",
    },
    "kure-v1-split": {
        "name": "KURE-v1 Split (청크 분할)",
        "dimension": 1024,
        "speed": "느림",
        "accuracy": "매우 높음",
        "size": "로컬캐시",
    },
}


def _get_model_instance(model_name: str):
    """모델 인스턴스 획득 (로컬 경로 로드, 캐싱, 스레드 안전)."""
    if model_name not in AVAILABLE_MODELS:
        raise ValueError(f"Unknown model: {model_name}")

    if model_name in _MODEL_CACHE:
        return _MODEL_CACHE[model_name]

    with _MODEL_LOCK:
        if model_name in _MODEL_CACHE:
            return _MODEL_CACHE[model_name]

        try:
            from sentence_transformers import SentenceTransformer

            model_path = _MODEL_PATHS.get(model_name)
            if not model_path or not Path(model_path).exists():
                raise FileNotFoundError(
                    f"Model not found at: {model_path}\n"
                    f"Please ensure the model is downloaded to the models/ directory."
                )

            print(f"[INFO] Loading {model_name} from {model_path}...")
            model = SentenceTransformer(str(model_path))
            _MODEL_CACHE[model_name] = model
            print(f"[INFO] {model_name} loaded successfully")
            return model
        except ImportError:
            raise RuntimeError("sentence-transformers not installed. Run: pip install sentence-transformers")
        except FileNotFoundError as e:
            raise RuntimeError(str(e))
        except Exception as e:
            raise RuntimeError(f"Failed to load {model_name}: {str(e)}")


def _normalize_text(text: str) -> str:
    """텍스트 정규화 (HTML 엔티티 + 태그 제거, 공백 정리)."""
    text = str(text or "")
    text = html.unescape(text)
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def chunk_text(text: str, max_chars: int = 900, overlap: int = 120) -> list[str]:
    """텍스트를 청크로 분할 (오버랩 포함)."""
    text = _normalize_text(text)
    if not text:
        return []
    if len(text) <= max_chars:
        return [text]

    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + max_chars)
        chunks.append(text[start:end].strip())
        if end >= len(text):
            break
        start = max(0, end - overlap)
    return [c for c in chunks if c]


def _get_encoder_for_model(model_name: str):
    """모델명에 따라 인코더 함수 반환 (정규화된 float32 벡터 생성)."""
    if model_name not in AVAILABLE_MODELS:
        raise ValueError(f"Unknown model: {model_name}")

    dim = AVAILABLE_MODELS[model_name]["dimension"]

    def _encode(text: str) -> np.ndarray:
        model = _get_model_instance(model_name)
        normalized = _normalize_text(text)
        if not normalized:
            return np.zeros(dim, dtype=np.float32)
        try:
            embedding = model.encode(normalized, convert_to_numpy=True)
            embedding = np.array(embedding, dtype=np.float32)
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding
        except Exception as e:
            print(f"[ERROR] Failed to encode text with {model_name}: {e}")
            raise

    return _encode


def encode_texts(texts: list[str], model_name: str | None = None) -> list[np.ndarray]:
    """Batch encode texts and return normalized float32 vectors."""
    if model_name is None:
        model_name = _DEFAULT_MODEL
    if model_name not in AVAILABLE_MODELS:
        raise ValueError(f"Unknown model: {model_name}")

    model = _get_model_instance(model_name)
    dim = AVAILABLE_MODELS[model_name]["dimension"]
    normalized = [_normalize_text(text) for text in texts]
    if not normalized:
        return []
    if not any(normalized):
        return [np.zeros(dim, dtype=np.float32) for _ in normalized]

    embeddings = model.encode(
        normalized,
        convert_to_numpy=True,
        show_progress_bar=False,
    )
    embeddings = np.array(embeddings, dtype=np.float32)
    if embeddings.ndim == 1:
        embeddings = embeddings.reshape(1, -1)

    output: list[np.ndarray] = []
    for embedding in embeddings:
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm
        output.append(np.array(embedding, dtype=np.float32))
    return output


def warmup_model(model_name: str | None = None) -> None:
    """Preload the model so the first request is not cold."""
    if model_name is None:
        model_name = _DEFAULT_MODEL
    _get_model_instance(model_name)


def get_current_model_name(db: Session) -> str:
    """현재 활성 모델명 조회."""
    config = db.scalar(
        select(Config).where(Config.setting_key == 'vector_model')
    )
    if config and config.setting_value:
        return config.setting_value
    return _DEFAULT_MODEL


def set_current_model_name(db: Session, model_name: str) -> None:
    """현재 활성 모델명 설정."""
    if model_name not in AVAILABLE_MODELS:
        raise ValueError(f"Unknown model: {model_name}")

    config = db.scalar(
        select(Config).where(Config.setting_key == 'vector_model')
    )
    if config:
        config.setting_value = model_name
    else:
        db.add(Config(setting_key='vector_model', setting_value=model_name))
    db.commit()


def get_available_models() -> list[dict]:
    """사용 가능한 모델 목록 반환."""
    return [{"id": mid, **info} for mid, info in AVAILABLE_MODELS.items()]
