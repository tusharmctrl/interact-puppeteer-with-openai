import {
  REGISTER_HEURISTIC_PROMPT,
  functionDefinitions,
} from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { getFormFields, sleep, generalResponse } from "../utils/helpers.js";
import {
  fillForm,
  get_page_content,
  get_tabbable_elements,
  start_browser,
  typeTextInForm,
  wait_for_navigation,
} from "../utils/puppeteer.js";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

export const registerJourney = async (req, res) => {
  try {
    const url = req.query.url;
    const { browser, page } = await start_browser();
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
    console.log(link);
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
      await page.screenshot({
        fullPage: true,
        path: `images/stake/before-typing-data.png`,
      });
      const base64Image = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      /**
       * Here we're submitting the form without filling up any values -- so it can generate errors and we can test
       * our heuristics related to errors.
       */
      await page.keyboard.press("Enter");
      const errorImage = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      screenshots.push(
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${base64Image}`,
          },
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${errorImage}`,
          },
        }
      );
      await page.screenshot({
        fullPage: true,
        path: `images/stake/errors.png`,
      });

      /**
       * Here - we'll write our code for typing values in to the form.
       */

      const responseOfFillingForm = await fillForm(page);
      console.log(responseOfFillingForm);
      await page.keyboard.press("Enter");
      await page.screenshot({
        fullPage: true,
        path: `images/stake/after-submit.png`,
      });
      const afterSubmitForm = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      screenshots.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${afterSubmitForm}`,
        },
      });
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
        `heuristic_ans - ${new Date().getTime()}.json`,
        JSON.stringify(heuristicResponses, null, 2)
      );

      console.log("Register Journey Ended");
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
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.log(error);
  }
};
