"""Refresh the selected preseason snapshot (compatible entry point)."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('update-preseason.py')), run_name='__main__')
