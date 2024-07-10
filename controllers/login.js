import {
  functionDefinitions,
  LOGIN_HEURISTIC_PROMPT,
} from "../constants/prompts.js";
import { fetchOpenAIResponse } from "../services/openai.js";
import { singleLineInput, sleep, generalResponse } from "../utils/helpers.js";
import {
  convertToDesktop,
  convertToMobile,
  get_page_content,
  get_tabbable_elements,
  grabAScreenshot,
  start_browser,
  wait_for_navigation,
} from "../utils/puppeteer.js";
import fs from "fs";
export const loginJourney = async (req, res) => {
  try {
    const email = "TestDeveloper@gmail.com";
    const password = "Test@1";
    const url = req.query.url;
    const { browser, page } = await start_browser();
    console.log("Moving forwards..");

    await convertToDesktop(page);
    await page.goto(url, {
      waitUntil: "domcontentloaded",
    });
    await sleep(15000);
    const desktopScreenshots = [];
    const mobileScreenshots = [];
    const homePageScreenshot = await grabAScreenshot(
      page,
      "images/stake/home.png"
    );
    await convertToMobile(page);
    const homePageScreenshotMobile = await grabAScreenshot(
      page,
      "images/stake/mobile-home.png"
    );
    await convertToDesktop(page);
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

      const loginFormScreenshot = await grabAScreenshot(
        page,
        "images/stake/login-form.png"
      );
      await convertToMobile(page);
      const loginFormScreenshotMobile = await grabAScreenshot(
        page,
        "images/stake/mobile-login-form.png"
      );
      await convertToDesktop(page);

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
            if (
              field.toLowerCase().includes("email") ||
              field.toLowerCase().includes("username")
            ) {
              await element.type(email);
            } else if (field.toLowerCase().includes("password")) {
              await element.type(password);
            }
          }
        } else {
          console.error(`Element with field name or id '${field}' not found.`);
        }
      }
      const fillingUpLoginFormScreenshot = await grabAScreenshot(
        page,
        "images/stake/filling-login-form.png"
      );
      await convertToMobile(page);
      const fillingUpLoginFormScreenshotMobile = await grabAScreenshot(
        page,
        "images/stake/mobile-filling-login-form.png"
      );
      await page.keyboard.press("Enter");
      await sleep(5000);
      await convertToDesktop(page);
      const afterSubmitScreenshot = await grabAScreenshot(
        page,
        "images/stake/submit-login-form.png"
      );
      await convertToMobile(page);
      const afterSubmitScreenshotMobile = await grabAScreenshot(
        page,
        "images/stake/submit-login-form-mobile.png"
      );
      desktopScreenshots.push(
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
      mobileScreenshots.push(
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${homePageScreenshotMobile}`,
          },
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${loginFormScreenshotMobile}`,
          },
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${fillingUpLoginFormScreenshotMobile}`,
          },
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/png;base64, ${afterSubmitScreenshotMobile}`,
          },
        }
      );
      const heuristicResponseDesktop = await fetchOpenAIResponse({
        messages: [
          {
            role: "user",
            content: JSON.stringify(desktopScreenshots),
          },
          {
            role: "assistant",
            content: LOGIN_HEURISTIC_PROMPT("desktop"),
          },
        ],
        json_response: true,
        temperature: 0,
      });
      const heuristicResponseMobile = await fetchOpenAIResponse({
        messages: [
          {
            role: "user",
            content: JSON.stringify(mobileScreenshots),
          },
          {
            role: "assistant",
            content: LOGIN_HEURISTIC_PROMPT("mobile"),
          },
        ],
        json_response: true,
        temperature: 0,
      });
      const heuristicResponsesDesktop = JSON.parse(
        heuristicResponseDesktop.choices[0].message.content
      );
      const heuristicResponsesMobile = JSON.parse(
        heuristicResponseMobile.choices[0].message.content
      );
      fs.writeFileSync(
        `Login - ${new Date().getTime()}.json`,
        JSON.stringify(
          {
            desktop: heuristicResponsesDesktop,
            mobile: heuristicResponsesMobile,
          },
          null,
          2
        )
      );

      return generalResponse(
        res,
        {
          evaluationResult: {
            desktop: heuristicResponsesDesktop,
            mobile: heuristicResponsesMobile,
          },
        },
        "Successfully Completed Login Journey",
        "success",
        true,
        200
      );
    } catch (e) {
      console.log(e);
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
