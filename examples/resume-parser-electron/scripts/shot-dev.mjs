import { connect } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const c = await connect(9333, 30000);
await c.evaluate("document.querySelector('#rows tr').click()");
const r = await c.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(process.argv[2], Buffer.from(r.result.data, 'base64'));
console.log(await c.evaluate('innerWidth + "x" + innerHeight + " dpr " + devicePixelRatio'));
c.close();
