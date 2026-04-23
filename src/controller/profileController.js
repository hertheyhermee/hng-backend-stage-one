import Profile from "../models/Profile.js";
import { v7 as uuidv7 } from "uuid";
import fetchUserData from "../services/fetchUserData.js";
import { ApiError } from "../utils/apiError.js";
import { validateName } from "../utils/validateInput.js";
import { parseNaturalLanguageQuery } from "../utils/naturalLanguageParser.js";
import { resolveCountryCode, resolveCountryName } from "../utils/countryUtils.js";

const getAgeGroup = (age) => {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
};

const getTopCountry = (countryList) => {
  if (!Array.isArray(countryList) || countryList.length === 0) {
    throw new ApiError(502, "Nationalize returned an invalid response");
  }

  return countryList.reduce((prev, curr) =>
    curr.probability > prev.probability ? curr : prev
  );
};

const buildNumericRangeFilter = (filters, field, minValue, maxValue) => {
  if (minValue !== undefined || maxValue !== undefined) {
    filters[field] = {};
    if (minValue !== undefined) {
      filters[field].$gte = minValue;
    }
    if (maxValue !== undefined) {
      filters[field].$lte = maxValue;
    }
  }
};

const parsePositiveInteger = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (!/^\d+$/.test(String(value))) {
    throw new ApiError(422, "Invalid query parameters");
  }

  return Number(value);
};

const parseProbability = (value) => {
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new ApiError(422, "Invalid query parameters");
  }

  return parsed;
};

const parsePagination = (query) => {
  const page = parsePositiveInteger(query.page) ?? 1;
  const requestedLimit = parsePositiveInteger(query.limit) ?? 10;
  const limit = Math.min(requestedLimit, 50);

  if (page < 1 || requestedLimit < 1) {
    throw new ApiError(422, "Invalid query parameters");
  }

  return { page, limit };
};

const parseSort = (query) => {
  const sortBy = query.sort_by ?? "created_at";
  const order = (query.order ?? "desc").toLowerCase();

  const allowedSortFields = new Set(["age", "created_at", "gender_probability"]);
  const allowedOrders = new Set(["asc", "desc"]);

  if (!allowedSortFields.has(sortBy) || !allowedOrders.has(order)) {
    throw new ApiError(422, "Invalid query parameters");
  }

  return {
    [sortBy]: order === "asc" ? 1 : -1,
  };
};

const validateKnownQueryParams = (query, allowedParams) => {
  const unknownParams = Object.keys(query).filter((key) => !allowedParams.has(key));
  if (unknownParams.length > 0) {
    throw new ApiError(422, "Invalid query parameters");
  }
};

const buildProfileFiltersFromQuery = (query) => {
  const filters = {};

  if (query.gender !== undefined) {
    const normalizedGender = String(query.gender).toLowerCase();
    if (!["male", "female"].includes(normalizedGender)) {
      throw new ApiError(422, "Invalid query parameters");
    }
    filters.gender = normalizedGender;
  }

  if (query.age_group !== undefined) {
    const normalizedAgeGroup = String(query.age_group).toLowerCase();
    if (!["child", "teenager", "adult", "senior"].includes(normalizedAgeGroup)) {
      throw new ApiError(422, "Invalid query parameters");
    }
    filters.age_group = normalizedAgeGroup;
  }

  if (query.country_id !== undefined) {
    const countryCode = resolveCountryCode(String(query.country_id));
    if (!countryCode) {
      throw new ApiError(422, "Invalid query parameters");
    }
    filters.country_id = countryCode;
  }

  const minAge = parsePositiveInteger(query.min_age);
  const maxAge = parsePositiveInteger(query.max_age);
  if (minAge !== undefined || maxAge !== undefined) {
    if ((minAge !== undefined && minAge > 130) || (maxAge !== undefined && maxAge > 130)) {
      throw new ApiError(422, "Invalid query parameters");
    }
    if (minAge !== undefined && maxAge !== undefined && minAge > maxAge) {
      throw new ApiError(422, "Invalid query parameters");
    }
  }

  const minGenderProbability = parseProbability(query.min_gender_probability);
  const minCountryProbability = parseProbability(query.min_country_probability);

  buildNumericRangeFilter(filters, "age", minAge, maxAge);
  buildNumericRangeFilter(filters, "gender_probability", minGenderProbability, undefined);
  buildNumericRangeFilter(filters, "country_probability", minCountryProbability, undefined);

  return filters;
};

