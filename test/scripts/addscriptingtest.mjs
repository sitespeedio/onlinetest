/**
 * @param {import('browsertime').BrowsertimeContext} context
 * @param {import('browsertime').BrowsertimeCommands} commands
 */
export default async function (context, commands) {
  await commands.navigate('http://127.0.0.1:3000/');
  await commands.select.selectByIdAndValue('iterations', 1);

  // Run the test as headless
  await commands.mouse.singleClick.byId('tab-commandline');
  await commands.wait.byIdAndVisible('commandlinearea', 5000);
  await commands.addText.byId('--headless', 'commandlinearea');

  // Add the script. Ace is lazy-loaded on the first Scripting tab click,
  // so wait for it to finish initialising, then set the value via Ace's API
  // — typing through the surface element is timing-sensitive and was dropping
  // the leading character before this rewrite.
  await commands.mouse.singleClick.byId('tab-scripting');
  await commands.wait.byCondition('window.__aceInitialised === true', 10_000);

  const code = "export default async function (context, commands) { return commands.measure.start('https://www.wikipedia.org/');}";
  await commands.js.run(`
    (function () {
      var ed = window.ace.edit('editor');
      ed.setValue(${JSON.stringify(code)}, -1);
      ed.clearSelection();
    })();
  `);

  await commands.measure.start('RunTest');
  await commands.click.byIdAndWait('submittest');
  // Wait for the inner sitespeed.io run to finish and the running page to redirect to the report.
  // Cold chromedriver start + measure + upload can take >30 s on CI, so keep the budget generous.
  await commands.wait.byXpathAndVisible("//h2[starts-with(normalize-space(), '1 page analysed')]", 60000);
  return commands.measure.stop();
}