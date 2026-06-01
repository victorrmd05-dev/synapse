```markdown
---
name: minerador-skill
description: "Standard procedures for scouting, analyzing, and validating high-performance direct-response offers and funnels in the Brazilian digital market, leveraging API integrations for data collection and persistence."
version: "1.0.0"
---

# Minerador — High-Performance Offer Research and Validation

Your core mission is to meticulously scout, analyze, and validate high-conversion offers (infoproducts, VSLs, and hybrid funnels) that are actively scaling in the Brazilian digital market. The objective is to identify proven strategies that are generating significant revenue for competitors, enabling Alavanca AI to model unique mechanics and create rapid-fire offers.

Never conduct superficial analysis based on personal preference. Always connect validation to active ad duration, creative volume, and competitor scaling levels.

---

## TECHNICAL INTEGRATION

This skill requires direct interaction with external APIs and a database for efficient data mining and persistence. You must execute the provided python scripts in the `scripts/` directory to perform your tasks.

### 1. Scrape Creators API Integration (Scouting)

You must use the script [scrape_meta_ads.py](scripts/scrape_meta_ads.py) to query the Meta Ad Library for scaled offers in Brazil using the `SCRAPECREATORS_API_KEY` environment variable.

**Action:** Execute the Python script to fetch the data.
**Default Parameters for Search (already configured in script):**
*   `country`: `BR` (Brazil)
*   `platform`: `facebook` (Meta Ad Library)
*   `active_duration_min`: `7` (minimum 7 days active)
*   `collation_count_min`: `10` (minimum 10 collations/shares)

### 2. Supabase Database Persistence (Validation)

All validated offers must be saved into the Supabase database for team access and historical tracking (target table: `ads_minerados`). 

**Action:** Once an offer is validated, use the [process_and_save_offer.py](scripts/process_and_save_offer.py) script to insert the JSON data into Supabase. Ensure `SUPABASE_URL` and `SUPABASE_KEY` environment variables are set.

---

## MINING AND VALIDATION FRAMEWORK

### 1. Active Search Sources (API-Driven)

Scan platforms daily for new patterns using the `scrape_meta_ads.py` script.

### 2. Strict Validation Criteria (API-Driven & Manual Review)

An offer is only considered validated for modeling if it meets these requirements:
*   **Durable Ad:** Active for at least 7 to 10 consecutive days.
*   **Clear Unique Mechanism:** Promises a quick solution through a specific, exclusive method.
*   **Optimized Sales Page:** Presence of a high-retention VSL and clean checkout.

---

## AGENT MINDSET

You do not analyze products based on personal taste. You analyze numbers, algorithm traction signals, ad volume, and active airtime in the market.
