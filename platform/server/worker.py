"""Development notification worker: python -m server.worker."""
import logging
import signal
import threading

from .config import Settings
from .notifications import process_once
from .storage import Store


def main():
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    stop = threading.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, lambda *_: stop.set())
    settings = Settings.from_environment()
    store = Store(settings.database_path)
    logging.info("Notification worker started; delivery enabled=%s", settings.can_send)
    while not stop.is_set():
        try:
            result = process_once(store, settings)
            if result not in ("idle", "disabled"):
                logging.info("Notification processing result=%s", result)
        except Exception:
            # Never log provider response bodies, credentials or URLs with secrets.
            logging.error("Notification worker cycle failed; inspect local persistence and configuration")
        stop.wait(2)


if __name__ == "__main__":
    main()
