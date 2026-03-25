"""CLI entry point for the bundled FreeFile backend."""
import argparse
import os
import sys


def main():
    parser = argparse.ArgumentParser(description="FreeFile Backend Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    parser.add_argument("--data-dir", type=str, default=None,
                        help="Directory for database and uploads")
    args = parser.parse_args()

    if args.data_dir:
        os.environ["FREEFILE_DATA_DIR"] = args.data_dir

    # When running from PyInstaller, add the parent of 'backend' to sys.path
    # so that `import backend.main` works.
    if getattr(sys, 'frozen', False):
        # Running as PyInstaller bundle
        bundle_dir = os.path.dirname(sys.executable)
        project_root = os.path.dirname(bundle_dir) if os.path.basename(bundle_dir) == 'freefile-backend' else bundle_dir
        if project_root not in sys.path:
            sys.path.insert(0, project_root)

    import uvicorn
    from backend.main import app
    uvicorn.run(app, host="127.0.0.1", port=args.port)


if __name__ == "__main__":
    main()
