"""Cache ESPN logos with verified HTTPS so deployed logos need no third-party request."""
import concurrent.futures,json,urllib.request
from pathlib import Path
s=json.loads(Path('src/espn-snapshot.json').read_text());root=Path('public/logos');root.mkdir(parents=True,exist_ok=True)
def load(t):
    with urllib.request.urlopen(t['logo'],timeout=30) as response:body=response.read()
    if not body.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('Expected a PNG logo for '+t['espn'])
    (root/(t['espn']+'.png')).write_bytes(body)
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:list(pool.map(load,s['teams'].values()))
print('Cached',len(s['teams']),'ESPN logos')
