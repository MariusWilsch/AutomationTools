import openai, os, requests, json, time
from dotenv import load_dotenv
import streamlit as st

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
                model=self.model,
                name=name,
                instructions=instructions,
                tools=tools,
            )
            AssistantManager.assistant_id = self.assistant.id
        print(self.assistant.id, "assistant created")

    def create_thread(self):
        if not self.thread:
            self.thread = self.client.beta.threads.create()
            AssistantManager.thread_id = self.thread.id
        print(self.thread.id, "thread created")

    def add_message(self, role, message):
        if self.thread:
            self.client.beta.threads.messages.create(
                thread_id=self.thread.id, role=role, content=message
            )

    def run_assistant(self, instructions):
        if self.thread and self.assistant:
            self.run = self.client.beta.threads.runs.create(
                thread_id=self.thread.id,
                assistant_id=self.assistant.id,
                instructions=instructions,
            )

    def process_message(self):
        if self.thread:
            messages = self.client.beta.threads.messages.list(thread_id=self.thread.id)
            summary = []

            response = messages.data[0].content[0].text.value
            role = messages.data[0].role
            summary.append(response)

            self.summary = "\n".join(summary)
            print(f"Summary: {role.capitalize()}: {response}")

    def call_required_functions(self, required_actions):
        if not self.run:
            return
        tool_outputs = []

        print("Required actions: ", required_actions)

        for action in required_actions["tool_calls"]:
            func_name = action["function"]["name"]
            arguments = json.loads(action["function"]["arguments"])

            if func_name == "get_news":
                news = get_news(topic=arguments["topic"])
                print(f"News: {news}")
                final_str = ""
                for item in news:
                    final_str += "".join(item)

                tool_outputs.append({"tool_call_id": action["id"], "output": final_str})

            else:
                raise ValueError(f"Function {func_name} not found")
        print("Submitting tool output back to Assistant")
        self.client.beta.threads.runs.submit_tool_outputs(
            thread_id=self.thread.id, run_id=self.run.id, tool_outputs=tool_outputs
        )

    def wait_for_completion(self):
        if self.run and self.thread:
            while True:
                time.sleep(5)
                run_status = self.client.beta.threads.runs.retrieve(
                    thread_id=self.thread.id, run_id=self.run.id
                )
                print(f"Run status: {run_status.model_dump_json(indent=4)}")

                if run_status.status == "completed":
                    self.process_message()
                    break
                elif run_status.status == "requires_action":
                    print("Run requires action")
                    self.call_required_functions(
                        required_actions=run_status.required_action.submit_tool_outputs.model_dump()
                    )

    def get_summary(self):
        return self.summary

    # == Run the assistant ==#
    def run_steps(self):
        run_steps = self.client.beta.threads.runs.steps.list(
            thread_id=self.thread.id,
            run_id=self.run.id,
        )
        print(f"Run steps: {run_steps}")


def main():
    manager = AssistantManager()

    # Streamlit
    st.title("OpenAI Assistant")

    with st.form(key="user_input_form"):
        instructions = st.text_area("Enter topic:")
        submit_button = st.form_submit_button(label="Run Assistant")

    if submit_button:
        manager.create_assistant(
            name="News Assistant",
            instructions="You are a personal article summarizer who knows how to take a list of article's titles and descriptions and then write a short summary ranging from 1-3 sentences of all the news articles.",
            tools=[
                {
                    "type": "function",
                    "function": {
                        "name": "get_news",
                        "description": "Get the list of articles/news from the News API",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "topic": {
                                    "type": "string",
                                    "description": "The topic of the news to search for",
                                },
                            },
                            "required": ["topic"],
                        },
                    },
                }
            ],
        )

        manager.create_thread()

        manager.add_message(
            role="user", message=f"summarise the news on this topic {instructions}"
        )

        manager.run_assistant(instructions="Summarize the news")

        manager.wait_for_completion()

        summary = manager.get_summary()

        st.write(summary)

        st.text("Run steps: ")
        st.code(manager.run_steps(), line_numbers=True)


if __name__ == "__main__":
    main()
