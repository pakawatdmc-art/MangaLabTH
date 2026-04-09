import sys
import json
import xml.etree.ElementTree as ET
import urllib.request
from google.oauth2 import service_account
from google.auth.transport.requests import Request as GoogleAuthRequest
import httpx
import asyncio

CREDENTIALS_PATH = "/Users/naidoi/Desktop/MangaLabTH/credentials-indexing.json"
SITEMAP_URL = "https://www.mangalab-th.com/sitemap.xml"
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
    urls = fetch_sitemap_urls()
    if not urls:
        print("No URLs found in sitemap.")
        return
        
    print(f"Found {len(urls)} URLs. Preparing to send to Google Indexing API...")
    
    try:
        creds = service_account.Credentials.from_service_account_file(
            CREDENTIALS_PATH, scopes=SCOPES
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
