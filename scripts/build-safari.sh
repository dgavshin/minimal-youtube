#!/usr/bin/env bash
# Regenerates the Safari Xcode project from the upstream manifest.json + src/.
# Run from anywhere — paths are resolved relative to this script.
#
# Requirements: macOS with Xcode 14 or later (`xcrun safari-web-extension-converter`
# ships with Xcode).
#
# Usage:  ./scripts/build-safari.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SAFARI_DIR="$REPO_ROOT/safari"
APP_NAME="Minimal YouTube"
BUNDLE_ID="com.minimal-youtube.safari"
PROJECT="$SAFARI_DIR/${APP_NAME}/${APP_NAME}.xcodeproj/project.pbxproj"

# (Re)create the Safari Xcode project from the Chrome/Firefox extension source.
# `safari-web-extension-converter` ships with Xcode; it bundles manifest.json +
# src/ + assets/ into a Safari Web Extension app + Swift host shell.
xcrun safari-web-extension-converter \
    --project-location "$SAFARI_DIR" \
    --app-name "$APP_NAME" \
    --bundle-identifier "$BUNDLE_ID" \
    --macos-only \
    --copy-resources \
    --no-open \
    --no-prompt \
    --force \
    "$REPO_ROOT"

# Patch the parent app's bundle ID so the embedded extension is properly prefixed.
# Xcode's template auto-derives the app ID as com.minimal-youtube.Minimal-YouTube,
# but the embed validator requires the child .appex ID to start with the parent's
# exact ID followed by a dot. The extension's auto-generated ID is
# com.minimal-youtube.safari.Extension, so the parent must be com.minimal-youtube.safari.
sed -i '' "s|\"com.minimal-youtube.Minimal-YouTube\"|\"${BUNDLE_ID}\"|g" "$PROJECT"

# Disable ENABLE_DEBUG_DYLIB in all Debug configs. Xcode generates a
# Minimal YouTube.debug.dylib next to the executable by default; if the main
# executable is later re-signed with a different Team ID (e.g. switching from
# ad-hoc to a personal team), dyld refuses to load the dylib because the Team
# IDs don't match — the app crashes at launch with "Library not loaded".
# Disabling it keeps the Swift code inside the main executable.
python3 - "$PROJECT" <<'PY'
import re, sys
path = sys.argv[1]
with open(path) as f:
    content = f.read()
def patch(match):
    block = match.group(0)
    if "ENABLE_DEBUG_DYLIB" in block:
        return block
    return block.replace("buildSettings = {", "buildSettings = {\n\t\t\t\tENABLE_DEBUG_DYLIB = NO;", 1)
new_content = re.sub(
    r"Debug \*/ = \{\s*isa = XCBuildConfiguration;[^}]*?buildSettings = \{[^}]*?\};",
    patch,
    content,
    flags=re.DOTALL,
)
with open(path, "w") as f:
    f.write(new_content)
PY

echo "Built: $PROJECT"
echo "Next: open it in Xcode, set your Team under Signing & Capabilities for both targets, ⌘R."