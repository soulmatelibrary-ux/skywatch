"""업로드 폴더를 주소(/uploads/...)로 직접 열 때 쓰는 정적 파일 서버.

누구나 파일을 올릴 수 있으므로, 브라우저에서 스크립트가 실행될 수 있는 형식(html·svg 등)은
바로 열리지 않고 내려받기로만 열리게 하고, 브라우저가 파일 형식을 멋대로 추측하지 못하게 한다.
이미지 태그(<img src>)로 쓰는 것은 영향이 없다.
"""
import os

from starlette.staticfiles import StaticFiles

_ACTIVE_EXTENSIONS = {".html", ".htm", ".xhtml", ".svg", ".xml", ".js", ".mjs"}


class SafeStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        response = await super().get_response(path, scope)
        response.headers["X-Content-Type-Options"] = "nosniff"
        if os.path.splitext(path)[1].lower() in _ACTIVE_EXTENSIONS:
            response.headers["Content-Disposition"] = "attachment"
        return response
