import { ApiError } from "./apiError.js";

export const validateName = (name) => {
  if (name === undefined || name === null || name === "") {
    throw new ApiError(400, "Name is required");
  }

  if (typeof name !== "string") {
    throw new ApiError(422, "Name must be a string");
  }

  const trimmedName = name.trim();
  if (trimmedName === "") {
    throw new ApiError(400, "Name is required");
  }

  return trimmedName.toLowerCase();
};