from __future__ import annotations

import os
import shutil
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DOWNLOAD_MIRROR_ROOT = PROJECT_ROOT / "download" / "skywatch"
DOWNLOAD_MIRROR_ROOT.mkdir(parents=True, exist_ok=True)


def _resolve_relative_path(relative_path: str | os.PathLike[str]) -> Path:
    rel = Path(relative_path)
    if rel.is_absolute() or any(part == ".." for part in rel.parts):
        raise ValueError("invalid mirror path")
    return rel


def ensure_mirror_path(relative_path: str | os.PathLike[str]) -> Path:
    dest = DOWNLOAD_MIRROR_ROOT / _resolve_relative_path(relative_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    return dest


def mirror_file(source_path: str | os.PathLike[str], relative_path: str | os.PathLike[str]) -> Path:
    src = Path(source_path)
    if not src.is_file():
        raise FileNotFoundError(str(src))
    dest = ensure_mirror_path(relative_path)
    shutil.copy2(src, dest)
    return dest


def mirror_bytes(data: bytes, relative_path: str | os.PathLike[str]) -> Path:
    dest = ensure_mirror_path(relative_path)
    dest.write_bytes(data)
    return dest
