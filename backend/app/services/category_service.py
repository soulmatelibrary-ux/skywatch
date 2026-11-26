"""카테고리 CRUD 서비스."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.log import CardCategory
from app.schemas.log import CardCategoryCreate, CardCategoryOut, CardCategoryUpdate


def _to_out(c: CardCategory) -> CardCategoryOut:
    return CardCategoryOut.model_validate(c)


def list_categories(db: Session) -> list[CardCategoryOut]:
    cats = db.scalars(
        select(CardCategory).order_by(CardCategory.sort_order, CardCategory.id)
    ).all()
    return [_to_out(c) for c in cats]


def create_category(db: Session, user_id: int, data: CardCategoryCreate) -> CardCategoryOut:
    cat = CardCategory(
        name=data.name, color=data.color,
        sort_order=data.sort_order, created_by=user_id,
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return _to_out(cat)


def update_category(db: Session, cat_id: int, data: CardCategoryUpdate) -> CardCategoryOut | None:
    cat = db.get(CardCategory, cat_id)
    if not cat:
        return None
    if data.name is not None:
        cat.name = data.name
    if data.color is not None:
        cat.color = data.color
    if data.sort_order is not None:
        cat.sort_order = data.sort_order
    if data.is_active is not None:
        cat.is_active = data.is_active
    db.commit()
    db.refresh(cat)
    return _to_out(cat)


def delete_category(db: Session, cat_id: int, user_id: int) -> bool:
    """카테고리 비활성화 (FK 참조 보호를 위해 is_active=False 처리)."""
    cat = db.get(CardCategory, cat_id)
    if not cat:
        return False
    cat.is_active = False
    db.commit()
    return True
