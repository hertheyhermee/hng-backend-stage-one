import axios from "axios";
import { ApiError } from "../utils/apiError.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, apiName, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, {
        timeout: 8000,
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
      });
      return response;
    } catch (error) {
      const statusCode = error?.response?.status;
      const isRateLimit = statusCode === 429;
      const isLastAttempt = attempt === retries;

      console.error(
        `${apiName} attempt ${attempt}/${retries}: ${error.message}`
      );

      if (isLastAttempt) {
        throw new ApiError(502, `${apiName} returned an invalid response`);
      }

      if (isRateLimit) {
        const waitTime = delay * Math.pow(2, attempt - 1);
        console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
        await sleep(waitTime);
      } else {
        await sleep(delay);
      }
    }
  }
};

const fetchUserData = async (name) => {
  try {
    const genderRes = await fetchWithRetry(
      `https://api.genderize.io?name=${name}`,
      "Genderize"
    );

    await sleep(500);

    const ageRes = await fetchWithRetry(
      `https://api.agify.io?name=${name}`,
      "Agify"
    );

    await sleep(500);

    const nationRes = await fetchWithRetry(
      `https://api.nationalize.io?name=${name}`,
      "Nationalize"
    );

    return { genderRes, ageRes, nationRes };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    throw new ApiError(502, "External API error");
  }
};

export default fetchUserData;
