import { Apiresponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const healthcheck = asyncHandler(async (req, res) =>{
    return res
        .status(200)
        .json(new Apiresponse(200, "OK","Health Check Passed"))
} )

export {healthcheck}