function runWrapper(event) {
  let card;
  try {
    getThreadData(event);
    createEmptyThread();
    createMessage();
    card = runAssistant();
    //! I need to test if the Assistant always returns the same output
    //! format with overall summary and sectioned summary
    // deleteThread();
  } catch (error) {
    console.log("Error in runWrapper: ", error);
  }
  return card;
}

function getThreadData(event) {
  const message = GmailApp.getMessageById(event.messageMetadata.messageId);
  const messages = message.getThread().getMessages();
  const plainTextMessages = messages.map((message, num) => {
    let body = message.getPlainBody();
    body = body.replace(/(\r\n){2,}/g, '\r\n');
    body = body.replace(/-{2,}/g, '');
    return `MESSAGE ${num + 1} - ${body}`
  });
  PropertiesService.getScriptProperties().setProperty('plainTextMessages', JSON.stringify(plainTextMessages));
  console.log("Thread Data fetched successfully!")
}
//? Would it be better to create a class for shared variables and methods? like getScriptProperties, setScriptProperties, etc.

function createEmptyThread() {
  const scriptProp = PropertiesService.getScriptProperties();
  //* Check if threadID is already set
  const threadID = scriptProp.getProperty('threadID');
  if (threadID) return createErrorNotification("ThreadID already set!", "createEmptyThread");

  //* Creating a new empty thread
  const response = fetchResFromAPI("https://api.openai.com/v1/threads", "post");
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error creating thread!", "createEmptyThread");

  const newThreadID = JSON.parse(response.getContentText()).id;
  scriptProp.setProperty('threadID', newThreadID);
  console.log("Thread created successfully with threadID: ", newThreadID);
}

function createMessage() {
  const scriptProp = PropertiesService.getScriptProperties();

  //* Guard clause to check necessary properties
  // const messageID = scriptProp.getProperty('messageID');
  // if (messageID) return createErrorNotification("MessageID already set!", "createMessage");

  const threadID = scriptProp.getProperty('threadID');
  if (!threadID) return createErrorNotification("ThreadID not set!", "createMessage");

  const plainTextMessages = scriptProp.getProperty('plainTextMessages');
  if (!plainTextMessages) return createErrorNotification("No plainTextMessages found!", "createMessage");

  //* Creating a new message
  const url = `https://api.openai.com/v1/threads/${threadID}/messages`;
  const response = fetchResFromAPI(url, "post", { role: "user", content: plainTextMessages });
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error creating message!", "createMessage");

  const newMessageID = JSON.parse(response.getContentText()).id;
  PropertiesService.getScriptProperties().setProperty('messageID', newMessageID);
  console.log("Message created successfully with messageID: ", newMessageID);
}

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
  orderedAssistantMessages = waitForCompletion(thread_id, run_id);
  if (!orderedAssistantMessages) return createErrorNotification("Assistant messages not available", "runAssistant");

  // // Once you have the orderedAssistantMessages...
  // const cardBuilder = CardService.newCardBuilder();
  // cardBuilder.setHeader(CardService.newCardHeader().setTitle("Assistant Response"));
  // const section = CardService.newCardSection();

  // orderedAssistantMessages.forEach((msg, index) => {
  //   section.addWidget(CardService.newTextParagraph().setText(`Assistant Message ${index + 1}: ${msg}`));
  // });

  // cardBuilder.addSection(section);

  // Now, instead of returning the card, use the ActionResponseBuilder to update the UI
  const actionResponse = CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(createSummaryCard(orderedAssistantMessages[0])))
    .build();

  return actionResponse;
}


// function runAssistant() {
//   //* Guard clause to check necessary properties
//   const thread_id = PropertiesService.getScriptProperties().getProperty('threadID');
//   if (!thread_id) return createErrorNotification("ThreadID not set!", "runAssistant");

//   //* Running the assistant
//   const url = `https://api.openai.com/v1/threads/${thread_id}/runs`;
//   const response = fetchResFromAPI(url, "post", { "assistant_id": "asst_jHFuDKx43IyrktWeooD6BzFp" });
//   if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error running assistant!", "runAssistant");

//   const run_id = JSON.parse(response.getContentText()).id;
//   console.log("Run started successfully with runID: ", run_id);

//   //* Waiting for the run to complete
//   assistantMessages = waitForCompletion(thread_id, run_id);
//   if (!assistantMessages) return createErrorNotification("Assistant message not available", "runAssistant");

//   //* Action Response
//   //! If there are multiple messages they won't be displayed as of now
//   const actionResponse = CardService.newActionResponseBuilder()
//     .setNavigation(CardService.newNavigation().pushCard(createSummaryCard(assistantMessages)))
//     .build();
//   return actionResponse;
// }

function waitForCompletion(thread_id, run_id) {
  let status = "";
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`;

  do {
    Utilities.sleep(2000); // Wait for 2.5 seconds before checking the status again
    const statusResponse = fetchResFromAPI(url, "get");
    if (!checkResponseCode(statusResponse.getResponseCode())) return createErrorNotification("Error getting run status!", "waitForCompletion");

    const statusData = JSON.parse(statusResponse.getContentText());
    status = statusData.status;
  } while (status !== "completed" && status !== "failed" && status !== "cancelled");

  //* Process the completed run or Handle failed or cancelled run
  if (status === "completed")
    return getAssistantResponse(thread_id)
  console.log("Run ended with status: " + status);
  return createErrorNotification("Run ended with status: " + status, "waitForCompletion");
}

function getAssistantResponse(thread_id) {
  console.log("Run completed successfully.");

  const url = `https://api.openai.com/v1/threads/${thread_id}/messages?limit=5&order=desc`;
  const response = fetchResFromAPI(url, "get");
  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error getting assistant response!", "getAssistantResponse");

  const responseData = JSON.parse(response.getContentText());
  const messages = responseData.data;

  //TODO: I think in this use case the assistant will always only be the first message in the array
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

  return orderedAssistantMessages;
}

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
}
