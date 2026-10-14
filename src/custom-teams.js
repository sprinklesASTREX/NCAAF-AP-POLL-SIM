import {teams} from './data.js';

export const getTeams = state => [...teams, ...(state.customTeams || [])];

function teamProfile(state, input, id) {
  const name = String(input.name || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
  const conference = String(input.conference || 'Custom').trim();
  const strength = Number(input.strength);
  const color = String(input.color || '#347b55');
  if (name.length < 2 || name.length > 40) throw Error('Team names must be 2–40 characters.');
  if (getTeams(state).some(t => t.id !== id && t.name.toLowerCase() === name.toLowerCase())) throw Error('That team name is already taken.');
  if (!conference || conference.length > 30) throw Error('Use a conference name of 1–30 characters.');
  if (!Number.isInteger(strength) || strength < 25 || strength > 99) throw Error('Strength must be a whole number from 25 to 99.');
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw Error('Choose a valid team color.');
  return {
    id: id || `custom:${crypto.randomUUID()}`, name, conference, custom: true, color,
    startingStrength: strength, strength, performanceStrength: strength,
    stats: { w: 0, l: 0, statsSeason: null, historicalW: 0, historicalL: 0,
      ppg: 14 + strength * .3, allowed: 44 - strength * .28,
      passingYpg: 100 + strength * 2, rushingYpg: 60 + strength, historicalStrength: strength, performanceStrength: strength }
  };
}

export function addCustomTeam(state, input) {
  const team = teamProfile(state, input);
  const next = structuredClone(state);
  next.customTeams = [...(next.customTeams || []), team];
  next.ratings[team.id] = team.startingStrength;
  next.records[team.id] = { w: 0, l: 0 };
  return next;
}

export function editCustomTeam(state, id, input) {
  const old = state.customTeams?.find(t => t.id === id);
  if (!old) throw Error('Custom team not found.');
  const team = teamProfile(state, input, id), next = structuredClone(state);
  next.customTeams = next.customTeams.map(t => t.id === id ? team : t);
  next.ratings[id] = Math.max(5, Math.min(150, next.ratings[id] + team.startingStrength - old.startingStrength));
  return next;
}

export function removeCustomTeam(state, id) {
  if (!state.customTeams?.some(t => t.id === id)) throw Error('Custom team not found.');
  if (state.results.some(w => w.games.some(g => g.home === id || g.away === id))) throw Error('This team has played games. Start a new season before removing it.');
  const next = structuredClone(state);
  next.customTeams = next.customTeams.filter(t => t.id !== id);
  delete next.ratings[id]; delete next.records[id];
  return next;
}
