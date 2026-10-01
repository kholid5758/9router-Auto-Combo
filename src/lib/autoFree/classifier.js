/**
 * Model Classification & Categorization Engine
 *
 * Provides shared pure classification logic for models across sync.js and web.js
 * without circular dependencies.
 */

const fs = require('node:fs');
const path = require('node:path');
const { BENCHMARKS_PATH, SMART_MIN_SCORE } = require('./update-benchmarks.js');

const SUPER_COMBOS = [
  'auto-free',
  'auto-smart',
  'auto-code',
  'auto-fast',
  'cooldown',
];

function isReasoningModel(modelIdentifier) {
  const id = String(modelIdentifier).toLowerCase();
  return /\b(r1|o1|o3|qwq)\b|thinking|reasoner|reflection/i.test(id) || id.includes('deepseek-r1') || id.includes('o1-') || id.includes('o3-') || id.includes('qwq-');
}

function isCodingSpecialistModel(modelIdentifier) {
  const id = String(modelIdentifier).toLowerCase();
  return /codestral|coder|starcoder|codegeex|devin/i.test(id) || id.includes('-coder') || id.includes('code-');
}

function getBenchmarksDatabase() {
  try {
    if (fs.existsSync(BENCHMARKS_PATH)) {
      return JSON.parse(fs.readFileSync(BENCHMARKS_PATH, 'utf8'));
    }
  } catch (err) {
    // silently return empty object on missing or invalid
  }
  return {};
}

function findBenchmarkMatch(modelIdentifier, benchmarks) {
  if (!benchmarks) return null;
  const rawId = String(modelIdentifier).toLowerCase();
  const strippedId = rawId.replace(/^[a-z0-9_.~-]+\//i, '').replace(/:free$/, '');
  const baseName = strippedId.split('/').pop();

  if (benchmarks[strippedId]) return benchmarks[strippedId];
  if (benchmarks[baseName]) return benchmarks[baseName];

  for (const [key, data] of Object.entries(benchmarks)) {
    if (strippedId.includes(key) || baseName.includes(key)) return data;
  }
  return null;
}

function getCodingScore(modelIdentifier, customBenchmarks = null) {
  const benchmarks = customBenchmarks || getBenchmarksDatabase();
  const match = findBenchmarkMatch(modelIdentifier, benchmarks);
  if (match && typeof match.score === 'number') {
    return match.score * 100;
  }

  const id = String(modelIdentifier).toLowerCase();
  let baseScore = 4000;

  if (id.includes('claude') || id.includes('sonnet') || id.includes('opus')) baseScore = 8000;
  else if (id.includes('gemini') || id.includes('gpt-4') || id.includes('o1') || id.includes('o3') || id.includes('r1')) baseScore = 7500;
  else if (id.includes('qwen') || id.includes('deepseek') || id.includes('codestral') || id.includes('mistral') || id.includes('devin') || id.includes('glm')) baseScore = 6500;
  else if (id.includes('coder') || id.includes('code') || id.includes('instruct')) baseScore = 5500;
  else if (id.includes('flash') || id.includes('mini') || id.includes('small') || id.includes('lite') || id.includes('nano')) baseScore = 4500;

  if (id.includes('preview') || id.includes('thinking') || id.includes('reasoner')) baseScore += 500;

  const versionMatch = id.match(/(?:^|[^\d])(\d+(?:\.\d+)+)(?:[^\d]|$)/);
  if (versionMatch) {
    const versionNum = parseFloat(versionMatch[1]);
    if (!isNaN(versionNum) && versionNum < 20) {
      baseScore += Math.min(versionNum * 50, 500);
    }
  }

  const paramMatch = id.match(/(?:^|[^\w])(\d+)b(?:[^\w]|$)/);
  if (paramMatch) {
    const size = parseInt(paramMatch[1], 10);
    if (size >= 100) baseScore += 1000;
    else if (size >= 65) baseScore += 800;
    else if (size >= 30) baseScore += 500;
    else if (size >= 14) baseScore += 200;
    else if (size <= 8) baseScore -= 300;
  }

  if (id.includes('embed') || id.includes('image') || id.includes('vision') || id.includes('audio') || id.includes('tts') || id.includes('whisper') || id.includes('flux') || id.includes('diffusion')) {
    baseScore = -10000;
  }

  return baseScore;
}

function isProModel(modelIdentifier, benchmarks = null) {
  if (isReasoningModel(modelIdentifier)) return false;
  const str = String(modelIdentifier).toLowerCase();
  const match = findBenchmarkMatch(str, benchmarks || getBenchmarksDatabase());
  if (match && typeof match.score === 'number') {
    return match.score >= 75;
  }
  const codingScore = getCodingScore(modelIdentifier, benchmarks);
  return (codingScore / 100) >= 75;
}


function isSmartTierModel(modelIdentifier, benchmarks = null) {
  const str = String(modelIdentifier).toLowerCase();
  if (isReasoningModel(str)) return true;
  const match = findBenchmarkMatch(str, benchmarks || getBenchmarksDatabase());
  if (match && typeof match.score === 'number') {
    return match.score >= SMART_MIN_SCORE;
  }
  const codingScore = getCodingScore(modelIdentifier, benchmarks);
  return (codingScore / 100) >= SMART_MIN_SCORE;
}

function isCodingTierModel(modelIdentifier, benchmarks = null) {
  const str = String(modelIdentifier).toLowerCase();
  if (isCodingSpecialistModel(str)) return true;
  const match = findBenchmarkMatch(str, benchmarks || getBenchmarksDatabase());
  if (match && typeof match.score === 'number') {
    return match.score >= 75;
  }
  const codingScore = getCodingScore(modelIdentifier, benchmarks);
  return (codingScore / 100) >= 75;
}

module.exports = {
  SUPER_COMBOS,
  SMART_MIN_SCORE,
  isReasoningModel,
  isCodingSpecialistModel,
  isCodingTierModel,
  isProModel,
  isSmartTierModel,
  getCodingScore,
  findBenchmarkMatch,
  getBenchmarksDatabase
};
