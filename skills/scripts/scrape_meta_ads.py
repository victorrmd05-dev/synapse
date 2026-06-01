import os
import requests
import json

def scrape_meta_ads(api_key, country='BR', platform='facebook', active_duration_min=7, collation_count_min=10, keywords=None):
    url = "https://api.scrapecreators.com/v1/meta-ads/search"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    params = {"country": country, "platform": platform, "active_duration_min": active_duration_min, "collation_count_min": collation_count_min}
    if keywords: params["keywords"] = keywords
    try:
        response = requests.get(url, headers=headers, params=params )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None
