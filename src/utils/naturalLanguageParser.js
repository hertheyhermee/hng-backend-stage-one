import { resolveCountryCode } from "./countryUtils.js";

const normalizeQuery = (query) =>
  query
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extractAges = (normalizedQuery, filters) => {
  const betweenMatch = normalizedQuery.match(/\bbetween\s+(\d{1,3})\s+and\s+(\d{1,3})\b/);
  if (betweenMatch) {
    const first = Number(betweenMatch[1]);
    const second = Number(betweenMatch[2]);
    filters.min_age = Math.min(first, second);
    filters.max_age = Math.max(first, second);
  }

  const minAgeMatch = normalizedQuery.match(
    /\b(?:above|over|older than|greater than|at least)\s+(\d{1,3})\b/
  );
  if (minAgeMatch) {
    filters.min_age = Number(minAgeMatch[1]);
  }

  const maxAgeMatch = normalizedQuery.match(
    /\b(?:below|under|younger than|less than|at most)\s+(\d{1,3})\b/
  );
  if (maxAgeMatch) {
    filters.max_age = Number(maxAgeMatch[1]);
  }
};

export const parseNaturalLanguageQuery = (query) => {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return null;
  }

  const filters = {};

  // gender: if both male and female are present, skip gender filter.
  const hasMale = /\b(male|males|man|men|boy|boys)\b/.test(normalizedQuery);
  const hasFemale = /\b(female|females|woman|women|girl|girls)\b/.test(normalizedQuery);
  if (hasMale && !hasFemale) {
    filters.gender = "male";
  } else if (hasFemale && !hasMale) {
    filters.gender = "female";
  }

  if (/\byoung\b/.test(normalizedQuery)) {
    filters.min_age = 16;
    filters.max_age = 24;
  }

  const ageGroupMap = [
    { pattern: /\b(child|children|kid|kids)\b/, value: "child" },
    { pattern: /\b(teenager|teenagers|teen|teens)\b/, value: "teenager" },
    { pattern: /\b(adult|adults)\b/, value: "adult" },
    { pattern: /\b(senior|seniors|elderly|old people)\b/, value: "senior" },
  ];

  for (const mapping of ageGroupMap) {
    if (mapping.pattern.test(normalizedQuery)) {
      filters.age_group = mapping.value;
      break;
    }
  }

  extractAges(normalizedQuery, filters);

  const countryMatch = normalizedQuery.match(/\bfrom\s+([a-z\s]{2,50})$/);
  if (countryMatch) {
    const countryCode = resolveCountryCode(countryMatch[1]);
    if (countryCode) {
      filters.country_id = countryCode;
    } else {
      return null;
    }
  }

  if (
    filters.min_age !== undefined &&
    filters.max_age !== undefined &&
    filters.min_age > filters.max_age
  ) {
    return null;
  }

  if (Object.keys(filters).length === 0) {
    return null;
  }

  return filters;
};
