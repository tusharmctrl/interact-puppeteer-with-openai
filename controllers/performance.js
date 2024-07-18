import { generalResponse } from "../utils/helpers.js";
import lighthouse, { desktopConfig } from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

export const performance = async (req, res) => {
  try {
    const generateLHJson = (runnerResult) => {
      const extractAuditDetails = (audit) => ({
        title: audit.title,
        score: audit.score,
      });
      const audits = runnerResult.lhr.audits;
      const importantDetails = {
        finalDisplayedUrl: runnerResult.lhr.finalDisplayedUrl,
        performanceScore: runnerResult.lhr.categories.performance.score * 100,
        accessibilityScore:
          runnerResult.lhr.categories.accessibility.score * 100,
        bestPracticesScore:
          runnerResult.lhr.categories["best-practices"].score * 100,
        seoScore: runnerResult.lhr.categories.seo.score * 100,
        pwaScore: runnerResult.lhr.categories.pwa
          ? runnerResult.lhr.categories.pwa.score * 100
          : null,
        metrics: {
          firstContentfulPaint:
            runnerResult.lhr.audits["first-contentful-paint"].displayValue,
          largestContentfulPaint:
            runnerResult.lhr.audits["largest-contentful-paint"].displayValue,
          cumulativeLayoutShift:
            runnerResult.lhr.audits["cumulative-layout-shift"].displayValue,
          totalBlockingTime:
            runnerResult.lhr.audits["total-blocking-time"].displayValue,
          speedIndex: runnerResult.lhr.audits["speed-index"].displayValue,
          timeToInteractive:
            runnerResult.lhr.audits["interactive"].displayValue,
          firstMeaningfulPaint:
            runnerResult.lhr.audits["first-meaningful-paint"].displayValue,
        },
        audits: {
          passed: Object.keys(audits)
            .filter((key) => audits[key].score === 1)
            .map((key) => extractAuditDetails(audits[key])),
          failed: Object.keys(audits)
            .filter((key) => audits[key].score < 1)
            .map((key) => extractAuditDetails(audits[key])),
          informative: Object.keys(audits)
            .filter((key) => audits[key].scoreDisplayMode === "informative")
            .map((key) => extractAuditDetails(audits[key])),
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
