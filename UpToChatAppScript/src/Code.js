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

  Logger.log('Retrieving secret from Secret Manager: ', ScriptApp.getOAuthToken());

  const options = {
    'method': 'get',
    'headers': { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
    'muteHttpExceptions': true
  };

  let response;
  try {
    response = UrlFetchApp.fetch(url, options);
  } catch (e) {
    Logger.log('Failed to retrieve the secret. Error: ' + e.toString());
    return null;
  }

  const responseCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (responseCode !== 200) {
    Logger.log('Non-successful response code: ' + responseCode + ' - ' + responseBody);
    return null;
  }

  const secretPayload = JSON.parse(responseBody).payload.data;
  const decodedSecret = Utilities.newBlob(Utilities.base64Decode(secretPayload)).getDataAsString();

  return decodedSecret;
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
  Logger.log(secret);

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
