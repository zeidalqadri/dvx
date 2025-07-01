import os.path
import json
import re
import hashlib
from datetime import datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google.auth.exceptions import RefreshError
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# For table formatting
try:
    from tabulate import tabulate
    TABULATE_AVAILABLE = True
except ImportError:
    TABULATE_AVAILABLE = False
    print("📦 Install 'tabulate' for better table formatting: pip install tabulate")

# For better console output
try:
    from rich.console import Console
    from rich.table import Table
    from rich.text import Text
    RICH_AVAILABLE = True
    console = Console()
except ImportError:
    RICH_AVAILABLE = False
    print("📦 Install 'rich' for enhanced display: pip install rich")

# Define the scopes required for the APIs.
# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/documents.readonly", "https://www.googleapis.com/auth/drive.readonly"]

def get_google_docs_service():
    """
    Handles Google authentication and returns a service object for the Google Docs API.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists("token.json"):
        try:
            creds = Credentials.from_authorized_user_file("token.json", SCOPES)
        except (ValueError, RefreshError) as e:
            print(f"Error loading credentials from token.json: {e}")
            creds = None # Force re-authentication

    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except RefreshError:
                print("Could not refresh token. Please re-authenticate.")
                os.remove("token.json") # Remove the invalid token
                # Re-run the flow
                flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
                creds = flow.run_local_server(port=0)
        else:
            if not os.path.exists("credentials.json"):
                print("\nERROR: `credentials.json` not found.")
                print("Please follow the setup instructions to create and download it from the Google Cloud Console.")
                return None
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
            
        # Save the credentials for the next run
        with open("token.json", "w") as token:
            token.write(creds.to_json())
    
    try:
        service = build("docs", "v1", credentials=creds)
        return service
    except HttpError as err:
        print(f"An error occurred while building the service: {err}")
        return None

def get_doc_content_as_json_string(service, document_id):
    """
    Fetches a Google Doc's content and returns it as a single string.
    Assumes the doc contains JSON.
    """
    try:
        document = service.documents().get(documentId=document_id).execute()
        doc_content = document.get("body").get("content")
        
        # Extract text from all 'paragraph' elements
        text_content = ""
        for value in doc_content:
            if "paragraph" in value:
                elements = value.get("paragraph").get("elements")
                for elem in elements:
                    text_run = elem.get("textRun")
                    if text_run:
                        text_content += text_run.get("content")
        return text_content.strip()
    except HttpError as err:
        if err.resp.status == 404:
            print(f"Error: The document with ID '{document_id}' was not found.")
        elif err.resp.status == 403:
            print(f"Error: Permission denied for document '{document_id}'.")
            print("Please ensure the authenticated user has at least 'Viewer' access to this Google Doc.")
        else:
            print(f"An HTTP error occurred: {err}")
        return None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None

def visualize_html_dump(dump_str):
    """
    Parses the JSON string from the doc and prints a visualization.
    """
    if not dump_str:
        print("The document appears to be empty or could not be read.")
        return
        
    try:
        data = json.loads(dump_str)
    except json.JSONDecodeError:
        print("Error: The content of the Google Doc is not valid JSON.")
        return

    # Print header information
    print("="*80)
    print(f"Visualization of HTML Dump for: {data.get('url', 'N/A')}")
    print(f"Scraped at: {data.get('timestamp', 'N/A')}")
    print(f"Total Items Claimed: {data.get('totalItems', 'N/A')}")
    print("="*80 + "\n")

    selectors = data.get('selectors', [])
    if not selectors:
        print("No selectors found in the JSON data.")
        return

    # Check for redundancy
    tile_data = data.get("data", {}).get("div.plp-products__product-tile", [])
    column_data = data.get("data", {}).get("div.plp-products__column", [])
    is_redundant = (tile_data and column_data and len(tile_data) == len(column_data) and 
                    all(t.get('text') == c.get('text') for t, c in zip(tile_data, column_data)))
    
    for selector in selectors:
        items = data.get("data", {}).get(selector)
        
        if not items:
            print(f"--- Selector: '{selector}' ---\nNo data found.\n")
            continue

        if selector == "div.plp-products__column" and is_redundant:
            print(f"--- Selector: '{selector}' ---")
            print(f"Found {len(items)} items. (Content is identical to 'div.plp-products__product-tile', so skipping details.)\n")
            continue
            
        print(f"--- Selector: '{selector}' ---")
        print(f"Found {len(items)} items.\n")

        for i, item in enumerate(items, 1):
            if selector == "li.plp-left-nav__list-item":
                text = item.get("innerText", "").strip()
                if text:
                    print(f"  {i}. {text}")
            
            elif selector.startswith("div.plp-products"):
                # The 'text' field contains a mix of JSON and other text
                json_text_match = re.search(r'^{.*}', item.get('text', ''))
                if json_text_match:
                    try:
                        product_data = json.loads(json_text_match.group(0))
                        brand = product_data.get("brand", {}).get("name", "N/A")
                        name = product_data.get("name", "N/A")
                        price = product_data.get("offers", {}).get("price", "N/A")
                        currency = product_data.get("offers", {}).get("priceCurrency", "")
                        
                        print(f"  {i}. Brand: {brand}")
                        print(f"     Name:  {name}")
                        print(f"     Price: {price} {currency}\n")
                        
                    except json.JSONDecodeError:
                        print(f"  {i}. Could not parse JSON. Raw innerText: {item.get('innerText', 'N/A').replace('  ', ' ')}")
                else:
                    print(f"  {i}. No valid JSON found. Raw innerText: {item.get('innerText', 'N/A').replace('  ', ' ')}")
        print("\n" + "-"*40 + "\n")

if __name__ == "__main__":
    print("Attempting to authenticate with Google...")
    service = get_google_docs_service()
    
    if service:
        print("Authentication successful.")
        doc_id = input("Please enter the Google Doc ID: ").strip()
        if doc_id:
            print("\nFetching document content...")
            json_string = get_doc_content_as_json_string(service, doc_id)
            if json_string:
                print("Document content fetched. Running analysis...\n")
                visualize_html_dump(json_string)
        else:
            print("No Document ID entered. Exiting.")
