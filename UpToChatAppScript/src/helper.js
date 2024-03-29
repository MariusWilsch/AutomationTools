function createButton(text, functionName, section) {
  const button = CardService.newTextButton()
    .setText(text)
    .setOnClickAction(CardService.newAction().setFunctionName(functionName));
  section.addWidget(button);
}

function checkResponseCode(responseCode) {
  if (responseCode !== 200) {
    Logger.log('Non-successful response code: ' + responseCode);
    return false;
  }
  return true;
}

function getSecret() {
  const projectId = "micro-pilot-415714";
  const secretName = "OpenAI-API-KEY"
  const url = `https://secretmanager.googleapis.com/v1/projects/${projectId}/secrets/${secretName}/versions/latest:access`;

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

  if (!checkResponseCode(response.getResponseCode())) return null;

  const secretPayload = JSON.parse(response.getContentText()).payload.data;
  const decodedSecret = Utilities.newBlob(Utilities.base64Decode(secretPayload)).getDataAsString();

  return decodedSecret;
}

function createErrorNotification(errorMessage, funcName = "") {
  console.log(errorMessage + " in " + funcName)
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText(errorMessage)
      .setType(CardService.NotificationType.ERROR))
    .build();
}

function fetchResFromAPI(url, method, payload = null) {
  const secret = getSecret();
  if (!secret) return createErrorNotification("No secret found!", "fetchResFromAPI");

  const options = {
    method: method,
    headers: {
      "Authorization": `Bearer ${secret}`,
      "content-type": "application/json",
      "OpenAI-Beta": "assistants=v1"
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch(url, options);

  return response;
}

function createSummaryCard(output) {
  //* String manipulation to beautify the output
  const summary = output.split('Sectioned Summaries:')
  console.log(summary)
  const overallSummary = summary[0].replace('Overall Summary:', '').trim();
  const sectionedSummaries = summary[1].replace('Sectioned Summaries:', '').trim();

  console.log(overallSummary);
  console.log(sectionedSummaries);

  // Create a new card builder
  const cardBuilder = CardService.newCardBuilder();

  // Set the card header
  cardBuilder.setHeader(CardService.newCardHeader().setTitle("Your Email Summary"));

  // Add the Overall Summary section
  const sectionOverall = CardService.newCardSection().setHeader("<b>Overall Summary:</b>");
  sectionOverall.addWidget(CardService.newTextParagraph().setText(`${overallSummary}`));

  // Add the Sectioned Summaries section, make it collapsible
  const sectionSectioned = CardService.newCardSection().setCollapsible(true).setHeader("<b>Sectioned Summaries:</b>");
  sectionSectioned.addWidget(CardService.newTextParagraph().setText(sectionedSummaries));

  // Add sections to card
  cardBuilder.addSection(sectionOverall);
  cardBuilder.addSection(sectionSectioned);

  console.log("Card created successfully");
  // Return the built card
  return cardBuilder.build();
}