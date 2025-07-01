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
SCOPES = ["https://www.googleapis.com/auth/documents.readonly", "https://www.googleapis.com/auth/drive.readonly"]

def generate_product_key(product_data, index):
    """
    Generates a unique primary key for each product based on its data.
    """
    if not isinstance(product_data, dict):
        return f"PRODUCT_{index:03d}"
        
    # Try to use existing product identifiers first
    for id_field in ['sku', 'gtin', 'mpn', 'productID', 'id', '@id']:
        if id_field in product_data and product_data[id_field]:
            return str(product_data[id_field])
    
    # Create a key from brand + name if available
    brand = ""
    if 'brand' in product_data:
        brand_info = product_data['brand']
        if isinstance(brand_info, dict):
            brand = brand_info.get('name', '')
        else:
            brand = str(brand_info) if brand_info else ""
        
    name = product_data.get('name', '')
    
    if brand and name:
        # Create a short hash from brand + name for uniqueness
        combined = f"{brand}_{name}".lower().replace(' ', '_')
        hash_suffix = hashlib.md5(combined.encode()).hexdigest()[:8]
        return f"{brand[:10]}_{hash_suffix}".replace(' ', '_')
    
    # Fallback to index-based key
    return f"PRODUCT_{index:03d}"

def extract_image_urls(product_data):
    """
    Extracts image URLs from various possible fields in product JSON-LD data.
    """
    if not isinstance(product_data, dict):
        return []
    
    image_urls = []
    
    # Common image fields in JSON-LD
    image_fields = ['image', 'images', 'thumbnail', 'photo', 'picture']
    
    for field in image_fields:
        if field in product_data:
            images = product_data[field]
            
            # Handle different image data structures
            if isinstance(images, str):
                image_urls.append(images)
            elif isinstance(images, list):
                for img in images:
                    if isinstance(img, str):
                        image_urls.append(img)
                    elif isinstance(img, dict) and 'url' in img:
                        image_urls.append(img['url'])
            elif isinstance(images, dict) and 'url' in images:
                image_urls.append(images['url'])
    
    # Remove duplicates and clean URLs
    unique_urls = []
    for url in image_urls:
        if url and url not in unique_urls:
            # Clean and validate URL
            if url.startswith(('http://', 'https://', '//')):
                unique_urls.append(url)
            elif url.startswith('/'):
                # Relative URL - note it but include it
                unique_urls.append(f"[RELATIVE]{url}")
    
    return unique_urls[:3]  # Limit to first 3 images to keep display clean

