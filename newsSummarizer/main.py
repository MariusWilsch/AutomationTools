import openai, os, requests, json
from dotenv import load_dotenv

load_dotenv()

# == Load environment variables
news_api_key = os.environ.get("NEWS_API_KEY")

# == Initialize OpenAI client
client = openai.OpenAI()
model = "gpt-3.5-turbo-0125"

# == Custom Functions ==#


def get_news(topic):
    """
    Get news articles from the News API
    """
    url = (
        f"https://newsapi.org/v2/everything?q={topic}&apiKey={news_api_key}&pageSize=5"
    )
    try:
        response = requests.get(url)
        if response.status_code == 200:
            news = json.dumps(response.json(), indent=4)
            news_json = json.loads(news)

            # Access all the fields
            status = news_json["status"]
            total_results = news_json["totalResults"]
            articles = news_json["articles"]
            final_news = []

            # Loop through the articles
            for article in articles:
                source_name = article["source"]["name"]
                author = article["author"]
                title = article["title"]
                description = article["description"]
                url = article["url"]
                endResult = f"""
                title: {title}
                source: {source_name}
                author: {author}
                description: {description}
                url: {url}
                """
                final_news.append(endResult)
            return final_news
        else:
            return []
    except requests.exceptions.RequestException as e:
        print("Error: ", e)


def main():
    print(get_news("bitcoin")[0])


class AssistantManager:
    thread_id = None
    assistant_id = None

    def __init__(self, model: str = model):
        self.client = client
        self.model = model
        self.assistant = None
        self.thread = None
        self.run = None
        self.summary = None
        if AssistantManager.assistant_id:
            self.assistant = self.client.beta.assistants.retrieve(
                assistant_id=AssistantManager.assistant_id
            )
        if AssistantManager.thread_id:
            self.thread = self.client.beta.assistants.thread.retrieve(
                thread_id=AssistantManager.thread_id
            )

    def create_assistant(self, name, instructions, tools):
        if not self.assistant:
            self.assistant = self.client.beta.assistants.create(
                name=name,
                instructions=instructions,
                tools=tools,
                model=self.model,
            )
            AssistantManager.assistant_id = self.assistant.id
        print(self.assistant.id, "assistant created")


if __name__ == "__main__":
    main()
