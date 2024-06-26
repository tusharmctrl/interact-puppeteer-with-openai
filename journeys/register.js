import {
  REGISTER_HEURISTIC_PROMPT,
  functionDefinitions,
} from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { sleep } from "../utils/helpers.js";
import {
  get_page_content,
  get_tabbable_elements,
  start_browser,
  wait_for_navigation,
} from "../utils/puppeteer.js";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

export const registerJourney = async (url) => {
  try {
    const { page } = await start_browser();
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    console.log(
      `Redirecting to ${url} Lets wait for 10 secs - just so all the content of the page loads..`
    );
    await sleep(10000);
    const links_and_inputs = await get_tabbable_elements(page);
    const pageContent = await get_page_content(page);
    console.log("Page Content Extracted");
    const message = [
      { role: "assistant", type: "text", content: pageContent },
      {
        role: "assistant",
        type: "text",
        content: `Find a way how we can register into the platform and click on the appropriated element.`,
      },
    ];
    const screenshots = [];
    const openAiResponseForRegisterLink = await fetchOpenAIResponse({
      messages: message,
      definitions: functionDefinitions,
      function_call: "auto",
    });
    console.log("API Call Executed for register!");
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
      console.log(`Clicking link "${link.text}"`);
      if (!page.$(".pgpt-element" + link_id)) {
        throw new Error("Element not found");
      }
      page.click(".pgpt-element" + link_id);
      await sleep(2000);
      await wait_for_navigation(page);
      const currentUrl = await page.url();
      console.log("Link clicked! You are now on " + currentUrl);
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
      await page.click('button[type="submit"]');
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
      const formFields = await page.$$eval(
        "form input, form select, form textarea",
        (elements) => elements.map((element) => element.name || element.id)
      );

      const messageForFillUps = `I am providing you with an array of field names. You need to generate a JSON object with keys as the field names and values as genuine dummy data based on the field names. If a field name is empty, ignore and remove it. Strictly answer as a JSON object where the field names are the keys and the values are realistic dummy data. The data should be appropriate for the field name (e.g., if the field name is "username / name" it should generate a realistic username / name and it should not contain any blank spaces to it and it should be of one word only). Do not add any unnecessary information, and ensure the dummy data does not contain words like "dummy" or "test."
      Form Fields: ${formFields}`;

      const forTypeResponse = await fetchOpenAIResponse({
        messages: [
          {
            role: "assistant",
            content: messageForFillUps,
          },
        ],
        json_response: true,
      });
      let validData = forTypeResponse.choices[0].message.content;
      validData = JSON.parse(validData);
      for (const field of formFields) {
        if (field && field.trim() !== "") {
          const value = validData[field];
          const element = await page.$(
            `input[name="${field}"], input[id="${field}"], select[name="${field}"], select[id="${field}"], textarea[name="${field}"], textarea[id="${field}"]`
          );
          if (element) {
            const tagName = await page.evaluate(
              (el) => el.tagName.toLowerCase(),
              element
            );
            if (tagName === "input") {
              const inputType = await page.evaluate((el) => el.type, element);
              if (inputType === "checkbox") {
                await element.evaluate((el) => el.click());
              } else {
                await element.type(value);
              }
            } else if (tagName === "textarea") {
              await element.type(value);
            } else if (tagName === "select") {
              const dropdownSelector = `select[name="${field}"]`;
              console.log(field);
              const options = await page.evaluate((dropdownSelector) => {
                const selectElement = document.querySelector(dropdownSelector);
                return Array.from(selectElement.options).map(
                  (option) => option.value
                );
              }, dropdownSelector);
              const filteredOptions = options.filter((option) => option !== "");
              const randomOption =
                filteredOptions[
                  Math.floor(Math.random() * filteredOptions.length)
                ];
              await page.select(dropdownSelector, randomOption);
            }
          } else {
            console.error(
              `Element with field name or id '${field}' not found.`
            );
          }
        }
      }
      await page.screenshot({
        fullPage: true,
        path: `images/stake/after-type.png`,
      });
      const afterTypeForm = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      screenshots.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64, ${afterTypeForm}`,
        },
      });
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
      console.log("Making an API call for heuristics....");
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
      console.log(heuristicResponses);
      console.log(heuristicResponse.choices[0]);
      fs.writeFileSync(
        `heuristic_ans - ${new Date().getTime()}.json`,
        JSON.stringify(heuristicResponses, null, 2)
      );
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
  }
};

registerJourney("https://www.stake.com");
