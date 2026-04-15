import axios from "axios";
import { ApiError } from "../utils/apiError.js";

const fetchUserData = async (name) => {
  try {
    const genderRes = await axios.get(`https://api.genderize.io?name=${name}`);
    const ageRes = await axios.get(`https://api.agify.io?name=${name}`);
    const nationRes = await axios.get(`https://api.nationalize.io?name=${name}`);

    return { genderRes, ageRes, nationRes };
  } catch (error) {
    const url = error?.config?.url || "";
    if (url.includes("genderize")) {
      throw new ApiError(502, "Genderize returned an invalid response");
    }

    if (url.includes("agify")) {
      throw new ApiError(502, "Agify returned an invalid response");
    }

    if (url.includes("nationalize")) {
      throw new ApiError(502, "Nationalize returned an invalid response");
    }

    throw new ApiError(502, "External API returned an invalid response");
  }
};

export default fetchUserData;
