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

  // For testing/validation purposes I will save the data into a file to be able to see it
  // const fileName = "ThreadData-" + thread.getFirstMessageSubject() + ".txt";
  // DriveApp.createFile(fileName, JSON.stringify(plainTextMessages, null, 2));

  try {
    PropertiesService.getScriptProperties().setProperty('plainTextMessages', JSON.stringify(plainTextMessages));
  } catch (error) {
    Logger.log("Error setting plainTextMessages: ", error);
  }
}

function createAIThread(event) {
  // Check if threadID is already set
  const threadID = PropertiesService.getScriptProperties().getProperty('threadID');
  if (threadID) {
    console.log("Thread ID already set: ", threadID);
    return createErrorNotification("ThreadID already set!");
  }

  const url = "https://api.openai.com/v1/threads";
  const secret = getSecret();
  if (!secret) return createErrorNotification("No secret found!");

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "OpenAI-Beta": "assistants=v1"
    },
  });

  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error creating thread!");

  const newThreadID = JSON.parse(response.getContentText()).id;
  console.log("Thread created successfully with threadID: ", newThreadID);
  PropertiesService.getScriptProperties().setProperty('threadID', newThreadID);
}

function createMessage() {
  const messageID = PropertiesService.getScriptProperties().getProperty('messageID');
  if (messageID) {
    console.log("Message ID already set: ", messageID);
    return createErrorNotification("MessageID already set!");
  }


  const threadID = PropertiesService.getScriptProperties().getProperty('threadID');
  if (!threadID) {
    console.log("Thread ID not set!");
    return createErrorNotification("ThreadID not set!");
  }

  const plainTextMessages = PropertiesService.getScriptProperties().getProperty('plainTextMessages');
  if (!plainTextMessages) {
    console.log("No plainTextMessages found!");
    return createErrorNotification("No plainTextMessages found!");
  }

  const url = `https://api.openai.com/v1/threads/${threadID}/messages`;
  const secret = getSecret();
  if (!secret) return createErrorNotification("No secret found!");

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "OpenAI-Beta": "assistants=v1"
    },
    payload: JSON.stringify({
      "role": "user",
      "content": plainTextMessages
    })
  });

  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error creating message!");

  const newMessageID = JSON.parse(response.getContentText()).id;
  console.log("Message created successfully with messageID: ", newMessageID);
  PropertiesService.getScriptProperties().setProperty('messageID', newMessageID);
}

function getMessageData(event) {
  const messageID = PropertiesService.getScriptProperties().getProperty('messageID');
  if (!messageID) {
    console.log("Message ID not set!");
    return createErrorNotification("MessageID not set!");
  }

  const threadID = PropertiesService.getScriptProperties().getProperty('threadID');
  if (!threadID) {
    console.log("Thread ID not set!");
    return createErrorNotification("ThreadID not set!");
  }

  const url = `https://api.openai.com/v1/threads/${threadID}/messages/${messageID}`;
  const secret = getSecret();
  if (!secret) return createErrorNotification("No secret found!");

  const response = UrlFetchApp.fetch(url, {
    method: "get",
    contentType: "application/json",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "OpenAI-Beta": "assistants=v1"
    }
  });

  if (!checkResponseCode(response.getResponseCode())) return createErrorNotification("Error getting message data!");

  const messageData = JSON.parse(response.getContentText());
  console.log("Message data: ", messageData);
  return messageData;
}

function runAssistant() {
  const thread_id = PropertiesService.getScriptProperties().getProperty('threadID');
  if (!thread_id) {
    Logger.log("Thread ID not set!");
    return createErrorNotification("ThreadID not set!");
  }

  const secret = getSecret();
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs`;
  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v1"
    },
    payload: JSON.stringify({
      "assistant_id": "asst_jHFuDKx43IyrktWeooD6BzFp",
    })
  });

  if (!checkResponseCode(response.getResponseCode())) {
    return createErrorNotification("Error running assistant!");
  }

  // Assuming the run ID is obtained from the response
  const responseData = JSON.parse(response.getContentText());
  const run_id = responseData.id; // Adjust based on actual response structure

  waitForCompletion(thread_id, run_id, secret);
}

function waitForCompletion(thread_id, run_id, secret) {
  let status = "";
  const url = `https://api.openai.com/v1/threads/${thread_id}/runs/${run_id}`;

  do {
    Utilities.sleep(5000); // Wait for 5 seconds before checking the status again
    const statusResponse = UrlFetchApp.fetch(url, {
      method: "get",
      headers: {
        "Authorization": `Bearer ${secret}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "assistants=v1"
      }
    });

    const statusData = JSON.parse(statusResponse.getContentText());
    status = statusData.status; // Adjust based on the actual response structure
  } while (status !== "completed" && status !== "failed" && status !== "cancelled");

  if (status === "completed") {
    // Process the completed run
    console.log("Run completed successfully.");
    getAssistantResponse(thread_id)
  } else {
    // Handle failed or cancelled run
    console.log("Run ended with status: " + status);
    // Add handling for failure or cancellation here
  }
}

function getAssistantResponse(thread_id) {
  const url = `https://api.openai.com/v1/threads/${thread_id}/messages?limit=5&order=desc`;
  const secret = getSecret(); // Ensure you have a function to securely fetch your OpenAI API key

  const options = {
    method: "get",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "assistants=v1"
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  if (!checkResponseCode(response.getResponseCode())) return null;

  const responseData = JSON.parse(response.getContentText());
  const messages = responseData.data;

  const assistantMessages = [];
  messages.some(message => {
    if (message.role === "assistant") {
      assistantMessages.push(message.content[0].text.value); // Adjust based on actual structure
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
  //! Assistant message is working but not displaying in the UI - need to fix this
  return card.addSection(section).build();
}

