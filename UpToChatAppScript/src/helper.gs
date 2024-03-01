function createButton(text, functionName, section) {
  const button = CardService.newTextButton()
    .setText(text)
    .setOnClickAction(CardService.newAction().setFunctionName(functionName));
  section.addWidget(button);
}