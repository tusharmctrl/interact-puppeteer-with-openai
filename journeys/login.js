import {
  LOGIN_HEURISTIC_PROMPT,
  functionDefinitions,
} from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { singleLineInput, sleep } from "../utils/helpers.js";
import dotenv from "dotenv";
import fs from "fs";
import {
  get_page_content,
  get_tabbable_elements,
  start_browser,
  wait_for_navigation,
} from "../utils/puppeteer.js";
dotenv.config();

const loginJourney = async (url) => {
  try {
    const email = await singleLineInput("Provide Email / Username For Login: ");
    const password = await singleLineInput("Provide Password For Login: ");
    const { page } = await start_browser();
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    await sleep(30000);
    await page.screenshot({
      fullPage: true,
      path: `images/stake/home.png`,
    });
    const screenshots = [];
    const homePageScreenshot = await page.screenshot({
      fullPage: true,
      encoding: "base64",
    });
    const links_and_inputs = await get_tabbable_elements(page);
    const pageContent = await get_page_content(page);
    console.log("Page Content Extracted");
    const message = [
      { role: "assistant", type: "text", content: pageContent },
      {
        role: "assistant",
        type: "text",
        content: `Find a way to login into the system and click on the element. please make sure to give pgpt_id and pgpt_text`,
      },
    ];
    const openAiResponseForLogin = await fetchOpenAIResponse({
      messages: message,
      definitions: functionDefinitions,
      function_call: "auto",
    });
    const functionCall =
      openAiResponseForLogin.choices[0].message.function_call;
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
      await page.screenshot({
        fullPage: true,
        path: `images/stake/login-form.png`,
      });

      const loginFormScreenshot = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      const formFields = await page.$$eval("form input", (elements) =>
        elements.map((element) => element.name || element.id)
      );
      for (const field of formFields) {
        const element = await page.$(
          `input[name="${field}"], input[id="${field}"]`
        );
        if (element) {
          const tagName = await page.evaluate(
            (el) => el.tagName.toLowerCase(),
            element
          );
          if (tagName === "input") {
            if (field.toLowerCase().includes("email")) {
              await element.type(email);
            } else if (field.toLowerCase().includes("password")) {
              await element.type(password);
            }
          }
        } else {
          console.error(`Element with field name or id '${field}' not found.`);
        }
      }
      await page.screenshot({
        fullPage: true,
        path: `images/stake/filling-login-form.png`,
      });
      const fillingUpLoginFormScreenshot = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      await page.keyboard.press("Enter");
      await sleep(5000);
      await page.screenshot({
        fullPage: true,
        path: `images/stake/submit-login-form.png`,
      });
      const afterSubmitScreenshot = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      screenshots.push(
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
      const heuristicResponse = await fetchOpenAIResponse({
        messages: [
          {
            role: "user",
            content: JSON.stringify(screenshots),
          },
          {
            role: "assistant",
            content: LOGIN_HEURISTIC_PROMPT,
          },
        ],
        json_response: true,
      });
      const heuristicResponses = JSON.parse(
        heuristicResponse.choices[0].message.content
      );
      fs.writeFileSync(
        `login_heuristic_ans - ${new Date().getTime()}.json`,
        JSON.stringify(heuristicResponses, null, 2)
      );
    } catch (e) {
      console.log(e);
    }
  } catch (error) {
    throw error;
  }
};

loginJourney("https://www.stake.com");
