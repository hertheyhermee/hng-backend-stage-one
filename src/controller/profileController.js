import Profile from "../models/Profile.js";
import { v7 as uuidv7 } from "uuid";
import fetchUserData from "../services/fetchUserData.js";
import { ApiError } from "../utils/apiError.js";
import { validateName } from "../utils/validateInput.js";

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
      sample_size: genderRes.data.count,
      age,
      age_group: getAgeGroup(age),
      country_id: topCountry.country_id,
      country_probability: topCountry.probability,
      created_at: new Date().toISOString(),
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
    const filters = {};

    if (req.query.gender) {
      filters.gender = req.query.gender.toLowerCase();
    }

    if (req.query.age_group) {
      filters.age_group = req.query.age_group.toLowerCase();
    }

    if (req.query.country_id) {
      filters.country_id = req.query.country_id.toUpperCase();
    }

    const profiles = await Profile.find(filters)
      .select("id name gender age age_group country_id -_id")
      .lean();

    return res.status(200).json({
      status: "success",
      count: profiles.length,
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