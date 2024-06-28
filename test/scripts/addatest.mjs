/**
 * @param {import('browsertime').BrowsertimeContext} context
 * @param {import('browsertime').BrowsertimeCommands} commands
 */
export default async function (context, commands) {
    await commands.navigate('http://127.0.0.1:3000/');
    await commands.addText.byId('https://www.wikipedia.org', 'url');
    await commands.select.selectByIdAndValue('iterations', 1); 
    await commands.mouse.singleClick.byXpath('/html/body/section/div/div[2]/ul/li[2]');
    await commands.wait.byId('commandlinearea', 5000);
    await commands.addText.byId('--headless', 'commandlinearea');
    await commands.measure.start('RunTest');
    await commands.click.byIdAndWait('submittest');
    await commands.wait.byXpath('/html/body/div[2]/h1',30000);
    await commands.navigate('http://127.0.0.1:3000/search/');
    return commands.measure.stop();
  }