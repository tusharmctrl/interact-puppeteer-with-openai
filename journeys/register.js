import { functionDefinitions } from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { sleep } from "../utils/helpers.js";
import {
  get_page_content,
  get_tabbable_elements,
  start_browser,
  wait_for_navigation,
} from "../utils/puppeteer.js";
import dotenv from "dotenv";
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
        content: `For the given html content - find a way how we can register into the platform and click on it. Remeber to return pgpt_id and pgpt_text both.`,
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
    console.log(functionCall);
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

      const messageForFillUps = `I am providing you an array of field names. You need to generate an object with keys as field names and values as dummy data based on the field names. If a field name is empty, ignore and remove it.
        Strictly answer as an  json object where object will have field name will be key while value will be dummy data. Do not add any unnecessary information, and we would like you to add genuine data - it should not contain words like dummy, test
        Field names:
        ${formFields}
        `;

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
    } catch (error) {
      console.log(error);
    }
  } catch (error) {
    console.log(error);
  }
};

registerJourney("https://stake.com");
