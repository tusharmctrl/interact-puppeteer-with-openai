import { fetchOpenAIResponse } from "../services/openai.js";

import readline from "readline";
export async function input(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  console.log(promptText);
  const multilineInput = [];
  return new Promise((resolve) => {
    rl.on("line", (line) => {
      if (line === "") {
        rl.close();
      } else {
        multilineInput.push(line);
      }
    });
    rl.on("close", () => {
      resolve(multilineInput.join("\n"));
    });
  });
}

export const generalResponse = (
  response,
  data = [],
  message = '',
  response_type = 'success',
  toast = false,
  statusCode = 200,
) => {
  response.status(statusCode).send({
    data: data,
    message: message,
    toast: toast,
    response_type: response_type,
  });
};

export function in_array(element, array) {
  return array.includes(element);
}

export function redact_messages(messages) {
  let redacted_messages = [];
  let current_url = messages[messages.length - 1].url;

  messages.forEach((message) => {
    let msg = JSON.parse(JSON.stringify(message));

    if (msg.url != current_url) {
      //msg.content = msg.redacted ?? msg.content ?? "";
    }
    delete msg.redacted;
    delete msg.url;

    try {
      msg.content = JSON.parse(msg.content);
    } catch (e) {}

    redacted_messages.push(msg);
  });

  return redacted_messages;
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function singleLineInput(text) {
  let the_prompt;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await (async () => {
    return new Promise((resolve) => {
      rl.question(text, (prompt) => {
        the_prompt = prompt;
        rl.close();
        resolve();
      });
    });
  })();

  return the_prompt;
}


export const getFormFields = async (page) => {
  try {
    // const formElement = await page.waitForSelector("form");
    const formElement = await page.$("form");


    const fields = await formElement.$$eval(
      "input, select, textarea",
      (elements) => {
        return elements.map((element) => ({
          tagName: element.tagName.toLowerCase(),
          name: element.name,
          type: element.type,
          value: element.value,
        }));
      }
    ) || [];

    return {formFields : fields  };
  } catch (error) {
    let frames = await page.frames();
    let frameContents = [];
    for (const frame of frames) {
      try {
        frameContents.push({ url: frame.url(), name: frame.name() });
      } catch (e) {
        console.log("could not load body :: ", frame.name());
      }
    }


    const messageForFillUps = `Your task is to identify the iframe that contains the register form. You can use the iframe's name, or can use provided url to access the content of url and give your decision based on the same. Your response should strictly return the name of the iframe that contains the register form and nothing else.
    
    Below is the data which contains url and name of iframes :
    
    ${JSON.stringify(frameContents)}

    Please analyze the data and Strictly provide the name of the iframe that contains the register form.`;

    const forTypeResponse = await fetchOpenAIResponse({
      messages: [
        {
          role: "system",
          content: messageForFillUps,
        },
      ],
    });

    const targetFrame = frames.find(
      (f) => f.name() === forTypeResponse.choices[0].message.content
    );


    if (targetFrame) {
      // Extract the form and its fields from within the frame context
      const formFields = await targetFrame.evaluate(() => {
        const form = document.querySelector("form"); // Adjust the selector to match your form
        if (!form) return null;

        const fields = Array.from(form.elements).map((element) => ({
          tagName: element.tagName.toLowerCase(),
          name: element.name,
          type: element.type,
          value: element.value,
        }));

        return fields;
      });

      return {formFields , targetFrame };
    }
  }
};