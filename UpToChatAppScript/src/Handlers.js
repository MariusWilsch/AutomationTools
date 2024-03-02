function getThreadData(event) {
  const message = GmailApp.getMessageById(event.messageMetadata.messageId);
  const thread = message.getThread();
  const messages = thread.getMessages();
  const plainTextMessages = messages.map((message, num) => {
    let body = message.getPlainBody();
    body = body.replace(/(\r\n){2,}/g, '\r\n'); // replace consecutive occurrences of \r\n
    body = body.replace(/-{2,}/g, ''); // replace consecutive occurrences of - with empty string
    return `MESSAGE ${num + 1} - ${body}`
  });

  try {
    PropertiesService.getScriptProperties().setProperty('plainTextMessages', JSON.stringify(plainTextMessages));
  } catch (error) {
    Logger.log("Error setting plainTextMessages: ", error);
  }
}
//? Would it be better to create a class for shared variables and methods? like getScriptProperties, setScriptProperties, etc.

function createEmptyThread(event) {
  const scriptProp = PropertiesService.getScriptProperties();
  //* Check if threadID is already set
  const threadID = scriptProp.getProperty('threadID');
  if (threadID) return createErrorNotification("ThreadID already set!", "createEmptyThread");

  //* Creating a new empty thread
  const response = fetchResFromAPI("https://api.openai.com/v1/threads", "post");
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error creating thread!", "createEmptyThread");

  const newThreadID = JSON.parse(response.getContentText()).id;
  console.log("Thread created successfully with threadID: ", newThreadID);
  scriptProp.setProperty('threadID', newThreadID);
  return onGmailMessageOpen();
}

// function createAIThread(event) {
//   // Check if threadID is already set
//   const threadID = PropertiesService.getScriptProperties().getProperty('threadID');
//   if (threadID) {
//     console.log("Thread ID already set: ", threadID);
//     return createErrorNotification("ThreadID already set!");
//   }

//   const url = "https://api.openai.com/v1/threads";
//   const secret = getSecret();
//   if (!secret) return createErrorNotification("No secret found!");

//   const response = UrlFetchApp.fetch(url, {
//     method: "post",
//     contentType: "application/json",
//     headers: {
//       "Authorization": `Bearer ${secret}`,
//       "OpenAI-Beta": "assistants=v1"
//     },
//   });

//   if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error creating thread!");

//   const newThreadID = JSON.parse(response.getContentText()).id;
//   console.log("Thread created successfully with threadID: ", newThreadID);
//   PropertiesService.getScriptProperties().setProperty('threadID', newThreadID);
// }

function createMessage() {
  const scriptProp = PropertiesService.getScriptProperties();

  //* Guard clause to check necessary properties
  const messageID = scriptProp.getProperty('messageID');
  if (messageID) return createErrorNotification("MessageID already set!", "createMessage");

  const threadID = scriptProp.getProperty('threadID');
  if (!threadID) return createErrorNotification("ThreadID not set!", "createMessage");

  const plainTextMessages = scriptProp.getProperty('plainTextMessages');
  if (!plainTextMessages) return createErrorNotification("No plainTextMessages found!", "createMessage");

  //* Creating a new message
  const url = `https://api.openai.com/v1/threads/${threadID}/messages`;
  const response = fetchResFromAPI(url, "post", { role: "user", content: plainTextMessages });
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error creating message!", "createMessage");

  const newMessageID = JSON.parse(response.getContentText()).id;
  console.log("Message created successfully with messageID: ", newMessageID);
  PropertiesService.getScriptProperties().setProperty('messageID', newMessageID);
  return onGmailMessageOpen();
}

function getMessageData(event) {
  const scriptProp = PropertiesService.getScriptProperties();

  //* Guard clause to check necessary properties
  const messageID = scriptProp.getProperty('messageID');
  if (!messageID)
    return createErrorNotification("MessageID not set!", "getMessageData");

  const threadID = scriptProp.getProperty('threadID');
  if (!threadID)
    return createErrorNotification("ThreadID not set!", "getMessageData");

  //* Getting message data
  const url = `https://api.openai.com/v1/threads/${threadID}/messages/${messageID}`;
  const response = fetchResFromAPI(url, "get");
  if (!checkResponseCode(response.getResponseCode()))
    return createErrorNotification("Error getting message data!", "getMessageData");

  const messageData = JSON.parse(response.getContentText());
  console.log("Message data: ", messageData);
}

