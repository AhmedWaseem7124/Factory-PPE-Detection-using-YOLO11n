import os
from dotenv import load_dotenv

load_dotenv()

RTSP_URL = os.getenv("RTSP_URL")

if not RTSP_URL:
    raise RuntimeError("RTSP_URL is missing from .env")
