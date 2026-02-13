import json
import os
from pathlib import Path
from typing import Dict, List, Optional

import yaml
from pydantic import BaseModel, ValidationError


class FormField(BaseModel):
    name: str
    label: str
    type: str
    required: bool = False
    options: Optional[List[str]] = None


class FormSchema(BaseModel):
    form_name: str
    role: str
    fields: List[FormField]


FORMS_DIR = Path(os.getenv("FORMS_DIR", Path(__file__).resolve().parent.parent / "forms"))


def _load_file(path: Path) -> Dict:
    if path.suffix in {".yaml", ".yml"}:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    if path.suffix == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    raise ValueError(f"Unsupported schema file: {path.name}")


def load_forms() -> List[FormSchema]:
    forms: List[FormSchema] = []
    if not FORMS_DIR.exists():
        return forms
    for path in sorted(FORMS_DIR.glob("*")):
        if path.suffix not in {".yaml", ".yml", ".json"}:
            continue
        data = _load_file(path)
        try:
            forms.append(FormSchema.model_validate(data))
        except ValidationError as exc:
            raise ValueError(f"Invalid form schema in {path.name}: {exc}") from exc
    return forms


def get_form_by_role(role: str) -> Optional[FormSchema]:
    for form in load_forms():
        if form.role == role:
            return form
    return None


def list_roles() -> List[str]:
    return [form.role for form in load_forms()]
