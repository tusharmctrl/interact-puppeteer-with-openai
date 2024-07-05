import puppeteer from "puppeteer";
import {
  REGISTER_HEURISTIC_PROMPT,
  functionDefinitions,
} from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { sleep, generalResponse } from "../utils/helpers.js";
import {
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
    const { browser, page } = await start_browser();
    // const browser = await puppeteer.launch({ headless: false });
    // const page = await browser.newPage();
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
    await sleep(20000);
    await page.screenshot({
      fullPage: true,
      path: `images/stake/home.png`,
    });
    const links_and_inputs = await get_tabbable_elements(page);
    const pageContent = await get_page_content(page);
    console.log("Page Content Extracted");
    const message = [
      { role: "assistant", type: "text", content: pageContent },
      {
        role: "assistant",
        type: "text",
        content: `Find a way to"register or join" into the system and click on the element`,
      },
    ];
    const screenshots = [];
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
      const beforeTypingSS = await grabAScreenshot(
        page,
        "images/stake/before-typing-data.png"
      );
      /**
       * Here we're submitting the form without filling up any values -- so it can generate errors and we can test
       * our heuristics related to errors.
       */
      await page.keyboard.press("Enter");
      const errorImage = await grabAScreenshot(page, "images/stake/error.png");
      screenshots.push(
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${beforeTypingSS}`,
          },
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${errorImage}`,
          },
        }
      );

      /**
       * Here - we'll write our code for typing values in to the form.
       */
      const responseOfFillingForm = await fillForm(page);
      console.log(responseOfFillingForm);
      if (responseOfFillingForm.success) {
        const fillingFormSS = await grabAScreenshot(
          page,
          "images/stake/after-filling.png"
        );
        screenshots.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${fillingFormSS}`,
          },
        });
        await page.keyboard.press("Enter");
        const submitSS = await grabAScreenshot(
          page,
          "images/stake/after-submit.png"
        );
        screenshots.push({
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${submitSS}`,
          },
        });
      }
      console.log("📌 Making an API call for heuristics...");
      const heuristicResponse = await fetchOpenAIResponse({
        messages: [
          {
            role: "user",
            content: JSON.stringify(screenshots),
          },
          {
            role: "assistant",
            content: REGISTER_HEURISTIC_PROMPT,
          },
        ],
        json_response: true,
      });
      const heuristicResponses = JSON.parse(
        heuristicResponse.choices[0].message.content
      );
      fs.writeFileSync(
        `Register_Journey - ${new Date().getTime()}.json`,
        JSON.stringify(heuristicResponses, null, 2)
      );
      console.log("📌 Register Journey Finished...");
      return generalResponse(
        res,
        { evaluationResult: heuristicResponses },
        "Successfully Completed Register Journey",
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
  }
};
