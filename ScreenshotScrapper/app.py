import json
import os
from linkedin_jobs_scraper import LinkedinScraper
from linkedin_jobs_scraper.events import Events, EventData
from linkedin_jobs_scraper.query import Query, QueryOptions
from selenium.webdriver.firefox.options import Options as FirefoxOptions
import time

# Define the path to the JSON file where data will be stored
json_file_path = "scraped_data.json"


def on_data(data: EventData):
    # Convert the EventData to a dictionary and prepare it for JSON
    data_dict = data._asdict()

    # Check if the file exists, create it if it doesn't
    if not os.path.exists(json_file_path):
        with open(json_file_path, "w") as file:
            # Create an array with the first element
            json.dump([data_dict], file, ensure_ascii=False, indent=4)
    else:
        # Read the current content of the file and append the new data
        with open(json_file_path, "r+") as file:
            file_data = json.load(file)
            file_data.append(data_dict)
            # Set the file's current position at the beginning
            file.seek(0)
            json.dump(file_data, file, ensure_ascii=False, indent=4)


def on_error(error):
    print("[ON_ERROR]", error)


def on_end():
    print("[ON_END]")


def setup_scraper():
    # Setup Firefox Options
    firefox_options = FirefoxOptions()
    # firefox_options.add_argument("--headless")  # Uncomment to run Firefox in headless mode

    # Initialize LinkedinScraper
    scraper = LinkedinScraper(
        firefox_executable_path="./firefox_driver/geckodriver",
        firefox_options=firefox_options,
        headless=False,  # Adjust as needed
        max_workers=1,
        slow_mo=1.1,
        page_load_timeout=400,
    )

    # Add event listeners
    scraper.on(Events.DATA, on_data)
    scraper.on(Events.ERROR, on_error)
    scraper.on(Events.END, on_end)

    # Define your queries
    queries = [
        Query(
            query="office manager",
            options=QueryOptions(
                locations=["Netherlands"],
                apply_link=False,
                skip_promoted_jobs=False,
                page_offset=2,
                limit=5,
                # Specify more options as needed
            ),
        )
    ]

    # Run the scraper with the queries
    scraper.run(queries)
    time.sleep(50000)


if __name__ == "__main__":
    setup_scraper()
