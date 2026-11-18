# courses-node/db.py
import configparser
import os

from mysql.connector import pooling

_config = configparser.ConfigParser()
_config.read(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.ini"))

_pool = None


def _setting(env_name, option, fallback=None):
    value = os.environ.get(env_name)
    if value:
        return value
    return _config.get("database", option, fallback=fallback)


def get_pool():
    global _pool
    if _pool is None:
        _pool = pooling.MySQLConnectionPool(
            pool_name="courses_pool",
            pool_size=int(_setting("DB_POOL_SIZE", "pool_size", "5")),
            host=_setting("DB_HOST", "host", "localhost"),
            port=int(_setting("DB_PORT", "port", "3306")),
            user=_setting("DB_USER", "user"),
            password=_setting("DB_PASSWORD", "password"),
            database=_setting("DB_NAME", "database"),
        )
    return _pool


def get_connection():
    return get_pool().get_connection()