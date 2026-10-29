"""Serve the animator on http://localhost:8000 and open it in the browser.

Browsers only allow webcam/microphone access on https:// or localhost pages,
so double-clicking index.html will not work - run this instead:

    python start.py
"""
import functools
import http.server
import pathlib
import webbrowser

PORT = 8000
HERE = pathlib.Path(__file__).resolve().parent

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(HERE))
with http.server.ThreadingHTTPServer(("localhost", PORT), handler) as server:
    url = f"http://localhost:{PORT}/"
    print(f"VTuber Animator running at {url}  (press Ctrl+C to stop)")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
