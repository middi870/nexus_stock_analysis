"""
NEXUS — JSON serialisation utilities.
Converts all numpy scalar types to native Python so FastAPI can serialise them.
Apply clean_for_json() to any dict/list before returning from a route.
"""
import math
import numpy as np


def _cvt(v):
    """Convert a single value to a JSON-safe Python type."""
    if v is None:
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating,)):
        f = float(v)
        return None if (math.isnan(f) or math.isinf(f)) else f
    if isinstance(v, np.ndarray):
        return v.tolist()
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def clean_for_json(obj):
    """Recursively sanitise a dict / list / scalar for JSON serialisation."""
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_for_json(v) for v in obj]
    return _cvt(obj)
