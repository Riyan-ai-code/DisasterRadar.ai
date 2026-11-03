import sys
from pathlib import Path

# Ensure DisasterRadar.ai root and backend are always on Python path for pytest
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"

for p in [str(root_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)
