"""SystemSetting model — lightweight key-value store for global config."""

from sqlmodel import Field, SQLModel


class SystemSetting(SQLModel, table=True):
    __tablename__ = "system_settings"

    key: str = Field(primary_key=True, max_length=64)
    value: str = Field(default="", max_length=512)
