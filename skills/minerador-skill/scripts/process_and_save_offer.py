import os
from supabase import create_client, Client

def save_offer_to_supabase(offer_data):
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    if not SUPABASE_URL or not SUPABASE_KEY: return False
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        supabase.table("ads_minerados").insert(offer_data).execute()
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False
