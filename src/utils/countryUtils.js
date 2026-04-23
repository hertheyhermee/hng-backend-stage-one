import fs from "fs";
import path from "path";

const SEED_FILE_PATH = path.resolve(process.cwd(), "src/data/seed_profiles.json");

const countryNameToCodeMap = new Map();
const countryCodeToNameMap = new Map();

const loadCountriesFromSeed = () => {
  try {
    const rawContent = fs.readFileSync(SEED_FILE_PATH, "utf8");
    const parsed = JSON.parse(rawContent);
    const profiles = Array.isArray(parsed) ? parsed : parsed.profiles;

    if (!Array.isArray(profiles)) {
      return;
    }

    for (const profile of profiles) {
      const code = String(profile.country_id ?? "")
        .trim()
        .toUpperCase();
      const name = String(profile.country_name ?? "").trim();

      if (!/^[A-Z]{2}$/.test(code) || !name) {
        continue;
      }

      countryCodeToNameMap.set(code, name);
      countryNameToCodeMap.set(name.toLowerCase(), code);
    }
  } catch {
    // If seed file is unavailable, mappings remain empty and code-based queries still work.
  }
};

loadCountriesFromSeed();

export const resolveCountryCode = (value) => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.length === 2) {
    const code = normalized.toUpperCase();
    return /^[A-Z]{2}$/.test(code) ? code : null;
  }

  return countryNameToCodeMap.get(normalized) ?? null;
};

export const resolveCountryName = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) {
    return null;
  }

  return countryCodeToNameMap.get(countryCode.toUpperCase()) ?? null;
};
