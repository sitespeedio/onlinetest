/**
 * @param {import('browsertime').BrowsertimeContext} context
 * @param {import('browsertime').BrowsertimeCommands} commands
 */
export default async function (context, commands) {
  await commands.navigate('http://127.0.0.1:3000/');
  await commands.select.selectByIdAndValue('iterations', 1);

  await commands.mouse.singleClick.byXpath("//div[contains(@class,'tabs')]//span[normalize-space()='Scripting']/ancestor::a[1]");
  await commands.wait.byTime(2000);

  const surface = await commands.element.getByCss('#editor .ace_content');
  await commands.wait.bySelector('#editor .ace_text-input', 10_000);
  const code = "export default async function (context, commands) { return commands.measure.start('http://www.wikipedia.org/');}";

  const actions = commands.action.getActions();
  await actions
    .move({ origin: surface })
    .click()
    .sendKeys(code)
    .perform();

  await commands.measure.start('RunTest');
  await commands.click.byIdAndWait('submittest');
  // Wait for the test to finish ...
  await commands.wait.byXpath('/html/body/div[2]/h1', 30000);
  await commands.navigate('http://127.0.0.1:3000/search/');
  return commands.measure.stop();
}