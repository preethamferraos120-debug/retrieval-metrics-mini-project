// Evaluate keyword and semantic search using MRR and Recall@10.
const fs = require('fs');

function loadTestSet(path) {
  const lines = fs.readFileSync(path, 'utf8').trim().split(/\r?\n/).slice(1);
  return lines.map(line => {
    const [query, ids] = line.split(',');
    return { query, correctIds: ids.split(';').map(Number) };
  });
}

const testSet = loadTestSet('test-set.csv');
const results = JSON.parse(fs.readFileSync('search-results.json', 'utf8'));

// Return the 1-based rank of the first correct result, or null for a miss.
function rankOf(rankedIds, correctIds) {
  const index = rankedIds.findIndex(id => correctIds.includes(Number(id)));
  return index === -1 ? null : index + 1;
}

// Reciprocal rank is 1/rank, or 0 when no correct result appears in the top 10.
function reciprocalRank(rankedIds, correctIds) {
  const rank = rankOf(rankedIds, correctIds);
  return rank === null ? 0 : 1 / rank;
}

let keywordRRTotal = 0;
let semanticRRTotal = 0;
let keywordHits = 0;
let semanticHits = 0;

const rows = testSet.map(({ query, correctIds }) => {
  const queryResults = results[query];
  if (!queryResults) {
    throw new Error(`Missing search results for query: ${query}`);
  }

  const keywordRank = rankOf(queryResults.keyword, correctIds);
  const semanticRank = rankOf(queryResults.semantic, correctIds);

  const keywordRR = reciprocalRank(queryResults.keyword, correctIds);
  const semanticRR = reciprocalRank(queryResults.semantic, correctIds);

  keywordRRTotal += keywordRR;
  semanticRRTotal += semanticRR;
  if (keywordRank !== null) keywordHits++;
  if (semanticRank !== null) semanticHits++;

  return { query, keywordRank, semanticRank };
});

const totalQueries = testSet.length;
const keywordMRR = keywordRRTotal / totalQueries;
const semanticMRR = semanticRRTotal / totalQueries;
const keywordRecall = keywordHits / totalQueries;
const semanticRecall = semanticHits / totalQueries;

console.log('| Query | Keyword rank | Semantic rank |');
console.log('|---|---|---|');
for (const row of rows) {
  console.log(`| ${row.query} | ${row.keywordRank ?? 'miss'} | ${row.semanticRank ?? 'miss'} |`);
}
console.log(`| **Summary** | **MRR ${keywordMRR.toFixed(2)} · Recall@10 ${keywordRecall.toFixed(2)}** | **MRR ${semanticMRR.toFixed(2)} · Recall@10 ${semanticRecall.toFixed(2)}** |`);
