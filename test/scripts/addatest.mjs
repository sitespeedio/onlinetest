/**
 * @param {import('browsertime').BrowsertimeContext} context
 * @param {import('browsertime').BrowsertimeCommands} commands
 */
export default async function (context, commands) {
    await commands.navigate('http://127.0.0.1:3000/');
    await commands.addText.byId('https://www.wikipedia.org', 'url');
    await commands.select.selectByIdAndValue('iterations', 1);
    await commands.mouse.singleClick.byXpath("//div[contains(@class,'tabs')]//span[normalize-space()='Command line args']/ancestor::a[1]");
    await commands.wait.byIdAndVisible('commandlinearea', 5000);
    await commands.addText.byId('--headless', 'commandlinearea');
    await commands.measure.start('RunTest');
    await commands.click.byIdAndWait('submittest');
    // Wait for the test to finish ...
    await commands.wait.byXpathAndVisible("//h1[normalize-space(.)='Page summary']",30000);
    return commands.measure.stop();
  }