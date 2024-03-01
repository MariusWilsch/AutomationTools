import openai, os

from simplegmail import Gmail

gmail = Gmail()


# class AssistantManager:
#     assistant_id = "asst_jHFuDKx43IyrktWeooD6BzFp"

#     def __init__(self):
#         self.client = openai.OpenAI()
#         self.thread = None
#         self.run = None
#         # self.summary = None

#     # As of now the assistant can only handle one thread at a time
#     def create_thread(self):
#         if self.thread:
#             return
#         self.thread = self.client.beta.threads.create()
#         print(self.thread.id, "thread created")

#     def add_message_to_thread(self, role: str, message: str):
#         if not self.thread:
#             return
#         self.client.beta.threads.messages.create(
#             self.thread.id, role=role, content=message
#         )

#     def run_assistant(self, instructions: str):
#         if not self.thread:
#             return
#         self.run = self.client.beta.threads.runs.create(
#             self.thread.id, AssistantManager.assistant_id, instructions
#         )

#     def get_messages(self):
#         if not self.thread:
#             return
#         return self.client.beta.threads.messages.list(self.thread.id)


# def main():
