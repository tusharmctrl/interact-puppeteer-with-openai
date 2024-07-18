import lighthouse, { desktopConfig } from "lighthouse";
import * as chromeLauncher from "chrome-launcher";

const generateLHJson = (runnerResult) => {
  try {
    const extractAuditDetails = (audit) => ({
      title: audit.title,
      score: audit.score,
    });
    const audits = runnerResult.lhr.audits;
    const importantDetails = {
      finalDisplayedUrl: runnerResult.lhr.finalDisplayedUrl,
      performanceScore: runnerResult.lhr.categories.performance.score * 100,
      accessibilityScore: runnerResult.lhr.categories.accessibility.score * 100,
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
        timeToInteractive: runnerResult.lhr.audits["interactive"].displayValue,
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
  } catch (error) {}
};

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless"] });
const options = {
  logLevel: "error",
  output: "json",
  port: chrome.port,
};
const url = "https://medicalocean.mctrl.app";
const desktopReport = await lighthouse(url, options, desktopConfig);
const mobileReport = await lighthouse(url, options);
const mobile = generateLHJson(mobileReport);
const desktop = generateLHJson(desktopReport);
console.log({ mobile, desktop });
console.log("Report is done for", url);
chrome.kill();

// Send importantDetails to the front end as needed

// const reportJSON = JSON.parse(desktopReport.report);
// fs.writeFileSync("lhreport.json", JSON.stringify(reportJSON, null, 2));
// fs.writeFileSync(
//   "imp-lhreport.json",
//   JSON.stringify(importantDetails, null, 2)
// );
