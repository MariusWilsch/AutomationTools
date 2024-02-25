import openai, os, requests, json, time
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

    def create_thread(self, name, assistant_id):
        if not self.thread:
            self.thread = self.client.beta.assistants.thread.create(
                name=name, assistant_id=assistant_id
            )
            AssistantManager.thread_id = self.thread.id
        print(self.thread.id, "thread created")

    def add_message(self, role, message):
        if self.thread:
            self.client.beta.assistants.thread.message.create(
                thread_id=self.thread.id, role=role, content=message
            )

    def run_assistant(self, instructions):
        if self.thread and self.assistant:
            self.run = self.client.beta.assistants.thread.run.create(
                thread_id=self.thread.id,
                assistant_id=self.assistant.id,
                instructions=instructions,
            )

    def process_message(self):
        if self.thread:
            messages = self.client.beta.threads.messages.list(thread_id=self.thread.id)
            summary = []

            response = messages.data[0].content.text.value
            role = messages.data[0].role
            summary.append(response)

            self.summary = "\n".join(summary)
            print(f"Summary: {role.capitalize()}: {response}")

    def call_required_functions(self, required_actions):
        if not self.run:
            return
        tools_output = []

        for action in required_actions["tool_calls"]:
            func_name = action["function"]["name"]
            arguments = json.loads(action["function"]["arguments"])

            if func_name == "get_news":
                news = get_news(arguments["topic"])
                tools_output.append(news)

    def wait_for_completion(self):
        if self.run and self.thread:
            while True:
                time.sleep(5)
                run_status = self.client.beta.assistants.thread.runs.retrieve(
                    thread_id=self.thread.id, run_id=self.run.id
                )
                print(f"Run status: {run_status.model_dump_json(indent=4)}")

                if run_status.status == "completed":
                    self.process_message()
                    break
                elif run_status.status == "requires_action":
                    print("Run requires action")
                    self.call_required_functions(self, required_actions)


if __name__ == "__main__":
    main()
