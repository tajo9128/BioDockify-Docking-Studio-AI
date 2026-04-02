#!/usr/bin/env python3
"""
BioDockify PyInstaller Build Script
Usage: python build_installer.py [--platform win|mac|linux] [--clean] [--version 4.2.0]

Output: releases/BioDockify-v{version}-{platform}.zip
"""
import os
import sys
import subprocess
import shutil
import platform
import argparse
import hashlib
from pathlib import Path

def run_cmd(cmd, cwd=None, check=True):
    """Run shell command with logging"""
    cmd_str = ' '.join(cmd) if isinstance(cmd, list) else cmd
    print(f"🔧 {cmd_str}")
    result = subprocess.run(
        cmd,
        shell=platform.system() == "Windows",
        cwd=cwd,
        capture_output=True,
        text=True
    )
    if result.stdout:
        print(result.stdout[-500:] if len(result.stdout) > 500 else result.stdout)
    if result.returncode != 0 and check:
        print(f"❌ Command failed: {result.stderr}")
        sys.exit(1)
    return result

def build_frontend():
    """Build React frontend for production"""
    print("🌐 Building React frontend...")
    frontend_dir = Path("frontend")
    if not (frontend_dir / "package.json").exists():
        print("⚠️ Frontend directory not found. Skipping.")
        return
    run_cmd(["npm", "ci"], cwd=frontend_dir)
    run_cmd(["npx", "vite", "build"], cwd=frontend_dir)
    build_dir = frontend_dir / "dist"
    if not (build_dir / "index.html").exists():
        print("❌ Frontend build failed")
        sys.exit(1)
    size = sum(f.stat().st_size for f in build_dir.rglob('*') if f.is_file()) / 1024**2
    print(f"✅ Frontend ready: {build_dir} ({size:.1f}MB)")

def install_deps():
    """Install Python dependencies in isolated environment"""
    print("📦 Installing Python dependencies...")
    build_env = Path("build_env")
    if build_env.exists():
        shutil.rmtree(build_env)
    run_cmd([sys.executable, "-m", "venv", str(build_env)])
    if platform.system() == "Windows":
        pip = build_env / "Scripts" / "pip.exe"
        python = build_env / "Scripts" / "python.exe"
    else:
        pip = build_env / "bin" / "pip"
        python = build_env / "bin" / "python"
    run_cmd([str(python), "-m", "pip", "install", "--upgrade", "pip"])
    run_cmd([str(pip), "install", "-r", "backend/requirements.txt"])
    run_cmd([str(pip), "install", "pyinstaller>=5.0"])
    print("✅ Dependencies installed")
    return python

def run_pyinstaller(python_exe: Path):
    """Run PyInstaller with the spec file"""
    print("🔨 Running PyInstaller...")
    cmd = [str(python_exe), "-m", "PyInstaller", "--clean", "--noconfirm", "biodockify.spec"]
    run_cmd(cmd)
    print("✅ PyInstaller build complete")

def package_for_distribution(platform: str, version: str = "4.2.0"):
    """Create distributable ZIP with documentation"""
    print(f"📦 Packaging for {platform}...")
    src = Path("dist") / "BioDockify"
    dest = Path("releases") / f"BioDockify-v{version}-{platform}"
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True, exist_ok=True)
    if src.exists():
        shutil.copytree(src, dest / "app", dirs_exist_ok=True)
    # Add docs
    for f in ["README.md", "LICENSE", "QUICKSTART.md"]:
        if Path(f).exists():
            shutil.copy2(f, dest / f)
    # Platform-specific launch instructions
    guide = dest / "LAUNCH.txt"
    if platform == "win":
        guide.write_text("""BioDockify Student Edition - Windows
1. Extract ZIP to a folder (e.g., C:\\BioDockify)
2. Double-click: app\\BioDockify.exe
3. Browser opens automatically to http://127.0.0.1:8000
Requirements: Windows 10/11 64-bit, 4GB RAM, 2GB disk
Troubleshooting: Right-click BioDockify.exe → Properties → Unblock if blocked
""")
    elif platform == "mac":
        guide.write_text("""BioDockify Student Edition - macOS
1. Extract ZIP to Applications
2. Terminal: cd BioDockify && ./app/BioDockify
3. Browser opens automatically
Requirements: macOS 12+, 4GB RAM
""")
    else:
        guide.write_text("""BioDockify Student Edition - Linux
1. Extract ZIP: unzip BioDockify-*.zip
2. chmod +x app/BioDockify && ./app/BioDockify
3. Browser opens automatically
Requirements: Ubuntu 22.04+, 4GB RAM
""")
    # Create ZIP
    zip_path = dest.parent / f"{dest.name}.zip"
    shutil.make_archive(str(dest), 'zip', root_dir=dest.parent, base_dir=dest.name)
    # SHA256
    sha256 = hashlib.sha256()
    with open(zip_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    with open(zip_path.with_suffix('.zip.sha256'), 'w') as f:
        f.write(f"{sha256.hexdigest()}  {zip_path.name}\n")
    size = zip_path.stat().st_size / 1024**2
    print(f"✅ Distribution ready: {zip_path} ({size:.1f}MB)")
    print(f"🔐 SHA256: {sha256.hexdigest()[:16]}...")
    return zip_path

def main():
    parser = argparse.ArgumentParser(description="Build BioDockify PyInstaller distribution")
    parser.add_argument("--platform", choices=["win", "mac", "linux", "all"], default="all")
    parser.add_argument("--clean", action="store_true", help="Clean build artifacts first")
    parser.add_argument("--version", default="4.2.0", help="Version string")
    args = parser.parse_args()

    print(f"🚀 BioDockify PyInstaller Builder v1.0")
    print(f"📋 Platform: {args.platform} | Version: {args.version}")

    if args.clean:
        print("🧹 Cleaning...")
        for p in ["build", "dist", "build_env", "releases"]:
            if Path(p).exists():
                shutil.rmtree(p)

    build_frontend()
    python_exe = install_deps()
    platforms = [args.platform] if args.platform != "all" else ["win", "mac", "linux"]

    for plat in platforms:
        print(f"\n{'='*60}\n🎯 Building for {plat.upper()}\n{'='*60}")
        run_pyinstaller(python_exe)
        zip_path = package_for_distribution(plat, args.version)
        print(f"\n✨ {plat.upper()} build complete: {zip_path}")

    print(f"\n🎉 All builds complete! Check releases/")

if __name__ == "__main__":
    main()
