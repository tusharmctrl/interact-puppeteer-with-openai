import fs from "fs";
import { LOGIN_HEURISTIC_PROMPT } from "../constants/prompts.js";
import { clickOnButton } from "../services/login.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { sleep, generalResponse } from "../utils/helpers.js";
import {
  convertToDesktop,
  convertToMobile,
  fillLoginForm,
  grabAScreenshot,
  start_browser,
  wait_for_navigation,
} from "../utils/puppeteer.js";
export const loginJourney = async (req, res) => {
  const { browser, page } = await start_browser();
  try {
    const url = req.query.url;
    const { hostname } = new URL(url);
    fs.mkdir(`${hostname}/login`, { recursive: true }, (err) => {
      console.log(err);
    });
    await convertToDesktop(page);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    await sleep(15000);
    const desktopScreenshots = [];
    const mobileScreenshots = [];
    const homePageScreenshot = await grabAScreenshot(
      page,
      `${hostname}/login/home.png`
    );
    await convertToMobile(page);
    const homePageScreenshotMobile = await grabAScreenshot(
      page,
      `${hostname}/login/mobile-home.png`
    );
    await convertToDesktop(page);
    await clickOnButton(page, "login");
    await wait_for_navigation(page);
    const currentUrl = await page.url();
    console.log("📌 Link clicked! You are now on " + currentUrl);
    await sleep(2000);
    const loginFormScreenshot = await grabAScreenshot(
      page,
      `${hostname}/login/login-form.png`
    );
    await convertToMobile(page);
    const loginFormScreenshotMobile = await grabAScreenshot(
      page,
      `${hostname}/login/mobile-login-form.png`
    );
    await convertToDesktop(page);
    console.log("Filling up login form now");
    await fillLoginForm(page);
    const fillingUpLoginFormScreenshot = await grabAScreenshot(
      page,
      `${hostname}/login/filling-login-form.png`
    );
    await convertToMobile(page);
    const fillingUpLoginFormScreenshotMobile = await grabAScreenshot(
      page,
      `${hostname}/login/mobile-filling-login-form.png`
    );
    await page.keyboard.press("Enter");
    await sleep(5000);
    await convertToDesktop(page);
    const afterSubmitScreenshot = await grabAScreenshot(
      page,
      `${hostname}/login/submit-login-form.png`
    );
    await convertToMobile(page);
    const afterSubmitScreenshotMobile = await grabAScreenshot(
      page,
      `${hostname}/login/submit-login-form-mobile.png`
    );
    desktopScreenshots.push(
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${homePageScreenshot}`,
        },
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${loginFormScreenshot}`,
        },
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${fillingUpLoginFormScreenshot}`,
        },
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${afterSubmitScreenshot}`,
        },
      }
    );
    mobileScreenshots.push(
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${homePageScreenshotMobile}`,
        },
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${loginFormScreenshotMobile}`,
        },
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${fillingUpLoginFormScreenshotMobile}`,
        },
      },
      {
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${afterSubmitScreenshotMobile}`,
        },
      }
    );
    const heuristicResponseDesktop = await fetchOpenAIResponse({
      messages: [
        {
          role: "user",
          content: JSON.stringify(desktopScreenshots),
        },
        {
          role: "assistant",
          content: LOGIN_HEURISTIC_PROMPT("desktop"),
        },
      ],
      json_response: true,
      temperature: 0,
    });
    const heuristicResponseMobile = await fetchOpenAIResponse({
      messages: [
        {
          role: "user",
          content: JSON.stringify(mobileScreenshots),
        },
        {
          role: "assistant",
          content: LOGIN_HEURISTIC_PROMPT("mobile"),
        },
      ],
      json_response: true,
      temperature: 0,
    });
    const heuristicResponsesDesktop = JSON.parse(
      heuristicResponseDesktop.choices[0].message.content
    );
    const heuristicResponsesMobile = JSON.parse(
      heuristicResponseMobile.choices[0].message.content
    );
    fs.writeFileSync(
      `Login - ${new Date().getTime()}.json`,
      JSON.stringify(
        {
          desktop: heuristicResponsesDesktop,
          mobile: heuristicResponsesMobile,
        },
        null,
        2
      )
    );
    return generalResponse(
      res,
      {
        evaluationResult: {
          desktop: heuristicResponsesDesktop,
          mobile: heuristicResponsesMobile,
        },
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
      "Something went wrong while performing home page journey",
      "error",
      true,
      400
    );
  } finally {
    await browser.close();
  }
};
