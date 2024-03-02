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

  // Creating a section
  const section = CardService.newCardSection();

  // Buttons
  createButton("Get Thread Data", "getThreadData", section);
  createButton("Create AI Thread", "createAIThread", section);
  createButton("Create Message", "createMessage", section);
  createButton("Get Message Data", "getMessageData", section);
  createButton("Run Assistant", "runAssistant", section);

  card.addSection(section);

  //* For Dev. & testing purposes: New section for displaying ID's
  //TODO: Remove this section in production version
  const threadID = PropertiesService.getScriptProperties().getProperty('threadID');
  const messageID = PropertiesService.getScriptProperties().getProperty('messageID');
  const devSection = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(`Thread ID: ${threadID}`))
    .addWidget(CardService.newTextParagraph().setText(`Message ID: ${messageID}`));

  card.addSection(devSection);

  return card.build();
}


