#!/usr/bin/env python
"""Hugging Face Hub 다운로드 가능 여부 확인 스크립트."""
import sys
import time

def check_internet():
    """인터넷 연결 확인."""
    print("\n[1/3] 인터넷 연결 확인 중...")
    try:
        import socket
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        print("✓ 인터넷 연결됨")
        return True
    except (socket.timeout, socket.error):
        print("✗ 인터넷 연결 실패")
        return False

def check_huggingface_access():
    """Hugging Face Hub 접근 가능 여부 확인."""
    print("\n[2/3] Hugging Face Hub 접근 확인 중...")
    try:
        import requests
        response = requests.head(
            "https://huggingface.co/jhgan/ko-sroberta-multitask",
            timeout=5,
            allow_redirects=True
        )
        if response.status_code == 200:
            print("✓ Hugging Face Hub 접근 가능")
            return True
        else:
            print(f"✗ Hugging Face Hub 접근 실패 (HTTP {response.status_code})")
            return False
    except Exception as e:
        print(f"✗ Hugging Face Hub 접근 실패: {e}")
        return False

def check_disk_space():
    """디스크 여유 공간 확인."""
    print("\n[3/3] 디스크 여유 공간 확인 중...")
    try:
        import shutil
        from pathlib import Path

        backend_dir = Path(__file__).parent.parent
        stat = shutil.disk_usage(backend_dir)
        free_gb = stat.free / (1024 ** 3)

        print(f"여유 공간: {free_gb:.1f} GB")
        if free_gb > 1.5:
            print("✓ 충분한 디스크 공간 있음")
            return True
        else:
            print("✗ 디스크 공간 부족 (최소 1.5GB 필요)")
            return False
    except Exception as e:
        print(f"⚠ 디스크 확인 실패: {e}")
        return False

def main():
    print("=" * 70)
    print("KLUE-SBERT 모델 다운로드 가능 여부 확인")
    print("=" * 70)

    results = {
        "인터넷 연결": check_internet(),
        "Hugging Face Hub 접근": check_huggingface_access(),
        "디스크 공간": check_disk_space(),
    }

    print("\n" + "=" * 70)
    print("확인 결과")
    print("=" * 70)

    for check_name, result in results.items():
        status = "✓ 가능" if result else "✗ 불가"
        print(f"{check_name:.<50} {status}")

    all_ok = all(results.values())
    print("=" * 70)

    if all_ok:
        print("\n✓ 다운로드 준비 완료!")
        print("\n다운로드 명령:")
        print("  python scripts/download_model.py")
        return 0
    else:
        print("\n✗ 다운로드 불가")
        print("\n문제 해결:")
        if not results["인터넷 연결"]:
            print("1. 인터넷 연결 확인")
            print("2. 프록시 설정 필요한 경우:")
            print("   - HF_HOME 환경변수 설정")
            print("   - pip install -U sentence-transformers --proxy [프록시주소]")
        if not results["Hugging Face Hub 접근"]:
            print("3. Hugging Face Hub 접근 확인")
            print("4. 방화벽/프록시 설정 확인")
        if not results["디스크 공간"]:
            print("5. 디스크 여유 공간 확보 (최소 1.5GB)")

        return 1

if __name__ == '__main__':
    sys.exit(main())
