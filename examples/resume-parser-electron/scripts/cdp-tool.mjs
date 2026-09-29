// Usage: node scripts/cdp-tool.mjs <port> click <css selector>
//        node scripts/cdp-tool.mjs <port> eval "<js expression>"
//        node scripts/cdp-tool.mjs <port> shot <file.png>
// Talks only to the app window that I launched with --remote-debugging-port.
import { writeFileSync } from 'node:fs';
import { connect } from './cdp.mjs';
const [port, cmd, arg] = process.argv.slice(2);
const c = await connect(Number(port), 30000);
if (cmd === 'click') {
  const r = await c.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(arg)}).getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
  const [x, y] = r;
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await c.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  }
  console.log('clicked', arg, 'at', Math.round(x), Math.round(y));
} else if (cmd === 'eval') {
  console.log(JSON.stringify(await c.evaluate(arg), null, 1));
} else if (cmd === 'shot') {
  const r = await c.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(arg, Buffer.from(r.result.data, 'base64'));
  console.log('saved', arg);
}
c.close();
process.exit(0);
