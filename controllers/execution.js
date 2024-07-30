import { executeGraphQL } from "../services/hasura.js";
import { generalResponse } from "../utils/helpers.js";
import { trustPilotPerception } from "../controllers/perception.js";
import {
  ASSESSMENT_INSERTION,
  INSERT_ACCESSIBILITY,
  INSERT_JOURNEY,
  INSERT_PERFORMANCE,
  INSERT_PERFORMANCE_AND_ACCESSIBILITY,
  UPDATE_STATUS,
} from "../constants/queries.js";
import { performance } from "./performance.js";
export const executeWorkflow = async (req, res) => {
  try {
    const url = req.query.url;
    const assessment = {
      website_url: url,
      assessments: {
        data: {
          started_at: new Date().toISOString(),
          status: "IN_PROGRESS",
        },
      },
    };
    const assessmentData = await executeGraphQL(ASSESSMENT_INSERTION, { object: assessment });
    const assessmentId = assessmentData.data.insert_qx_url_one.assessments[0].id;
    console.log("Assessment Finished");
    const perceptionJourneys = await trustPilotPerception(url, assessmentId);
    const perceptionJourneyResponse = await executeGraphQL(INSERT_JOURNEY, { objects: perceptionJourneys });
    const { mobile, desktop } = await performance(url, assessmentId);
    const insertPerformance = await executeGraphQL(INSERT_PERFORMANCE_AND_ACCESSIBILITY, {
      performanceObjects: [mobile.performance, desktop.performance],
      accessibilityObjects: [...mobile.accessibility, ...desktop.accessibility],
    });
    const updateStatusResponse = await executeGraphQL(UPDATE_STATUS, { status: "COMPLETED", endTime: new Date().toISOString() });
  } catch (error) {
    console.log(error);
    return generalResponse(res, null, "Something went wrong while executing the workflow.", "error", true, 400);
  }
};
