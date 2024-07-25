import { functionDefinitions } from "../constants/prompts.js";
import { get_page_content, get_tabbable_elements } from "../utils/puppeteer.js";
import { fetchOpenAIResponse } from "./openai.js";

export const clickOnButton = async (page, buttonName) => {
  const links_and_inputs = await get_tabbable_elements(page);
  const pageContent = await get_page_content(page);
  console.log("Page Content Extracted");
  const message = [
    { role: "assistant", type: "text", content: pageContent },
    {
      role: "assistant",
      type: "text",
      content: `Find a way to ${buttonName} into the system and click on the element. The button might have text as ${buttonName}, You may find the button on header or sidebar most probabaly. Please make sure to give pgpt_id and pgpt_text`,
    },
  ];
  const openAiResponseForLogin = await fetchOpenAIResponse({
    messages: message,
    definitions: functionDefinitions,
    function_call: "auto",
  });
  const functionCall = openAiResponseForLogin.choices[0].message.function_call;
  const args = JSON.parse(functionCall.arguments);
  const link_id = args.pgpt_id;
  const link = links_and_inputs.find((elem) => elem && elem.id == args.pgpt_id);
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
};
