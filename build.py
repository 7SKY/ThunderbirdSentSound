from pathlib import Path
import json
import zipfile
root = Path(__file__).resolve().parent
source = root / 'source'
manifest = json.loads((source / 'manifest.json').read_text())
target = root / ('sent-sound-' + manifest['version'] + '.xpi')
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(source.iterdir()):
        if path.is_file():
            archive.write(path, path.name)
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert 'manifest.json' in archive.namelist()
print(target)
