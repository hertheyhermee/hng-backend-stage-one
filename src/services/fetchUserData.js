import { ApiError } from "../utils/apiError.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithRetry = async (url, apiName, maxRetries = 5, initialDelay = 2000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${apiName}] Attempt ${attempt}/${maxRetries}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[${apiName}] Success on attempt ${attempt}`);
      return { data, status: response.status };
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === maxRetries;

      console.error(
        `[${apiName}] Attempt ${attempt} failed: ${error.message}`
      );

      if (isLastAttempt) {
        console.error(`[${apiName}] All ${maxRetries} retries failed`);
        throw new ApiError(502, `${apiName} returned an invalid response`);
      }

      // Exponential backoff with jitter
      const exponentialDelay = initialDelay * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 1000;
      const waitTime = exponentialDelay + jitter;
      
      console.log(`[${apiName}] Waiting ${Math.round(waitTime)}ms before retry...`);
      await sleep(waitTime);
    }
  }
};

const fetchUserData = async (name) => {
  try {
    console.log(`\n=== Fetching data for name: ${name} ===`);
    
    const genderRes = await fetchWithRetry(
      `https://api.genderize.io?name=${name}`,
      "Genderize",
      5,
      2000
    );

    await sleep(1000);

    const ageRes = await fetchWithRetry(
      `https://api.agify.io?name=${name}`,
      "Agify",
      5,
      2000
    );

    await sleep(1000);

    const nationRes = await fetchWithRetry(
      `https://api.nationalize.io?name=${name}`,
      "Nationalize",
      5,
      2000
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
