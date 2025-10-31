/**
 * @param {import('browsertime').BrowsertimeContext} context
 * @param {import('browsertime').BrowsertimeCommands} commands
 */
export default async function (context, commands) {
  await commands.navigate('http://127.0.0.1:3000/');
  await commands.select.selectByIdAndValue('iterations', 1);

  // Run the test as headless
  await commands.mouse.singleClick.byXpath("//div[contains(@class,'tabs')]//span[normalize-space()='Command line args']/ancestor::a[1]");
  await commands.wait.byIdAndVisible('commandlinearea', 5000);
  await commands.addText.byId('--headless', 'commandlinearea');

  // Add the script
  await commands.mouse.singleClick.byXpath("//div[contains(@class,'tabs')]//span[normalize-space()='Scripting']/ancestor::a[1]");
  await commands.wait.byTime(2000);

  const surface = await commands.element.getByCss('#editor .ace_content');
  await commands.wait.bySelector('#editor .ace_text-input', 10_000);
  // Hack eeeeeexport
  const code = "eexport default async function (context, commands) { return commands.measure.start('https://www.wikipedia.org/');}";

  // Clear the text area
  await commands.js.run(`
    (function () {
      const el = document.getElementById('editor');
      if (window.ace && el) {
        const ed = window.ace.edit(el);
        ed.setValue('', -1); // clear and move cursor to start
        ed.clearSelection();
        return true;
      }
      return false;
    })();
  `);

  const actions = commands.action.getActions();
  await actions
    .move({ origin: surface })
    .click()
    .sendKeys(code)
    .perform();

  await commands.wait.byTime(2000);

  await commands.measure.start('RunTest');
  await commands.click.byIdAndWait('submittest');
  // Wait for the test to finish ...
  await commands.wait.byXpathAndVisible("//h1[normalize-space(.)='Page summary']",30000);
  return commands.measure.stop();
}