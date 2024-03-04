function buildHomepage() {
  const card = CardService.newCardBuilder()

  //* Creating a header
  card.setHeader(CardService.newCardHeader().setTitle("Add-on Description"));

  //* Explainer Section
  const section = CardService.newCardSection();

  section.addWidget(CardService.newDecoratedText().setText("Summarize long emails or threads with just one click").setWrapText(true));
  section.addWidget(CardService.newDecoratedText().setText("To get started, open an email").setWrapText(true));

  card.addSection(section);

  const image = CardService.newImage()
    .setAltText("UpToChat Image")
    .setImageUrl("https://drive.google.com/uc?export=view&id=1xn72rz3cl7sGVVNXnJOrI8BtbWg6tH1x");
  card.addSection(CardService.newCardSection().addWidget(image));
  return card.build();
}

function onGmailMessageOpen(context) {
  const card = CardService.newCardBuilder();

  // Creating a header
  const header = CardService.newCardHeader()
    .setTitle("How to use UpToChat Add-on")
  card.setHeader(header);

  // Creating a section
  const section = CardService.newCardSection();
  section.addWidget(CardService.newTextParagraph().setText("Click on the button below to summarize the email thread. The app is configured to return an overall summary and a segmented summary."));

  // Buttons
  createButton("Summarize Email", "runWrapper", section);
  createButton("Delete Thread", "deleteThread", section);

  card.addSection(section);

  return card.build();
}

//* Old version of onGmailMessageOpen

// function onGmailMessageOpen(context) {
//   const card = CardService.newCardBuilder();

//   // Creating a header
//   const header = CardService.newCardHeader()
//     .setTitle("Gmail Add-on")
//     .setSubtitle("Interact with your Email!");
//   card.setHeader(header);

//   // Creating a section
//   const section = CardService.newCardSection();

//   // Buttons
//   createButton("Get Thread Data", "getThreadData", section);
//   createButton("Create AI Thread", "createEmptyThread", section);
//   createButton("Create Message", "createMessage", section);
//   createButton("Get Message Data", "getMessageData", section);
//   createButton("Run Assistant", "runAssistant", section);
//   createButton("Delete Thread", "deleteThread", section);

//   card.addSection(section);

//   //* For Dev. & testing purposes: New section for displaying ID's
//   //TODO: Remove this section in production version
//   const threadID = PropertiesService.getScriptProperties().getProperty('threadID');
//   const messageID = PropertiesService.getScriptProperties().getProperty('messageID');
//   const devSection = CardService.newCardSection()
//     .addWidget(CardService.newTextParagraph().setText(`Thread ID: ${threadID}`))
//     .addWidget(CardService.newTextParagraph().setText(`Message ID: ${messageID}`));

//   card.addSection(devSection);

//   return card.build();
// }
