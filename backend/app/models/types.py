import json

from sqlalchemy.types import TypeDecorator, UnicodeText


class JSONEncodedDict(TypeDecorator):
    """Stores a dict/list as a JSON string in an NVARCHAR(MAX) column.

    Keeps the schema portable: works on SQL Server now and on
    PostgreSQL (Supabase) later without changes.
    """

    impl = UnicodeText
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return None
        return json.dumps(value, ensure_ascii=False)

    def process_result_value(self, value, dialect):
        if value is None:
            return None
        try:
            return json.loads(value)
        except (ValueError, TypeError):
            return None
