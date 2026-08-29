"""Multi-tenancy context management.

Uses Python contextvars to store the active tenant (organization_id)
for the duration of a request, ensuring safe data isolation.
"""

from contextvars import ContextVar
from typing import Optional

# Context variable that holds the current organization_id for the thread/task
_current_tenant_id: ContextVar[Optional[int]] = ContextVar("current_tenant_id", default=None)


def set_current_tenant_id(tenant_id: Optional[int]) -> None:
    """Set the active organization_id context."""
    _current_tenant_id.set(tenant_id)


def get_current_tenant_id() -> Optional[int]:
    """Retrieve the active organization_id context."""
    return _current_tenant_id.get()


def clear_current_tenant_id() -> None:
    """Clear the active organization_id context."""
    _current_tenant_id.set(None)
