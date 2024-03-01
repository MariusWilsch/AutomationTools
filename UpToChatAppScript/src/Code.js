function buildHomepage() {
  const card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle("Welcome to My Add-on"))
    .addSection(
      CardService.newCardSection().addWidget(
        CardService.newTextParagraph().setText(
          "This is your add-on's homepage. Use this space to provide information or functionality to your users."
        )
      )
    )
    .build();
  return card;
}

function onGmailMessageOpen(context) {
  const card = CardService.newCardBuilder();

  // Creating a header
  const header = CardService.newCardHeader()
    .setTitle("Gmail Add-on")
    .setSubtitle("Interact with your Email!");
  card.setHeader(header);

  // // Creating a section
  const section = CardService.newCardSection();

  // Buttons
  createButton("Get Thread Data", "getThreadData", section);
  createButton("Create AI Thread", "createAIThread", section);

  card.addSection(section);
  return card.build();
}

function getSecret() {
  const projectId = "micro-pilot-415714";
  const secretName = "OpenAI-API-KEY"
  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/latest:access`;

  const res = UrlFetchApp.fetch(url, {
    method: "get",
    headers: {
      "Authorization": "Bearer " + ScriptApp.getOAuthToken(),
      "Content-Type": "application/json"
    }
  });

  const data = JSON.parse(res.getContentText());
  Logger.log(data, res.getResponseCode());
  if (res.getResponseCode() === 200) {
    // Replace atob with Utilities.base64Decode and convert byte array to string
    const secretPayload = Utilities.newBlob(data.payload.data).getDataAsString();
    Logger.log(secretPayload);
    return secretPayload;
  } else {
    Logger.log("Error: ", res.getResponseCode());
    return null;
  }
}

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
  const fileName = "ThreadData-" + thread.getFirstMessageSubject() + ".txt";
  DriveApp.createFile(fileName, JSON.stringify(plainTextMessages, null, 2));

  PropertiesService.getScriptProperties().setProperties({
    'plainTextMessages': JSON.stringify(plainTextMessages, null, 2),
  });
}

function createAIThread(event) {
  // const url = "https://api.openai.com/v1/threads"
  // const plainMessages = JSON.parse(PropertiesService.getScriptProperties().getProperty('plainTextMessages'));

  const secret = getSecret();
  Logger.log("Secret is ", secret);

  // const payload = {
  //   messages: [
  //     {
  //       role: "user",
  //       content: plainMessages.join(' ')
  //     }
  //   ]
  // }

  // const options = {
  //   method: "post",
  //   contentType: "application/json",
  //   payload: JSON.stringify(payload),
  // }

  // const response = UrlFetchApp.fetch(url, options);
  // Logger.log(response);
}
