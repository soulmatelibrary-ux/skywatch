ROLES = ("shift_worker", "day_worker", "admin")
TEAMS = ("A", "B", "C", "D", "day")
SHIFT_TYPES = ("주간", "야간", "주야", "비번", "휴가")
CARD_STATUSES = ("open", "hold", "done")
PARTICIPANT_ROLES = ("primary", "sub", "support", "overtime")
TASK_IMPORTANCE = ("high", "normal", "low")
RECIPIENTS_MODES = ("all", "teams", "individual")
NOTIFICATION_TYPES = (
    "new_log", "comment", "mention", "task_assigned",
    "task_overdue", "task_due_soon",
    "card_updated", "card_completed",
    "ack_request", "log_read", "log_acked", "system",
)
