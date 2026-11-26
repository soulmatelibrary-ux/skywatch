#!/usr/bin/env python
"""KLUE-SBERT 모델 다운로드 스크립트 (로컬 오프라인 사용용)."""
import os
import sys
from pathlib import Path

def main():
    # 모델 저장 경로 설정
    base_dir = Path(__file__).parent.parent
    models_dir = base_dir / "models"
    model_path = models_dir / "klue-sbert"

    print("=" * 70)
    print("KLUE-SBERT 모델 다운로드")
    print("=" * 70)
    print(f"\n저장 경로: {model_path}")

    # 디렉토리 생성
    models_dir.mkdir(exist_ok=True)

    if model_path.exists():
        print(f"\n✓ 모델이 이미 존재합니다: {model_path}")
        print("  다시 다운로드하시겠습니까? (y/n): ", end="")
        if input().lower() != 'y':
            print("다운로드를 건너뜁니다.")
            return 0
        print("\n기존 모델을 삭제합니다...")
        import shutil
        shutil.rmtree(model_path)

    # 다운로드 시작
    print("\n다운로드 시작...")
    print("(처음 다운로드 시 5-10분 소요될 수 있습니다)\n")

    try:
        from sentence_transformers import SentenceTransformer

        print("[1/2] 모델 다운로드 중...")
        model = SentenceTransformer('jhgan/ko-sroberta-multitask')

        print("[2/2] 모델 저장 중...")
        model.save(str(model_path))

        print("\n" + "=" * 70)
        print("✓ 다운로드 완료!")
        print("=" * 70)
        print(f"\n모델 경로: {model_path}")

        # 디렉토리 크기 확인
        total_size = sum(
            f.stat().st_size
            for f in model_path.rglob('*')
            if f.is_file()
        ) / (1024 * 1024)
        print(f"모델 크기: {total_size:.1f} MB")

        print("\n이제 SkyWatch 백엔드를 시작할 수 있습니다:")
        print("  cd skywatch && start.bat")

        return 0

    except ImportError:
        print("\n[ERROR] sentence-transformers가 설치되지 않았습니다.")
        print("설치 명령: pip install sentence-transformers")
        return 1
    except Exception as e:
        print(f"\n[ERROR] 다운로드 실패: {e}")
        print("\n문제 해결:")
        print("1. 인터넷 연결 확인")
        print("2. Hugging Face Hub 접근 가능한지 확인")
        print("3. 디스크 공간 확인 (최소 1GB 필요)")
        return 1

if __name__ == '__main__':
    sys.exit(main())
