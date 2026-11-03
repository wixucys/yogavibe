// Mermaid 11.4.1 and Playwright render only local documentation, not application UI.
// npm install --prefix /tmp/yogavibe-diagrams mermaid@11.4.1 playwright@1.62.1
// DIAGRAM_MODULE_ROOT=/tmp/yogavibe-diagrams node scripts/render-diagrams.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const moduleRoot = process.env.DIAGRAM_MODULE_ROOT;
if (!moduleRoot) throw new Error('Set DIAGRAM_MODULE_ROOT to a directory with installed mermaid and playwright.');
const req = createRequire(path.resolve(moduleRoot, 'package.json'));
const { chromium } = process.env.PLAYWRIGHT_MODULE
  ? await import(process.env.PLAYWRIGHT_MODULE)
  : req('playwright');
const dist = path.dirname(req.resolve('mermaid'));
const html = '<html><head><meta charset="utf-8"></head><body style="margin:24px;background:white"><div id="diagram"></div><script type="module">import mermaid from "/mermaid/mermaid.esm.min.mjs"; mermaid.initialize({startOnLoad:false,theme:"neutral",securityLevel:"strict",fontFamily:"Arial",flowchart:{htmlLabels:true,useMaxWidth:false},sequence:{useMaxWidth:false},er:{useMaxWidth:false},state:{useMaxWidth:false}}); window.renderDiagram=async(text)=>{const {svg}=await mermaid.render("rendered",text);document.querySelector("#diagram").innerHTML=svg;await document.fonts.ready;};</script></body></html>';
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(html);
      return;
    }
    if (!url.pathname.startsWith('/mermaid/')) throw new Error('not found');
    const filename = path.resolve(dist, decodeURIComponent(url.pathname.slice('/mermaid/'.length)));
    if (!filename.startsWith(dist + path.sep)) throw new Error('invalid path');
    response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    response.end(await fs.readFile(filename));
  } catch {
    response.statusCode = 404;
    response.end('Not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({headless:true});
  const page = await browser.newPage({viewport:{width:1800,height:1200},deviceScaleFactor:2});
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.waitForFunction(() => typeof window.renderDiagram === 'function');
  const folder = path.join(root, 'docs/diagrams');
  for (const name of (await fs.readdir(folder)).filter(n => n.endsWith('.mmd')).sort()) {
    await page.evaluate(text => window.renderDiagram(text), await fs.readFile(path.join(folder,name),'utf8'));
    const svg = page.locator('#diagram svg').first();
    const bounds = await svg.boundingBox();
    if (!bounds || bounds.width < 100 || bounds.height < 100) throw new Error('Invalid diagram ' + name);
    await page.setViewportSize({width:Math.ceil(bounds.width+80),height:Math.ceil(bounds.height+80)});
    await svg.screenshot({path:path.join(folder,name.replace(/\.mmd$/,'.png'))});
    console.log(name + ': ' + Math.round(bounds.width) + 'x' + Math.round(bounds.height) + ' CSS pixels');
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
