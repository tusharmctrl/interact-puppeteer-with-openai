import { generalResponse } from "../utils/helpers.js";
import lighthouse, { desktopConfig } from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import fs from "fs";
export const performance = async (url, assessmentId) => {
  try {
    const generateLHJson = (runnerResult, device) => {
      const extractAuditDetails = (audit) => ({
        assessment_id: assessmentId,
        title: audit.title,
        score: audit.score,
        device: device,
        type: audit.score === 1 ? "PASSED" : audit.score < 1 ? "FAILED" : audit.scoreDisplayMode === "informative" ? "INFORMATIVE" : "",
      });
      const performanceMetrics = runnerResult.lhr.audits;
      const importantDetails = {
        score: {
          performance_score: (runnerResult.lhr.categories.performance.score * 100).toFixed(2),
          accessibility_score: (runnerResult.lhr.categories.accessibility.score * 100).toFixed(2),
        },
        performance: {
          assessment_id: assessmentId,
          device: device,
          best_practice_score: (runnerResult.lhr.categories["best-practices"].score * 100).toFixed(2),
          seo_score: (runnerResult.lhr.categories.seo.score * 100).toFixed(2),
          pwa_score: runnerResult.lhr.categories.pwa ? (runnerResult.lhr.categories.pwa.score * 100).toFixed(2) : null,
          web_vitals: {
            first_contentful_paint: performanceMetrics["first-contentful-paint"].displayValue,
            largest_contentful_paint: performanceMetrics["largest-contentful-paint"].displayValue,
            cumulative_layout_shift: performanceMetrics["cumulative-layout-shift"].displayValue,
            total_blocking_time: performanceMetrics["total-blocking-time"].displayValue,
            speed_index: performanceMetrics["speed-index"].displayValue,
            time_to_interactive: performanceMetrics["interactive"].displayValue,
            first_meaningful_paint: performanceMetrics["first-meaningful-paint"].displayValue,
          },
          browser_timings: {
            redirect_duration: (performanceMetrics["server-response-time"].numericValue / 1000).toFixed(2) + " s",
            connection_duration:
              (
                performanceMetrics["network-requests"].details.items.reduce((acc, item) => acc + (item.networkEndTime - item.networkRequestTime), 0) / 1000
              ).toFixed(2) + " s",
            backend_duration: (performanceMetrics["network-server-latency"].numericValue / 1000).toFixed(2) + " s",
          },
        },
        accessibility: Object.keys(performanceMetrics).map((key) => {
          return extractAuditDetails(performanceMetrics[key]);
        }),
      };
      return importantDetails;
    };
    const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
    const options = {
      logLevel: "error",
      output: "json",
      port: chrome.port,
    };
    const desktopReport = await lighthouse(url, options, desktopConfig);
    const mobileReport = await lighthouse(url, options);
    const reportHtml = desktopReport.report;
    fs.writeFileSync("lhreport.json", reportHtml);
    const mobile = generateLHJson(mobileReport, "MOBILE");
    const desktop = generateLHJson(desktopReport, "DESKTOP");
    console.log("Report done for", url);
    chrome.kill();
    return { mobile, desktop };
  } catch (error) {
    console.log(error);
    return;
  }
};