// function getMessageData(event) {
//   const messageID = PropertiesService.getScriptProperties().getProperty('messageID');
//   if (!messageID) {
//     console.log("Message ID not set!");
//     return createErrorNotification("MessageID not set!");
//   }

//   const threadID = PropertiesService.getScriptProperties().getProperty('threadID');
//   if (!threadID) {
//     console.log("Thread ID not set!");
//     return createErrorNotification("ThreadID not set!");
//   }

//   const url = `https://api.openai.com/v1/threads/${threadID}/messages/${messageID}`;
//   const secret = getSecret();
//   if (!secret) return createErrorNotification("No secret found!");

//   const response = UrlFetchApp.fetch(url, {
//     method: "get",
//     contentType: "application/json",
//     headers: {
//       "Authorization": `Bearer ${secret}`,
//       "OpenAI-Beta": "assistants=v1"
//     }
//   });

//   if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error getting message data!");

//   const messageData = JSON.parse(response.getContentText());
//   console.log("Message data: ", messageData);
//   return messageData;
// }

function runAssistant() {
  //* Guard clause to check necessary properties
  const thread_id = PropertiesService.getScriptProperties().getProperty('threadID');
  if (!thread_id) return createErrorNotification("ThreadID not set!", "runAssistant");

  //* Running the assistant
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs`;
  const response = fetchResFromAPI(url, "post", { "assistant_id": "asst_jHFuDKx43IyrktWeooD6BzFp" });
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error running assistant!", "runAssistant");

  const run_id = JSON.parse(response.getContentText()).id;
  console.log("Run started successfully with runID: ", run_id);

  //* Waiting for the run to complete
  waitForCompletion(thread_id, run_id);
}

function waitForCompletion(thread_id, run_id) {
  let status = "";
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`;

  do {
    Utilities.sleep(2500); // Wait for 2.5 seconds before checking the status again
    const statusResponse = fetchResFromAPI(url, "get");
    if (!checkResponseCode(statusResponse.getResponseCode())) return createErrorNotification("Error getting run status!", "waitForCompletion");

    const statusData = JSON.parse(statusResponse.getContentText());
    status = statusData.status;
  } while (status !== "completed" && status !== "failed" && status !== "cancelled");

  //* Process the completed run or Handle failed or cancelled run
  if (status === "completed")
    getAssistantResponse(thread_id)
  else //TODO: Add handling for failure or cancellation here
    console.log("Run ended with status: " + status);
}

function getAssistantResponse(thread_id) {
  console.log("Run completed successfully.");

  const url = `https://api.openai.com/v1/threads/${thread_id}/messages?limit=10&order=desc`;
  const response = fetchResFromAPI(url, "get");
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error getting assistant response!", "getAssistantResponse");

  const responseData = JSON.parse(response.getContentText());
  const messages = responseData.data;

  const assistantMessages = [];
  messages.some(message => {
    if (message.role === "assistant") {
      assistantMessages.push(message.content[0].text.value);
      return false; // Continue to the next iteration
    } else if (message.role === "user") {
      return true; // Stop the iteration
    }
  });

  // Reverse the assistantMessages array if you want to process them in chronological order
  const orderedAssistantMessages = assistantMessages.reverse();

  // Process the assistant messages as needed
  orderedAssistantMessages.forEach((msg, index) => {
    Logger.log(`Assistant Message ${index + 1}: ${msg}`);
  });

  const card = CardService.newCardBuilder()
  const section = CardService.newCardSection();

  orderedAssistantMessages.forEach((msg, index) => {
    section.addWidget(CardService.newTextParagraph().setText(`Assistant Message ${index + 1}: ${msg}`));
  });
  //TODO: Assistant message is working but not displaying in the UI - need to fix this
  return card.addSection(section).build();
}

//! Untested function
function deleteThread() {
  const scriptProp = PropertiesService.getScriptProperties();
  const threadID = scriptProp.getProperty('threadID');
  if (!threadID) return createErrorNotification("ThreadID not provided!", "deleteThread");

  const url = `https://api.openai.com/v1/threads/${threadID}`;

  const response = fetchResFromAPI(url, "delete");
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error deleting thread!", "deleteThread");

  const deletionBool = JSON.parse(response.getContentText()).deleted;
  if (!deletionBool) return createErrorNotification("Thread not deleted!", "deleteThread");
  scriptProp.deleteProperty('threadID');
  scriptProp.deleteProperty('messageID');
  console.log("Thread ID & Message ID deleted successfully")
  return onGmailMessageOpen();
}