def get_google_docs_service():
    """
    Handles Google authentication and returns a service object for the Google Docs API.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens
    if os.path.exists("token.json"):
        try:
            creds = Credentials.from_authorized_user_file("token.json", SCOPES)
        except (ValueError, RefreshError) as e:
            print(f"Error loading credentials from token.json: {e}")
            creds = None

    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            try:
                creds.refresh(Request())
            except RefreshError:
                print("Could not refresh token. Please re-authenticate.")
                os.remove("token.json")
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

def create_product_table_display(products_data):
    """
    Creates a formatted table display for product data.
    """
    if not products_data:
        print("No product data found.")
        return

    if RICH_AVAILABLE:
        # Create Rich table
        table = Table(show_header=True, header_style="bold magenta", show_lines=True)
        
        table.add_column("🏷️ Product Key", style="cyan bold", width=15)
        table.add_column("🏪 Brand", style="green", width=20)
        table.add_column("📦 Name", style="white", width=30)
        table.add_column("💰 Price", style="yellow", width=12)
        table.add_column("🖼️ Images", style="blue", width=8)
        table.add_column("📊 Quality", style="dim", width=10)
        
        for key, product_info in products_data.items():
            product_data = product_info['parsed_data']
            
            # Extract brand
            brand = "N/A"
            if 'brand' in product_data:
                brand_info = product_data['brand']
                if isinstance(brand_info, dict):
                    brand = brand_info.get('name', 'N/A')
                else:
                    brand = str(brand_info)
            
            # Extract name
            name = product_data.get('name', 'N/A')
            
            # Extract price
            price_display = "N/A"
            if 'offers' in product_data:
                offers = product_data['offers']
                if isinstance(offers, dict):
                    price = offers.get('price', '')
                    currency = offers.get('priceCurrency', '')
                    if price:
                        price_display = f"{price} {currency}".strip()
                elif isinstance(offers, list) and offers:
                    price = offers[0].get('price', '')
                    currency = offers[0].get('priceCurrency', '')
                    if price:
                        price_display = f"{price} {currency}".strip()
            
            # Extract images
            images = extract_image_urls(product_data)
            image_count = f"{len(images)}" if images else "0"
            
            # Data quality
            quality = "Rich" if len(product_data) > 5 else "Basic"
            
            table.add_row(
                key,
                brand[:20] + "..." if len(brand) > 20 else brand,
                name[:30] + "..." if len(name) > 30 else name,
                price_display,
                image_count,
                quality
            )
        
        console.print(table)
        
    elif TABULATE_AVAILABLE:
        # Create tabulate table
        headers = ["Product Key", "Brand", "Name", "Price", "Images", "Quality"]
        table_data = []
        
        for key, product_info in products_data.items():
            product_data = product_info['parsed_data']
            
            # Extract data
            brand = "N/A"
            if 'brand' in product_data:
                brand_info = product_data['brand']
                if isinstance(brand_info, dict):
                    brand = brand_info.get('name', 'N/A')
                else:
                    brand = str(brand_info)
            
            name = product_data.get('name', 'N/A')
            
            price_display = "N/A"
            if 'offers' in product_data:
                offers = product_data['offers']
                if isinstance(offers, dict):
                    price = offers.get('price', '')
                    currency = offers.get('priceCurrency', '')
                    if price:
                        price_display = f"{price} {currency}".strip()
            
            images = len(extract_image_urls(product_data))
            quality = "Rich" if len(product_data) > 5 else "Basic"
            
            table_data.append([
                key,
                brand[:20] + "..." if len(brand) > 20 else brand,
                name[:30] + "..." if len(name) > 30 else name,
                price_display,
                str(images),
                quality
            ])
        
        print(tabulate(table_data, headers=headers, tablefmt="grid"))
        
    else:
        # Simple text format
        print("📊 PRODUCT DATA TABLE")
        print("=" * 80)
        for key, product_info in products_data.items():
            product_data = product_info['parsed_data']
            
            brand = "N/A"
            if 'brand' in product_data:
                brand_info = product_data['brand']
                if isinstance(brand_info, dict):
                    brand = brand_info.get('name', 'N/A')
                else:
                    brand = str(brand_info)
            
            name = product_data.get('name', 'N/A')
            images = extract_image_urls(product_data)
            
            print(f"🏷️  Key: {key}")
            print(f"🏪 Brand: {brand}")
            print(f"📦 Name: {name}")
            print(f"🖼️  Images: {len(images)} found")
            if images:
                for img in images[:2]:  # Show first 2 images
                    print(f"   • {img}")
            print("-" * 60)

def visualize_html_dump(dump_str):
    """
    Enhanced visualization with table format and image URL display.
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
    print(f"📊 DevEx0 HTML Extraction Analysis")
    print(f"🌐 URL: {data.get('url', 'N/A')}")
    print(f"⏰ Scraped: {data.get('timestamp', 'N/A')}")
    print(f"📦 Total Items: {data.get('totalItems', 'N/A')}")
    print("="*80)

    selectors = data.get('selectors', [])
    if not selectors:
        print("No selectors found in the JSON data.")
        return

    # Process and organize product data
    products_data = {}
    other_data = {}
    
    for selector in selectors:
        items = data.get("data", {}).get(selector, [])
        
        if not items:
            continue
            
        # Check if this is a product-related selector
        is_product_selector = any(keyword in selector.lower() 
                                for keyword in ['product', 'item', 'tile', 'card'])
        
        if is_product_selector:
            print(f"\n🔍 Processing Product Selector: '{selector}' ({len(items)} items)")
            
            for i, item in enumerate(items):
                # Try to extract JSON-LD data
                text_content = item.get('text', '')
                json_match = re.search(r'^{.*}', text_content)
                
                product_data = {}
                if json_match:
                    try:
                        product_data = json.loads(json_match.group(0))
                    except json.JSONDecodeError:
                        pass
                
                # Generate unique key
                product_key = generate_product_key(product_data, len(products_data) + 1)
                
                products_data[product_key] = {
                    'parsed_data': product_data,
                    'raw_text': item.get('innerText', ''),
                    'selector': selector,
                    'index': i + 1
                }
        else:
            other_data[selector] = items

    # Display product table
    if products_data:
        print(f"\n🛍️  PRODUCT DATA TABLE ({len(products_data)} products found)")
        print("="*80)
        create_product_table_display(products_data)
        
        # Display detailed image information
        print(f"\n🖼️  IMAGE DETAILS")
        print("-" * 60)
        
        total_images = 0
        for key, product_info in products_data.items():
            product_data = product_info['parsed_data']
            images = extract_image_urls(product_data)
            
            if images:
                total_images += len(images)
                print(f"\n🏷️  {key} - {len(images)} image(s):")
                for j, img_url in enumerate(images, 1):
                    print(f"   {j}. {img_url}")
            
        print(f"\n📊 Total images found: {total_images}")
    
    # Display other selector data
    if other_data:
        print(f"\n🔍 OTHER EXTRACTED DATA")
        print("="*60)
        
        for selector, items in other_data.items():
            print(f"\n--- {selector} ---")
            print(f"Items: {len(items)}")
            
            for i, item in enumerate(items[:3], 1):  # Show first 3
                text = item.get("innerText", "").strip()[:100]
                print(f"  {i}. {text}{'...' if len(item.get('innerText', '')) > 100 else ''}")
            
            if len(items) > 3:
                print(f"  ... and {len(items) - 3} more items")

if __name__ == "__main__":
    print("🚀 DevEx0 JSON Analyzer with Enhanced Product Tables")
    print("Attempting to authenticate with Google...")
    
    service = get_google_docs_service()
    
    if service:
        print("✅ Authentication successful.")
        doc_id = input("Please enter the Google Doc ID: ").strip()
        if doc_id:
            print("\n📄 Fetching document content...")
            json_string = get_doc_content_as_json_string(service, doc_id)
            if json_string:
                print("✅ Document content fetched. Running enhanced analysis...\n")
                visualize_html_dump(json_string)
            else:
                print("❌ Failed to fetch document content.")
        else:
            print("No Document ID entered. Exiting.")
    else:
        print("❌ Authentication failed.")