#!/usr/bin/env python3
"""Package an already built and localized Linux application without modifying binaries."""
import argparse
import hashlib
import json
import pathlib
import shutil
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument('application', type=pathlib.Path)
parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path('artifacts'))
parser.add_argument('--repository', default='https://github.com/s-infinite-box/desktop')
args = parser.parse_args()
application = args.application.resolve()
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
version = json.loads((application / 'resources/app/package.json').read_text())['version']
if version != '3.6.6':
    raise SystemExit('Translation dictionary is pinned to 3.6.6; review it before building another version')

with tempfile.TemporaryDirectory(prefix='desktop-rpmbuild-') as temporary:
    top = pathlib.Path(temporary)
    for folder in ['BUILD', 'RPMS', 'SOURCES', 'SPECS', 'SRPMS', 'BUILDROOT']:
        (top / folder).mkdir()
    payload = top / 'SOURCES/payload'
    shutil.copytree(application, payload, symlinks=True, ignore=shutil.ignore_patterns('*.english'))
    (top / 'SOURCES/github-desktop').write_text('#!/bin/sh\nexec /usr/lib/github-desktop/github-desktop "$@"\n')
    (top / 'SOURCES/github-desktop.desktop').write_text('''[Desktop Entry]
Name=GitHub Desktop
Name[zh_CN]=GitHub Desktop 中文版
Comment=GitHub Desktop 3.6.6 with Simplified Chinese translations
Comment[zh_CN]=Git 仓库管理客户端
Exec=github-desktop %U
Terminal=false
Type=Application
Icon=github-desktop
Categories=Development;RevisionControl;
MimeType=x-scheme-handler/x-github-client;x-scheme-handler/x-github-desktop-auth;x-scheme-handler/x-github-desktop-dev-auth;x-scheme-handler/github-mac;
StartupWMClass=github-desktop
''')
    spec = top / 'SPECS/github-desktop.spec'
    spec.write_text(f'''%global debug_package %{{nil}}
%global _build_id_links none
%global __os_install_post %{{nil}}
Name: github-desktop
Version: {version}
Release: 1.fc44.zh
Summary: GitHub Desktop with Simplified Chinese translations for Fedora
License: MIT
URL: {args.repository}
BuildArch: x86_64
AutoReqProv: no
Requires: glibc >= 2.38
Requires: nss, nspr, gtk3, libsecret, libnotify, libX11, libXcomposite
Requires: libXdamage, libXext, libXfixes, libXrandr, libxcb, libxkbcommon
Requires: mesa-libgbm, libdrm, alsa-lib, cups-libs, at-spi2-core, xdg-utils
Requires: libcurl, gnome-keyring
Requires: libgcc, libstdc++, zlib

%description
An unofficial Fedora x86_64 build of upstream GitHub Desktop 3.6.6.
Simplified Chinese text is adapted from robotze/GithubDesktopZhTool 3.6.6.
Linux CLI and icon assets are from shiftkey/desktop. Updates are distributed
through this fork's RPM releases. GitHub does not officially support Linux.

%install
mkdir -p %{{buildroot}}/usr/lib/github-desktop %{{buildroot}}/usr/bin %{{buildroot}}/usr/share/applications
cp -a %{{_sourcedir}}/payload/. %{{buildroot}}/usr/lib/github-desktop/
install -m 755 %{{_sourcedir}}/github-desktop %{{buildroot}}/usr/bin/github-desktop
install -m 644 %{{_sourcedir}}/github-desktop.desktop %{{buildroot}}/usr/share/applications/github-desktop.desktop
ln -s /usr/lib/github-desktop/resources/app/static/github %{{buildroot}}/usr/bin/github
chmod 755 %{{buildroot}}/usr/lib/github-desktop/resources/app/static/github
find %{{buildroot}}/usr/lib/github-desktop -type d -exec chmod 755 {{}} +
find %{{buildroot}}/usr/lib/github-desktop -type f -exec chmod go-w {{}} +
for size in 32 64 128 256 512 1024; do
  install -Dm644 %{{_sourcedir}}/payload/resources/app/static/logos/${{size}}x${{size}}.png %{{buildroot}}/usr/share/icons/hicolor/${{size}}x${{size}}/apps/github-desktop.png
done

%posttrans
# The old community RPM removes this link in its uninstall script.
ln -sfn /usr/lib/github-desktop/resources/app/static/github /usr/bin/github

%files
%defattr(-,root,root,-)
/usr/lib/github-desktop
%attr(4755,root,root) /usr/lib/github-desktop/chrome-sandbox
/usr/bin/github-desktop
/usr/bin/github
/usr/share/applications/github-desktop.desktop
/usr/share/icons/hicolor/*/apps/github-desktop.png
''')
    subprocess.run(['rpmbuild', '--define', f'_topdir {top}', '--define', '_tmppath /tmp', '--define', '_binary_payload w6.zstdio', '-bb', str(spec)], check=True)
    shutil.copy2(spec, output / 'github-desktop.spec')
    for rpm in (top / 'RPMS').rglob('*.rpm'):
        destination = output / rpm.name
        shutil.copy2(rpm, destination)
        print(destination)
        print(hashlib.sha256(destination.read_bytes()).hexdigest())
