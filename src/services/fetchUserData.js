import axios from "axios";
import { ApiError } from "../utils/apiError.js";

const fetchUserData = async (name) => {
  const client = axios.create({
    timeout: 5000,
  });

  try {
    const [genderRes, ageRes, nationRes] = await Promise.all([
      client
        .get(`https://api.genderize.io?name=${name}`)
        .catch((error) => {
          console.error("Genderize error:", error.message);
          throw new ApiError(502, "Genderize returned an invalid response");
        }),
      client
        .get(`https://api.agify.io?name=${name}`)
        .catch((error) => {
          console.error("Agify error:", error.message);
          throw new ApiError(502, "Agify returned an invalid response");
        }),
      client
        .get(`https://api.nationalize.io?name=${name}`)
        .catch((error) => {
          console.error("Nationalize error:", error.message);
          throw new ApiError(502, "Nationalize returned an invalid response");
        }),
    ]);

    return { genderRes, ageRes, nationRes };
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    throw new ApiError(502, "External API error");
  }
};

export default fetchUserData;
