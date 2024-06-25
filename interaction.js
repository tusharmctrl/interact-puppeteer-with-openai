import dotenv from "dotenv";
import { input } from "./utils/helpers.js";
import { do_next_step, send_chat_message } from "./utils/openAi.js";
import { SYSTEM_PROMPT } from "./constants/prompts.js";
import { start_browser } from "./utils/puppeteer.js";
dotenv.config();

const main = async () => {
  const the_prompt = await input(
    "GPT: Hello! What would you like to browse today?\nYou: "
  );
  const context = [SYSTEM_PROMPT];
  const MESSAGE = `Task: ${the_prompt}.`;
  const userMessage = {
    role: "user",
    content: MESSAGE,
  };
  const response = await send_chat_message(userMessage, context);
  context.push(userMessage);
  context.push(response);
  const { page, browser } = await start_browser();
  await do_next_step(page, context, response, [], null);
  browser.close();
};

main();
