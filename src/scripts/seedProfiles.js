import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { v7 as uuidv7 } from "uuid";
import Profile from "../models/Profile.js";
import { resolveCountryCode, resolveCountryName } from "../utils/countryUtils.js";

dotenv.config();

const DATA_FILE = process.argv[2] ?? "src/data/seed_profiles.json";

const normalizeProfile = (rawProfile) => {
  const name = String(rawProfile.name ?? "").trim().toLowerCase();
  const gender = String(rawProfile.gender ?? "").trim().toLowerCase();
  const age = Number(rawProfile.age);
  const ageGroup = String(rawProfile.age_group ?? "").trim().toLowerCase();
  const countryNameFromRow = String(rawProfile.country_name ?? "").trim();
  const genderProbability = Number(
    rawProfile.gender_probability ?? rawProfile.genderProbability
  );
  const countryProbability = Number(
    rawProfile.country_probability ?? rawProfile.countryProbability
  );

  const sourceCountry =
    rawProfile.country_id ?? rawProfile.countryId ?? rawProfile.country_name ?? rawProfile.countryName;
  const countryCode = resolveCountryCode(String(sourceCountry ?? "").trim());
  if (!countryCode) {
    throw new Error(`Invalid country value for "${name}"`);
  }

  const countryName = countryNameFromRow || resolveCountryName(countryCode) || countryCode;

  if (!name || !["male", "female"].includes(gender) || Number.isNaN(age)) {
    throw new Error(`Invalid profile row: ${JSON.stringify(rawProfile)}`);
  }

  if (!["child", "teenager", "adult", "senior"].includes(ageGroup)) {
    throw new Error(`Invalid age_group row: ${JSON.stringify(rawProfile)}`);
  }

  if (!countryNameFromRow) {
    throw new Error(`Missing country_name row: ${JSON.stringify(rawProfile)}`);
  }

  if (Number.isNaN(genderProbability) || Number.isNaN(countryProbability)) {
    throw new Error(`Invalid probability row: ${JSON.stringify(rawProfile)}`);
  }

  return {
    id: uuidv7(),
    name,
    gender,
    gender_probability: genderProbability,
    age,
    age_group: ageGroup,
    country_id: countryCode,
    country_name: countryName,
    country_probability: countryProbability,
    created_at: rawProfile.created_at ? new Date(rawProfile.created_at) : new Date(),
  };
};

const run = async () => {
  try {
    if (!process.env.MONGO_CONN_STRING) {
      throw new Error("MONGO_CONN_STRING is missing");
    }

    await mongoose.connect(process.env.MONGO_CONN_STRING);

    const absoluteDataPath = path.resolve(DATA_FILE);
    const content = await fs.readFile(absoluteDataPath, "utf8");
    const parsedData = JSON.parse(content);
    const rows = Array.isArray(parsedData) ? parsedData : parsedData.profiles;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("Seed data must be a non-empty array");
    }

    const operations = rows.map((row) => {
      const normalized = normalizeProfile(row);
      const { id, ...updatableFields } = normalized;
      return {
        updateOne: {
          filter: { name: normalized.name },
          update: { $set: updatableFields, $setOnInsert: { id } },
          upsert: true,
        },
      };
    });

    const result = await Profile.bulkWrite(operations, { ordered: false });
    console.log(
      JSON.stringify(
        {
          status: "success",
          message: "Seeding completed",
          matched: result.matchedCount,
          modified: result.modifiedCount,
          upserted: result.upsertedCount,
          totalInput: rows.length,
        },
        null,
        2
      )
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
