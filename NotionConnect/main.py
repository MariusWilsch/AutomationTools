import requests, json
from notion_client import Client


DATABASE_ID = "3232e1a1a2ff4db98cbaccf571ea33e9"

notion = Client(auth="secret_SsuRY1jYj8NO1ouHSaycIqLpLlhKIaQZX3Iee7cELXy")

# Retrieve the database
res = notion.databases.query(database_id=DATABASE_ID)
res = json.dumps(res, indent=2)

# Print the response
print(res)
