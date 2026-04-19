"""Manually submit all sitemap URLs to Google Indexing API.

Usage:
    cd backend
    python scripts/run_google_index.py

Optionally set GOOGLE_INDEXING_CREDENTIALS_FILE env var to override
the default credentials path.
"""

import os
import sys
import xml.etree.ElementTree as ET
import urllib.request
import asyncio

# Ensure `app.*` imports work when running from `backend/`
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from dotenv import load_dotenv
load_dotenv()

from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleAuthRequest
import httpx

# Credentials: env var → fallback to project root file
CREDENTIALS_PATH = os.environ.get(
    "GOOGLE_INDEXING_CREDENTIALS_FILE",
    os.path.join(os.path.dirname(__file__), '..', '..', 'credentials-indexing.json')
)
SITEMAP_URL = os.environ.get("SITE_URL", "https://mangalab-th.com") + "/sitemap.xml"
INDEXING_API_URL = "https://indexing.googleapis.com/v3/urlNotifications:publish"
SCOPES = ["https://www.googleapis.com/auth/indexing"]

def fetch_sitemap_urls():
    print(f"Fetching sitemap from {SITEMAP_URL}...")
    req = urllib.request.Request(SITEMAP_URL, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            xml_data = response.read()
            
        root = ET.fromstring(xml_data)
        # Handle namespaces e.g., {http://www.sitemaps.org/schemas/sitemap/0.9}url
        urls = []
        for url_element in root:
            for child in url_element:
                if child.tag.endswith('loc'):
                    urls.append(child.text)
                    break
        return urls
    except Exception as e:
        print(f"Error fetching sitemap: {e}")
        return []

async def publish_url(client, creds, url):
    payload = {"url": url, "type": "URL_UPDATED"}
    headers = {
        "Authorization": f"Bearer {creds.token}",
        "Content-Type": "application/json",
    }
    try:
        resp = await client.post(INDEXING_API_URL, headers=headers, json=payload)
        if resp.status_code == 200:
            print(f"✅ Success: {url}")
            return True
        elif resp.status_code == 429:
             print(f"⚠️ Quota Exceeded for: {url}")
             return False
        else:
            print(f"❌ Failed {resp.status_code} for {url}: {resp.text}")
            return False
    except Exception as e:
        print(f"❌ Error for {url}: {e}")
        return False

async def main():
    # Validate credentials file exists
    resolved_path = os.path.abspath(CREDENTIALS_PATH)
    if not os.path.exists(resolved_path):
        print(f"❌ Credentials file not found: {resolved_path}")
        print("   Set GOOGLE_INDEXING_CREDENTIALS_FILE env var or place credentials-indexing.json in project root.")
        return

    urls = fetch_sitemap_urls()
    if not urls:
        print("No URLs found in sitemap.")
        return
        
    print(f"Found {len(urls)} URLs. Preparing to send to Google Indexing API...")
    
    try:
        creds = service_account.Credentials.from_service_account_file(
            resolved_path, scopes=SCOPES
        )
        creds.refresh(GoogleAuthRequest())
        print("✅ Google Credentials loaded and refreshed successfully.")
    except Exception as e:
        print(f"❌ Failed to load credentials: {e}")
        return

    # Process in batches to avoid overwhelming the API
    async with httpx.AsyncClient(timeout=30.0) as client:
        # BATCHING
        CONCURRENCY = 10
        for i in range(0, len(urls), CONCURRENCY):
            batch = urls[i:i+CONCURRENCY]
            tasks = [publish_url(client, creds, url) for url in batch]
            await asyncio.gather(*tasks)
            await asyncio.sleep(0.5) # small delay
            
    print("\n🎉 All URLs processed! Google should start indexing them shortly.")

if __name__ == "__main__":
    asyncio.run(main())
