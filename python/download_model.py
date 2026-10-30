"""Download the pinned MIT-licensed detector; never runs remote model code."""
import hashlib
import json
import pathlib
import sys
from huggingface_hub import snapshot_download

MODEL = 'desklib/ai-text-detector-v1.01'
REVISION = '5fdea974cd4287c61674951ec78803aa274e2fb7'
SHA256 = 'c024a1704c65f5a4bffeda58745c58fc0ed67d6ca07b158b068a257238815265'
directory = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.models/desklib-detector').resolve()
snapshot_download(repo_id=MODEL, revision=REVISION, local_dir=str(directory), allow_patterns=[
    'config.json', 'model.safetensors', 'tokenizer.json', 'tokenizer_config.json',
    'special_tokens_map.json', 'spm.model', 'added_tokens.json', 'README.md',
])
digest = hashlib.sha256()
with (directory / 'model.safetensors').open('rb') as handle:
    for block in iter(lambda: handle.read(8 * 1024 * 1024), b''):
        digest.update(block)
if digest.hexdigest() != SHA256:
    raise RuntimeError('Model checksum mismatch; do not use these weights.')
(directory / 'provenance.json').write_text(json.dumps({
    'id': MODEL, 'revision': REVISION, 'sha256': SHA256, 'license': 'MIT',
    'source': f'https://huggingface.co/{MODEL}',
}, indent=2), encoding='utf-8')
print(f'Verified detector files: {directory}')
