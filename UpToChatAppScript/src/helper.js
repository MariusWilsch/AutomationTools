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

/**
 * Create an error notification for the UI.
 * @param {string} errorMessage - The error message to display to the user.
 * @return {GoogleAppsScript.Card_Service.ActionResponse} - The action response with the error notification.
 */
function createErrorNotification(errorMessage) {
  return CardService.newActionResponseBuilder()
    .setNotification(CardService.newNotification()
      .setText(errorMessage)
      .setType(CardService.NotificationType.ERROR))
    .build();
}

function fetchResFromAPI(url, method, payload = null) {
  const secret = getSecret();
  if (!secret) return createErrorNotification("No secret found!");

  const options = {
    method: method,
    contentType: "application/json",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "OpenAI-Beta": "assistants=v1"
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  const response = UrlFetchApp.fetch(url, options);

  if (!checkResponseCode(response.getResponseCode())) {
    return createErrorNotification("Error making request!");
  }

  return response;
}

function parseResponse(response) {
  const responseData = JSON.parse(response.getContentText());
  return responseData;
}
