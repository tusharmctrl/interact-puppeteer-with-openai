import { TimeoutError } from "puppeteer";
import { functionDefinitions } from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import {
  get_page_content,
  get_tabbable_elements,
  wait_for_navigation,
} from "./puppeteer.js";
import { input, sleep } from "./helpers.js";
const context_length_limit = 15000;
const wait_until = "domcontentloaded";
export async function send_chat_message(
  message,
  context,
  function_call = "auto",
  functions = null
) {
  try {
    const messages = [...context];
    messages.push(message);
    const definitions = [...functionDefinitions];

    if (functions !== null) {
      definitions = definitions.filter((definition) => {
        return in_array(definition.name, functions);
      });
    }
    console.log("Sending ChatGPT request...");
    const response = await fetchOpenAIResponse({
      messages,
      definitions,
      function_call,
    });

    const data = response;
    if (!data.choices) {
      console.log("GPT sent unexpected outcome!");
      return;
    }

    return data.choices[0].message;
  } catch (error) {
    console.log(console.log(error));
    throw new Error("Something went wrong with open-ai", JSON.stringify(error));
  }
}

export async function do_next_step(
  page,
  context,
  next_step,
  links_and_inputs,
  element
) {
  let message;
  let msg;
  let no_content = false;
  console.log(next_step);
  if (next_step.hasOwnProperty("function_call")) {
    let function_call = next_step.function_call;
    let function_name = function_call.name;
    let func_arguments;

    try {
      func_arguments = JSON.parse(function_call.arguments);
    } catch (e) {
      if (function_name === "answer_user") {
        func_arguments = {
          answer: function_call.arguments,
        };
      }
    }

    if (function_name === "make_plan") {
      message = "OK. Please continue according to the plan";
    } else if (function_name === "capture_screenshot") {
      await page.screenshot({
        fullPage: true,
        path: `images/${new Date().getTime()}.png`,
      });
      const base64Image = await page.screenshot({
        fullPage: true,
        encoding: "base64",
      });
      const imageData = [
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${base64Image}`,
          },
        },
      ];
      no_content = true;
      msg = {
        role: "user",
        content: JSON.stringify(imageData),
      };
      message = `Screenshot captured Successfully`;
    } else if (function_name === "goto_url") {
      let url = func_arguments.url;
      console.log("Going to " + url);
      try {
        await page.goto(url, {
          waitUntil: wait_until,
        });
        console.log(
          "Lets wait for 20 secs - just so all the content of the page loads.."
        );
        await sleep(20000);
        url = await page.url();
        message = `You are now on ${url}`;
      } catch (error) {
        message = "There was an error going to the URL";
      }
      console.log("Scraping page...");
      links_and_inputs = await get_tabbable_elements(page);
    } else if (function_name === "click_link") {
      let link_id = func_arguments.pgpt_id;
      let link_text = func_arguments.text;
      if (!link_id) {
        message = "ERROR: Missing parameter pgpt_id";
      } else if (!link_text) {
        message = "";
        context.pop();
        msg = {
          role: "user",
          content:
            "Please the correct link on the page. Remember to set both the text and the pgpt_id parameter.",
        };
      } else {
        const link = links_and_inputs.find(
          (elem) => elem && elem.id == link_id
        );
        console.log(link);
        try {
          console.log(`Clicking link "${link.text}"`);

          if (!page.$(".pgpt-element" + link_id)) {
            throw new Error("Element not found");
          }
          page.click(".pgpt-element" + link_id);
          await wait_for_navigation(page);
          let url = await page.url();
          message = "Link clicked! You are now on " + url;
        } catch (error) {
          console.log(error, "error occured");
          if (error instanceof TimeoutError) {
            message = "NOTICE: The click did not cause a navigation.";
          } else {
            let link_text = link ? link.text : "";
            message = `Sorry, but link number ${link_id} (${link_text}) is not clickable, please select another link or another command. You can also try to go to the link URL directly with "goto_url".`;
          }
        }
      }
      console.log("Scraping page...");
      links_and_inputs = await get_tabbable_elements(page);
    } else if (function_name === "fill_form") {
      const formFields = await page.$$eval(
        "form input, form select, form textarea",
        (elements) => elements.map((element) => element.name || element.id)
      );

      const messageForFillUps = `I am providing you an array of field names. You need to generate an object with keys as field names and values as dummy data based on the field names. If a field name is empty, ignore and remove it.
        Strictly answer as an  json object where object will have field name will be key while value will be dummy data. Do not add any unnecessary information, and we would like you to add genuine data - it should not contain words like dummy, test
        Field names:
        ${formFields}
        `;

      const response = await fetchOpenAIResponse({
        messages: [
          {
            role: "assistant",
            content: messageForFillUps,
          },
        ],
        json_response: true,
      });
      let validData = response.choices[0].message.content;
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
              console.log(inputType);
              if (inputType === "checkbox") {
                await element.evaluate((el) => el.click());
              } else {
                await element.type(value);
              }
            } else if (tagName === "textarea") {
              await element.type(value);
            }
          } else {
            console.error(
              `Element with field name or id '${field}' not found.`
            );
          }
        }
      }
      no_content = true;
      // msg = {
      //   role: "user",
      //   content: [
      //     {
      //       type: "text",
      //       text: `Here's the value that we filled in the form: ${JSON.stringify(
      //         validData
      //       )}`,
      //     },
      //   ],
      // };
    } else if (function_name === "answer_user") {
      let text = func_arguments.answer;
      text += ` ${func_arguments?.summary ?? ""}`;
      message = await input("\nGPT: " + text + "\nYou: ");
    } else {
      message = "That is an unknown function. Please call another one";
    }

    // message = message.substring(0, context_length_limit);
    msg = msg ?? {
      role: "function",
      name: function_name,
      content: JSON.stringify({
        status: "OK",
        message: message,
      }),
    };
  } else {
    let next_content = next_step.content.trim();
    if (next_content === "") {
      next_content = "<empty response>";
    }
    message = await input("GPT: " + next_content + "\nYou: ");
    msg = {
      role: "user",
      content: message,
    };
  }

  if (no_content !== true) {
    const page_content = await get_page_content(page);
    msg.content += "\n\n" + page_content.substring(0, context_length_limit);
  }

  msg.url = await page.url();

  next_step = await send_chat_message(msg, context);

  (msg.content = message), context.push(msg);
  context.push(next_step);

  await do_next_step(page, context, next_step, links_and_inputs, element);
}
