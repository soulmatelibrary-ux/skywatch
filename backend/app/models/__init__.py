# 모든 모델을 임포트해야 Alembic autogenerate가 인식함
from app.models.user import User, Session  # noqa: F401
from app.models.log import (  # noqa: F401
    Log, CardCategory, LogCard, LogParticipant,
    LogRead, LogAcknowledgment, LogVersion,
    CardLink, Comment, CommentReaction, LogVector,
)
from app.models.task import Task, RecurringTaskTemplate  # noqa: F401
from app.models.notification import Notification  # noqa: F401
from app.models.schedule import (  # noqa: F401
    Schedule, ShiftOverride, LeaveRequest,
    ShiftStaffMemo, ShiftCarryOver, ShiftNotice, Attachment,
)
from app.models.search import SearchIndex, SearchSuggestion  # noqa: F401
from app.models.backup import BackupLog  # noqa: F401
from app.models.config import Config, ReindexJob  # noqa: F401
from app.models.inquiry import Inquiry  # noqa: F401
from app.models.tech_doc import TechDocCategory, TechDoc, TechDocAttachment, TechDocVector  # noqa: F401
from app.models.pr_batch import PrBatch, PrBatchItem, PrBatchAttachment, PrVerification, PrWorkbookImport  # noqa: F401
from app.models.commute import CommuteMonth  # noqa: F401
from app.models.work_thread import (  # noqa: F401
    WorkThread, WorkThreadPhase, WorkThreadCard, CardMemo, CardMemoCheck,
)
