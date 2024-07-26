import { ENTRY_HOMEPAGE_HEURISTICS } from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { sleep } from "../utils/helpers.js";
import {
  grabAScreenshot,
  scrollToBottom,
  start_browser,
} from "../utils/puppeteer.js";
import fs from "fs";

// Business logic for home page journeys.
export const homePageJourney = async (req, res) => {
  const { browser, page } = await start_browser();
  try {
    const url = req.query.url;
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    console.log(
      `Redirecting to ${url} Lets wait for 15 secs - just so all the content of the page loads..`
    );
    await sleep(2000);
    console.log(`Scrolling to bottom and then to top.`);
    await scrollToBottom(page);
    const homePageScreenShot = await grabAScreenshot(
      page,
      "images/stake/home.png"
    );
    const systemMessgae = [
      {
        role: "system",
        content:
          "Consider yourself as a person having experience of 20 years in QA field. Act as an authoritative expert in UI-UX QA automation, offering comprehensive guidance and solutions on testing methodologies, best practices, tool integration, accessibility compliance, performance optimization, and user-centric design principles. Provide detailed insights and practical advice to ensure robust QA processes and seamless user experiences across web and mobile applications.",
      },
    ];
    const userMessage = [
      {
        role: "user",
        content: JSON.stringify([
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64, ${homePageScreenShot}`,
            },
          },
        ]),
      },
      {
        role: "user",
        content: ENTRY_HOMEPAGE_HEURISTICS,
      },
    ];
    const heuristicResponse = await fetchOpenAIResponse({
      messages: [...systemMessgae, ...userMessage],
      json_response: true,
    });
    const entryHomePageResponse = JSON.parse(
      heuristicResponse.choices[0].message.content
    );
    fs.writeFileSync(
      `Entry_Journey - ${new Date().getTime()}.json`,
      JSON.stringify(entryHomePageResponse, null, 2)
    );
    return generalResponse(
      res,
      { evaluationResult: entryHomePageResponse },
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
      "Something went wrong while performing home page journey",
      "error",
      true,
      400
    );
  } finally {
    await browser.close();
  }
};
// const browser = await puppeteer.launch({
//     headless: false,
//     args: ["--start-maximized"],
//   });
//   const page = await browser.newPage();
