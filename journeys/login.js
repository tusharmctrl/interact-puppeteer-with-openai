import { functionDefinitions } from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { singleLineInput, sleep } from "../utils/helpers.js";
import dotenv from "dotenv";
import {
  get_page_content,
  get_tabbable_elements,
  start_browser,
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
        content: `Find a way to login into the system and click on the element. please make sure to give pgpt_id and pgpt_text`,
      },
    ];
    const screenshots = [];
    const openAiResponseForLogin = await fetchOpenAIResponse({
      messages: message,
      definitions: functionDefinitions,
      function_call: "auto",
    });
    console.log(openAiResponseForLogin.choices[0].message);
  } catch (error) {
    throw error;
  }
};

loginJourney("https://www.stake.com");
