import asyncio
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from xml.etree import ElementTree

from sqlmodel import Session, select

from .database import engine
from .models import FormValue, LdxFile, Setting, User


def _indent_xml(elem, level=0):
    """Add indentation to XML elements for readability."""
    indent = "\n" + " " * (level * 2)
    if len(elem):
        if not elem.text or not elem.text.strip():
            elem.text = indent + " "
        if not elem.tail or not elem.tail.strip():
            elem.tail = indent
        last_child = None
        for child in elem:
            _indent_xml(child, level + 1)
            last_child = child
        if last_child is not None and (not last_child.tail or not last_child.tail.strip()):
            last_child.tail = indent
    else:
        if level and (not elem.tail or not elem.tail.strip()):
            elem.tail = indent


class LdxWatcher:
    def __init__(self, interval_seconds: int = 5):
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None

    def start(self) -> None:
        if self._task:
            return
        self._task = asyncio.create_task(self._run())

    def stop(self) -> None:
        if self._task:
            self._task.cancel()
            self._task = None

    async def _run(self) -> None:
        while True:
            try:
                await self._scan_once()
            except Exception as e:
                # Log errors but keep the watcher alive
                print(f"Error in LDX watcher scan: {e}")
                import traceback
                traceback.print_exc()
            await asyncio.sleep(self.interval_seconds)

    async def _scan_once(self) -> None:
        watch_dir = get_watch_directory()
        if not watch_dir:
            return
        directory = Path(watch_dir)
        if not directory.exists() or not directory.is_dir():
            return
        for path in directory.glob("*.ldx"):
            await self._process_file(path)

    async def _process_file(self, path: Path) -> None:
        try:
            path.stat()  # Check if file exists
        except OSError:
            # File might have been deleted
            return
        
        # Use absolute path for consistent comparison
        abs_path = str(path.resolve())
            
        try:
            with Session(engine) as session:
                record = session.exec(select(LdxFile).where(LdxFile.path == abs_path)).first()
                
                # If file was already processed, skip it
                if record:
                    return
                
                # This is a new file - record the detection time (current UTC time)
                # This represents when we first detected the file in the directory
                detection_time = datetime.utcnow()
                
                # Inject the most recent form values across all fields
                # Each new file gets the latest submission for each field
                inject_values_into_ldx(path, session, detection_time)
                
                # Record that we've processed this file
                # Store the detection time and current mtime for reference
                try:
                    file_mtime = path.stat().st_mtime
                except OSError:
                    # File might have been deleted during processing
                    return
                    
                session.add(
                    LdxFile(
                        path=abs_path,
                        mtime=file_mtime,
                        processed_at=detection_time,
                    )
                )
                session.commit()
        except Exception as e:
            # Log the error but don't crash the watcher
            print(f"Error processing LDX file {path}: {e}")
            import traceback
            traceback.print_exc()


def get_watch_directory() -> Optional[str]:
    env_dir = os.getenv("LDX_WATCH_DIR")
    with Session(engine) as session:
        record = session.get(Setting, "watch_directory")
        if record and record.value:
            return record.value
    return env_dir


def set_watch_directory(value: str) -> None:
    with Session(engine) as session:
        record = session.get(Setting, "watch_directory")
        if record:
            record.value = value
        else:
            session.add(Setting(key="watch_directory", value=value))
        session.commit()


def _to_human(s: str) -> str:
    return s.replace("_", " ").strip().title()


def inject_values_into_ldx(path: Path, session: Session, detection_time: datetime) -> None:
    # For new files, get the most recent submission across all fields
    # Get all form values (we'll filter to latest per field)
    all_values = session.exec(select(FormValue)).all()
    
    # Debug: print how many values we found
    print(f"Injecting values into {path.name}: found {len(all_values)} form values")

    # Get the latest value for each unique (form_name, field_name) pair
    # This ensures each new file gets the most recent submission for each field
    latest_values: Dict[str, FormValue] = {}
    for value in all_values:
        key = f"{value.form_name}.{value.field_name}"
        current = latest_values.get(key)
        if not current or value.updated_at > current.updated_at:
            latest_values[key] = value
    
    print(f"Latest values to inject: {len(latest_values)} unique fields")
    
    # If no form values exist, there's nothing to inject
    if not latest_values:
        print(f"No form values found to inject into {path.name}")
        return

    tree = ElementTree.parse(path)
    root = tree.getroot()

    # Find or create Layers/Details
    layers = root.find("Layers")
    if layers is None:
        layers = ElementTree.SubElement(root, "Layers")

    details = layers.find("Details")
    if details is None:
        details = ElementTree.SubElement(layers, "Details")

    # Collect existing IDs
    existing_ids = set()
    for child in details.findall("String"):
        existing_ids.add(child.get("Id"))

    # Group values by their human-readable field name to detect collisions
    by_human_field: Dict[str, List[FormValue]] = {}
    for val in latest_values.values():
        human_field = _to_human(val.field_name)
        if human_field not in by_human_field:
            by_human_field[human_field] = []
        by_human_field[human_field].append(val)

    # Determine final ID for each value
    to_inject: Dict[str, str] = {}  # Id -> Value

    for human_field, vals in by_human_field.items():
        # Conflict if multiple forms have this field OR if it exists in LDX
        has_conflict = len(vals) > 1 or human_field in existing_ids
        
        for val in vals:
            if has_conflict:
                # Use Form Name + Field Name
                final_id = f"{_to_human(val.form_name)} {human_field}"
            else:
                # Use Field Name
                final_id = human_field
            
            to_inject[final_id] = val.value

    # Update or Add entries
    # First, track what we've handled
    handled_ids = set()
    
    # Update existing entries if they match our target IDs
    for child in details.findall("String"):
        id_attr = child.get("Id")
        if id_attr in to_inject:
            child.set("Value", to_inject[id_attr])
            handled_ids.add(id_attr)

    # Add new entries
    for id_attr, value_str in to_inject.items():
        if id_attr not in handled_ids:
            entry = ElementTree.SubElement(details, "String")
            entry.set("Id", id_attr)
            entry.set("Value", value_str)

    # Format XML with proper indentation
    # Use ElementTree.indent if available (Python 3.9+), otherwise use custom function
    try:
        ElementTree.indent(root, space=" ", level=0)
    except AttributeError:
        # Fallback for older Python versions
        _indent_xml(root)
    
    # Write with proper formatting
    tree.write(path, encoding="utf-8", xml_declaration=True)
