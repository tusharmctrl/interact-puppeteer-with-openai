import { generalResponse } from "../utils/helpers.js";
import lighthouse, { desktopConfig } from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import fs from "fs";
export const performance = async (req, res) => {
  try {
    const generateLHJson = (runnerResult) => {
      const extractAuditDetails = (audit) => ({
        title: audit.title,
        score: audit.score,
      });
      const performanceMetrics = runnerResult.lhr.audits;
      const importantDetails = {
        finalDisplayedUrl: runnerResult.lhr.finalDisplayedUrl,
        performanceScore: (
          runnerResult.lhr.categories.performance.score * 100
        ).toFixed(2),
        accessibilityScore: (
          runnerResult.lhr.categories.accessibility.score * 100
        ).toFixed(2),
        bestPracticesScore: (
          runnerResult.lhr.categories["best-practices"].score * 100
        ).toFixed(2),
        seoScore: (runnerResult.lhr.categories.seo.score * 100).toFixed(2),
        pwaScore: runnerResult.lhr.categories.pwa
          ? (runnerResult.lhr.categories.pwa.score * 100).toFixed(2)
          : null,
        webVitals: {
          firstContentfulPaint:
            performanceMetrics["first-contentful-paint"].displayValue,
          largestContentfulPaint:
            performanceMetrics["largest-contentful-paint"].displayValue,
          cumulativeLayoutShift:
            performanceMetrics["cumulative-layout-shift"].displayValue,
          totalBlockingTime:
            performanceMetrics["total-blocking-time"].displayValue,
          speedIndex: performanceMetrics["speed-index"].displayValue,
          timeToInteractive: performanceMetrics["interactive"].displayValue,
          firstMeaningfulPaint:
            performanceMetrics["first-meaningful-paint"].displayValue,
        },
        browserTimings: {
          redirectDuration:
            (
              performanceMetrics["server-response-time"].numericValue / 1000
            ).toFixed(2) + " s",
          connectionDuration:
            (
              performanceMetrics["network-requests"].details.items.reduce(
                (acc, item) =>
                  acc + (item.networkEndTime - item.networkRequestTime),
                0
              ) / 1000
            ).toFixed(2) + " s",
          backendDuration:
            (
              performanceMetrics["network-server-latency"].numericValue / 1000
            ).toFixed(2) + " s",
        },
        accessibility: {
          passed: Object.keys(performanceMetrics)
            .filter((key) => performanceMetrics[key].score === 1)
            .map((key) => extractAuditDetails(performanceMetrics[key])),
          failed: Object.keys(performanceMetrics)
            .filter((key) => performanceMetrics[key].score < 1)
            .map((key) => extractAuditDetails(performanceMetrics[key])),
          informative: Object.keys(performanceMetrics)
            .filter(
              (key) =>
                performanceMetrics[key].scoreDisplayMode === "informative"
            )
            .map((key) => extractAuditDetails(performanceMetrics[key])),
        },
      };
      return importantDetails;
    };
    const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
    const options = {
      logLevel: "error",
      output: "json",
      port: chrome.port,
    };
    const url = req.query.url;
    const desktopReport = await lighthouse(url, options, desktopConfig);
    const mobileReport = await lighthouse(url, options);
    const reportHtml = desktopReport.report;
    fs.writeFileSync("lhreport.json", reportHtml);
    const mobile = generateLHJson(mobileReport);
    const desktop = generateLHJson(desktopReport);
    console.log("Report done for", url);
    chrome.kill();
    return generalResponse(
      res,
      {
        mobile,
        desktop,
      },
      "Successfully Completed Login Journey",
      "success",
      true,
      200
    );
  } catch (error) {
    console.log(error);
    return generalResponse(
      res,
      null,
      "Something went wrong while performing performances",
      "error",
      true,
      400
    );
  }
};
