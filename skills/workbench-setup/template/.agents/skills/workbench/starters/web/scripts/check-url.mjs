// Asks the site's address for its home page like a stranger would, and says whether it is
// private (asks for sign-in) or public (serves the site).
//   node scripts/check-url.mjs <https://address> [private|public]     (default: private)
// Exit code 0 = as expected, 1 = not as expected (a private site that is public is an emergency), 2 = no clear answer.
import { probe } from './lib.mjs';

const [url, expected = 'private'] = process.argv.slice(2);
if (!url || !/^https:\/\//.test(url) || !['private', 'public'].includes(expected)) {
  console.error('Usage: node scripts/check-url.mjs <https://address> [private|public]');
  process.exit(2);
}
const result = await probe(url);
const shown = result.verdict === 'protected' ? 'asks for sign-in (private)' : result.verdict === 'public' ? 'shows the site to anyone (public)' : `no clear answer (status ${result.status}${result.error ? `, ${result.error}` : ''})`;
console.log(`${url}: ${shown}`);
if (result.verdict === 'unknown') process.exit(2);
const asExpected = (result.verdict === 'public') === (expected === 'public');
if (!asExpected) console.error(expected === 'private' ? 'NOT PRIVATE: anyone can open this site.' : 'Still asks for sign-in: the public step in README.md is not done yet.');
process.exit(asExpected ? 0 : 1);
