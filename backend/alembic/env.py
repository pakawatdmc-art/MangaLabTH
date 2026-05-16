"""Alembic environment configuration for async SQLModel + Supabase PostgreSQL."""

import asyncio
import os
import sys
from logging.config import fileConfig
from urllib.parse import urlparse

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from sqlmodel import SQLModel

from app.config import get_settings
from app.models import *  # noqa: F401, F403  — ensure all models are imported

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata

# Override sqlalchemy.url with the real DATABASE_URL from .env
settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)


# ── Safety guard: confirm before mutating production database ────
# Blocks accidental `alembic upgrade/downgrade` against Supabase production
# from a developer's local machine. Set ALEMBIC_AUTO_CONFIRM=1 in CI or
# when you really mean it.
def _is_production_db(url: str) -> bool:
    """Heuristic: any non-localhost host is treated as production."""
    try:
        parsed = urlparse(url.replace("postgresql+asyncpg://", "postgresql://"))
        host = (parsed.hostname or "").lower()
    except Exception:
        return False
    if not host:
        return False
    safe_hosts = {"localhost", "127.0.0.1", "::1", "db", "postgres"}
    return host not in safe_hosts


def _safety_check() -> None:
    # Only guard mutating commands. `current`, `history`, `heads`, `show`, etc.
    # don't touch the schema, so let them run silently.
    cmd = (context.get_x_argument(as_dictionary=True).get("cmd") or "").lower()
    argv = " ".join(sys.argv).lower()
    is_mutating = any(k in argv for k in ("upgrade", "downgrade", "stamp"))
    if not is_mutating:
        return

    url = settings.DATABASE_URL
    if not _is_production_db(url):
        return

    if os.environ.get("ALEMBIC_AUTO_CONFIRM") == "1":
        print("⚠️  Running migration against PRODUCTION database (auto-confirmed via ALEMBIC_AUTO_CONFIRM=1)")
        return

    parsed = urlparse(url.replace("postgresql+asyncpg://", "postgresql://"))
    host = parsed.hostname or "?"
    db = (parsed.path or "/?").lstrip("/")

    print()
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  ⚠️   PRODUCTION DATABASE DETECTED                           ║")
    print("╠══════════════════════════════════════════════════════════════╣")
    print(f"║  Host:     {host:<50}║")
    print(f"║  Database: {db:<50}║")
    print(f"║  Command:  {' '.join(sys.argv[1:])[:50]:<50}║")
    print("╚══════════════════════════════════════════════════════════════╝")
    print()
    print("This will mutate the PRODUCTION schema. Continue?")
    print("Type the host name to confirm (or Ctrl+C to abort):")
    try:
        answer = input("> ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\nAborted.")
        sys.exit(1)

    if answer != host:
        print(f"❌ Confirmation failed (expected '{host}', got '{answer}'). Aborted.")
        sys.exit(1)
    print("✅ Confirmed. Proceeding with migration...")
    print()


_safety_check()


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — generates SQL script."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations in 'online' mode with async engine."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
