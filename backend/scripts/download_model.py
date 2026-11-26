#!/usr/bin/env python
"""KURE-v1 임베딩 모델 받기 (벡터 검색용, 인터넷 필요).

받는 곳: Hugging Face `nlpai-lab/KURE-v1` → backend/models/kure-v1 (약 2.3GB, 1024차원)
앱은 이 경로를 고정으로 읽는다 (app/services/vector_model.py).
실행 (backend 폴더에서):  python scripts/download_model.py [--force]
"""
import shutil
import sys
from pathlib import Path

HF_REPO = "nlpai-lab/KURE-v1"


def main() -> int:
    model_path = Path(__file__).resolve().parent.parent / "models" / "kure-v1"
    print(f"KURE-v1 모델 받기 → {model_path}")

    if (model_path / "config.json").exists():
        if "--force" not in sys.argv:
            print("이미 있습니다. 다시 받으려면 --force")
            return 0
        shutil.rmtree(model_path)

    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        print("[ERROR] sentence-transformers 가 없습니다: pip install -r requirements.txt")
        return 1

    try:
        print("다운로드 중... (처음에는 수 분 걸림, 디스크 3GB 이상 필요)")
        model = SentenceTransformer(HF_REPO)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        model.save(str(model_path))
    except Exception as e:  # 네트워크·디스크 오류를 한 번에 안내
        print(f"[ERROR] 실패: {e}\n인터넷 연결, Hugging Face 접근, 디스크 공간을 확인하세요.")
        return 1

    size_mb = sum(f.stat().st_size for f in model_path.rglob("*") if f.is_file()) / 1024 / 1024
    print(f"완료: {size_mb:.0f} MB. 백엔드를 다시 켠 뒤 설정 → 벡터 화면에서 재색인하세요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
