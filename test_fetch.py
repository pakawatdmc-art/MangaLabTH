import urllib.request
import traceback

try:
    with urllib.request.urlopen('http://localhost:8000/api/v1/manga') as response:
        print(response.read())
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode())
