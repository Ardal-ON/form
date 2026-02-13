from datetime import datetime
from enum import Enum
from typing import List, Optional

from sqlmodel import Field, Relationship, SQLModel


class SubteamRole(str, Enum):
    daq = "DAQ"
    chief = "Chief"
    suspension = "suspension"
    electronic = "electronic"
    drivetrain = "drivetrain"
    driver = "driver"
    chasis = "chasis"
    aero = "aero"
    ergo = "ergo"


class UserRoleLink(SQLModel, table=True):
    user_id: Optional[int] = Field(
        default=None, foreign_key="user.id", primary_key=True
    )
    role_name: Optional[str] = Field(
        default=None, foreign_key="role.name", primary_key=True
    )


class Role(SQLModel, table=True):
    name: str = Field(primary_key=True)
    users: List["User"] = Relationship(back_populates="roles", link_model=UserRoleLink)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    hashed_password: str
    is_admin: bool = False
    roles: List[Role] = Relationship(back_populates="users", link_model=UserRoleLink)


class Setting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value: str


class FormValue(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    form_name: str = Field(index=True)
    field_name: str = Field(index=True)
    value: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    updated_by: Optional[int] = Field(default=None, foreign_key="user.id")


class AuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    form_name: str = Field(index=True)
    field_name: str = Field(index=True)
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    changed_by: Optional[int] = Field(default=None, foreign_key="user.id")


class LdxFile(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    path: str = Field(index=True, unique=True)
    mtime: float
    processed_at: datetime = Field(default_factory=datetime.utcnow)