export const createProfile = async (req, res, next) => {
  try {
    const normalizedName = validateName(req.body.name);

    const existingProfile = await Profile.findOne({ name: normalizedName });
    if (existingProfile) {
      return res.status(201).json({
        status: "success",
        message: "Profile already exists",
        data: existingProfile,
      });
    }

    const { genderRes, ageRes, nationRes } = await fetchUserData(normalizedName);

    if (!genderRes?.data?.gender || genderRes.data.count === 0) {
      throw new ApiError(502, "Genderize returned an invalid response");
    }

    const age = ageRes?.data?.age;
    if (age === null || age === undefined) {
      throw new ApiError(502, "Agify returned an invalid response");
    }

    const topCountry = getTopCountry(nationRes?.data?.country);
    if (!topCountry?.country_id || topCountry.probability === undefined) {
      throw new ApiError(502, "Nationalize returned an invalid response");
    }

    const profile = await Profile.create({
      id: uuidv7(),
      name: normalizedName,
      gender: genderRes.data.gender,
      gender_probability: genderRes.data.probability,
      age,
      age_group: getAgeGroup(age),
      country_id: topCountry.country_id,
      country_name: resolveCountryName(topCountry.country_id) ?? topCountry.country_id,
      country_probability: topCountry.probability,
      created_at: new Date(),
    });

    return res.status(201).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    if (error.isOperational) {
      return next(error);
    }
    next(new ApiError(500, "Internal server error"));
  }
};

export const getProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await Profile.findOne({ id });
    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }

    return res.status(200).json({
      status: "success",
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const getProfiles = async (req, res, next) => {
  try {
    const allowedParams = new Set([
      "gender",
      "age_group",
      "country_id",
      "min_age",
      "max_age",
      "min_gender_probability",
      "min_country_probability",
      "sort_by",
      "order",
      "page",
      "limit",
    ]);
    validateKnownQueryParams(req.query, allowedParams);

    const filters = buildProfileFiltersFromQuery(req.query);
    const sort = parseSort(req.query);
    const { page, limit } = parsePagination(req.query);
    const skip = (page - 1) * limit;

    const [total, profiles] = await Promise.all([
      Profile.countDocuments(filters),
      Profile.find(filters)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select("-_id")
        .lean(),
    ]);

    return res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      data: profiles,
    });
  } catch (error) {
    next(error);
  }
};

export const searchProfiles = async (req, res, next) => {
  try {
    const allowedParams = new Set(["q", "page", "limit"]);
    validateKnownQueryParams(req.query, allowedParams);

    if (req.query.q === undefined || String(req.query.q).trim() === "") {
      throw new ApiError(400, "Missing or empty parameter");
    }

    const parsedFilters = parseNaturalLanguageQuery(String(req.query.q));
    if (!parsedFilters) {
      throw new ApiError(400, "Unable to interpret query");
    }

    const filters = {};
    if (parsedFilters.gender) {
      filters.gender = parsedFilters.gender;
    }
    if (parsedFilters.age_group) {
      filters.age_group = parsedFilters.age_group;
    }
    if (parsedFilters.country_id) {
      filters.country_id = parsedFilters.country_id;
    }
    buildNumericRangeFilter(filters, "age", parsedFilters.min_age, parsedFilters.max_age);

    const { page, limit } = parsePagination(req.query);
    const skip = (page - 1) * limit;

    const [total, profiles] = await Promise.all([
      Profile.countDocuments(filters),
      Profile.find(filters)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .select("-_id")
        .lean(),
    ]);

    return res.status(200).json({
      status: "success",
      page,
      limit,
      total,
      data: profiles,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    const profile = await Profile.findOneAndDelete({ id });
    if (!profile) {
      throw new ApiError(404, "Profile not found");
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
};