import puppeteer from "puppeteer";
import {
  REGISTER_HEURISTIC_PROMPT,
  functionDefinitions,
} from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { sleep, generalResponse } from "../utils/helpers.js";
import {
  convertToDesktop,
  convertToMobile,
  fillForm,
  get_page_content,
  get_tabbable_elements,
  grabAScreenshot,
  start_browser,
  wait_for_navigation,
} from "../utils/puppeteer.js";
import "dotenv/config";
import fs from "fs";

export const registerJourney = async (req, res) => {
  try {
    const url = req.query.url;
    const { hostname } = new URL(url);
    fs.mkdir(`${hostname}/register`, { recursive: true }, (err) => {
      console.log(err);
    });
    const { browser, page } = await start_browser();
    // const browser = await puppeteer.launch({ headless: false });
    // const page = await browser.newPage();
    await convertToDesktop(page);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    console.log(
      `Redirecting to ${url} Lets wait for 17 secs - just so all the content of the page loads..`
    );
    await sleep(17000);
    const homeScreenShot = await grabAScreenshot(
      page,
      `${hostname}/register/home.png`
    );
    await convertToMobile(page);
    const homeScreenShotMobile = await grabAScreenshot(
      page,
      `${hostname}/register/home-mobile.png`
    );
    await convertToDesktop(page);
    const links_and_inputs = await get_tabbable_elements(page);
    const pageContent = await get_page_content(page);
    console.log("Page Content Extracted");
    const message = [
      { role: "assistant", type: "text", content: pageContent },
      {
        role: "assistant",
        type: "text",
        content: `Find a way to "register or join" into the system and click on the element. The button might have text as "register" or "join"  You may find the button on header or sidebar most probabaly.`,
      },
    ];
    const screenshots = [];
    const mobileScreenshots = [];
    const openAiResponseForRegisterLink = await fetchOpenAIResponse({
      messages: message,
      definitions: functionDefinitions,
      function_call: "auto",
    });
    const functionCall =
      openAiResponseForRegisterLink.choices[0].message.function_call;
    const args = JSON.parse(functionCall.arguments);
    const link_id = args.pgpt_id;
    const link = links_and_inputs.find(
      (elem) => elem && elem.id == args.pgpt_id
    );
    try {
      /**
       * Once we receive the pgpt_id from GPT for the respected register button - we're making it click through puppeteer.
       * If somehow we're not able to find it - we're throwing a respected error for it. Once the form opens up, we are capturing
       * a screenshot without filling any values in it.
       */
      console.log(`📌 Clicking link "${link.text}"`);
      if (!page.$(".pgpt-element" + link_id)) {
        throw new Error("Element not found");
      }
      page.click(".pgpt-element" + link_id);
      await sleep(2000);
      await wait_for_navigation(page);
      const currentUrl = await page.url();
      console.log("📌 Link clicked! You are now on " + currentUrl);
      /**
       * Here we're submitting the form without filling up any values -- so it can generate errors and we can test
       * our heuristics related to errors.
       */
      /**
       * Here - we'll write our code for typing values in to the form.
       */
      const responseOfFillingForm = await fillForm(page, {
        origin: `${hostname}/register`,
      });
      if (responseOfFillingForm.success) {
        const beforefillingFormSSDesktop = await responseOfFillingForm.data
          .before.beforeFillingUpScreenshot;
        const afterfillingFormSSDesktop =
          responseOfFillingForm.data.after.afterFillingUpScreenshot;

        const beforefillingFormSSMobile = await responseOfFillingForm.data
          .before.beforeFillingUpScreenshotMobile;
        const afterfillingFormSSMobile = await responseOfFillingForm.data.after
          .afterFillingUpScreenshotMobile;

        await convertToDesktop(page);
        console.log("📌 Making an API call for heuristics...");
        screenshots.push(
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64, ${homeScreenShot}`,
            },
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64, ${beforefillingFormSSDesktop}`,
            },
          },

          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64, ${afterfillingFormSSDesktop}`,
            },
          }
        );
        mobileScreenshots.push(
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64, ${homeScreenShotMobile}`,
            },
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64, ${beforefillingFormSSMobile}`,
            },
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64, ${afterfillingFormSSMobile}`,
            },
          }
        );
        const registerDesktopResponse = await fetchOpenAIResponse({
          messages: [
            {
              role: "user",
              content: JSON.stringify(screenshots),
            },
            {
              role: "assistant",
              content: REGISTER_HEURISTIC_PROMPT("desktop"),
            },
          ],
          json_response: true,
          temperature: 0,
        });
        const registerMobileResponse = await fetchOpenAIResponse({
          messages: [
            {
              role: "user",
              content: JSON.stringify(mobileScreenshots),
            },
            {
              role: "assistant",
              content: REGISTER_HEURISTIC_PROMPT("mobile"),
            },
          ],
          json_response: true,
          temperature: 0,
        });
        const registerResponsesDesktop = JSON.parse(
          registerDesktopResponse.choices[0].message.content
        );
        const registerResponsesMobile = JSON.parse(
          registerMobileResponse.choices[0].message.content
        );
        fs.writeFileSync(
          `Register_Journey - ${new Date().getTime()}.json`,
          JSON.stringify(
            {
              desktop: registerResponsesDesktop,
              mobile: registerResponsesMobile,
            },
            null,
            2
          )
        );
        console.log("📌 Register Journey Finished...");
        return generalResponse(
          res,
          {
            evaluationResult: {
              desktop: registerResponsesDesktop,
              mobile: registerResponsesMobile,
            },
          },
          "Successfully Completed Register Journey",
          "success",
          true,
          200
        );
      } else {
        return generalResponse(
          res,
          null,
          "Could not fill up form.",
          "error",
          true,
          400
        );
      }
    } catch (error) {
      console.log(error);
      return generalResponse(
        res,
        null,
        "Something went wrong while performing register page journey",
        "error",
        true,
        400
      );
    } finally {
      // await browser.close();
    }
  } catch (error) {
    console.log(error);
    return generalResponse(
      res,
      null,
      "Something went wrong while performing register page journey",
      "error",
      true,
      400
    );
  }
};
