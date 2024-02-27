import openai, logging, time
import streamlit as st
from dotenv import load_dotenv


load_dotenv()

client = openai.OpenAI()
model = "gpt-4-0125-preview"

# == Upload a file to OpenAI API ==#

filepath = "./cryptocurrency.pdf"
file_obj = client.files.create(file=open(filepath, "rb"), purpose="assistants")

# == Create assistant ==#

# assistant = client.beta.assistants.create(
#     name="Studdy Buddy",
#     instructions="""You are a helpful study assistant who knows a lot about understanding research papers.
#     Your role is to summarize papers, clarify terminology within context, and extract key figures and data.
#     Cross-reference information for additional insights and answer related questions comprehensively.
#     Analyze the papers, noting strengths and limitations.
#     Respond to queries effectively, incorporating feedback to enhance your accuracy.
#     Handle data securely and update your knowledge base with the latest research.
#     Adhere to ethical standards, respect intellectual property, and provide users with guidance on any limitations.
#     Maintain a feedback loop for continuous improvement and user support.
#     Your ultimate goal is to facilitate a deeper understanding of complex scientific material, making it more accessible and comprehensible.""",
#     tools=[{"type": "retrieval"}],
#     model=model,
#     file_ids=[file_obj.id],
# )

# == Get the assistant ID ==#

# assistant_id = assistant.id
# print(assistant_id)


# == Hardcoded assistant and thread ID ==#
assistant_id = "asst_qngxN6QLZyuXqJQUFFe8Tl5t"
thread_id = "thread_1NRBKjN0lCmc7yuMxVgaER1v"

# == Create a thread ==#

# thread = client.beta.threads.create()
# thread_id = thread.id
# print(thread_id)

message = client.beta.threads.messages.create(
    thread_id=thread_id, role="user", content="What is mining?"
)


# == Run the assistant ==#

run = client.beta.threads.runs.create(
    thread_id=thread_id,
    assistant_id=assistant_id,
    instructions="Please address the user as Bruce",
)
run_id = run.id


def wait_for_run_completion(client, thread_id, run_id, sleep_interval=5):
    """
    Waits for a run to complete and prints the elapsed time.:param client: The OpenAI client object.
    :param thread_id: The ID of the thread.
    :param run_id: The ID of the run.
    :param sleep_interval: Time in seconds to wait between checks.
    """
    while True:
        try:
            run = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run_id)
            if run.completed_at:
                elapsed_time = run.completed_at - run.created_at
                formatted_elapsed_time = time.strftime(
                    "%H:%M:%S", time.gmtime(elapsed_time)
                )
                print(f"Run completed in {formatted_elapsed_time}")
                logging.info(f"Run completed in {formatted_elapsed_time}")
                # Get messages here once Run is completed!
                messages = client.beta.threads.messages.list(thread_id=thread_id)
                last_message = messages.data[0]
                response = last_message.content[0].text.value
                print(f"Assistant Response: {response}")
                break
        except Exception as e:
            logging.error(f"An error occurred while retrieving the run: {e}")
            break
        logging.info("Waiting for run to complete...")
        time.sleep(sleep_interval)


wait_for_run_completion(client, thread_id, run_id)
