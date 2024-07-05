import puppeteer from "puppeteer";
import { connect } from "puppeteer-real-browser";
import { prompt2 } from "../constants/prompts.js";
import { generalOpenAIResponse } from "../services/openai.js";
import { sleep } from "../utils/helpers.js";
import "dotenv/config";

const grabAScreenshot = async (page, ssName) => {
  await page.screenshot({
    fullPage: true,
    path: ssName,
  });
  const ss = await page.screenshot({
    fullPage: true,
    encoding: "base64",
  });
  return ss;
};

const fillFormElements = async (page, elements) => {
  for (const element of elements) {
    const { location, value } = element;
    const { x, y } = location;

    await page.evaluate(
      async (x, y, value) => {
        await new Promise((resolve) => setTimeout(() => resolve(), 1000));

        const cords = [];
        const getCenterCoordinates = async (element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            element,
          };
        };

        const inputs = document.querySelectorAll(
          'input:not([type="hidden"],[type="file"]), select, textarea'
        );
        for (const input of inputs) {
          cords.push(await getCenterCoordinates(input));
        }

        const detectFormElementsInShadowDOM = async (element) => {
          const cords = [];
          if (element.shadowRoot) {
            const inputs = element.shadowRoot.querySelectorAll(
              'input:not([type="hidden"],[type="file"]), select, textarea'
            );
            for (const input of inputs) {
              cords.push(await getCenterCoordinates(input));
            }
            for (const child of element.shadowRoot.children) {
              cords.push(...(await detectFormElementsInShadowDOM(child)));
            }
          }

          for (const child of element.children) {
            cords.push(...(await detectFormElementsInShadowDOM(child)));
          }

          return cords;
        };

        for (const child of document.body.children) {
          cords.push(...(await detectFormElementsInShadowDOM(child)));
        }

        const fillFormValue = async (element, value) => {
          if (["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName)) {
            element.focus();
            element.value = value;
          }
        };

        let elementInfo = cords.find((item) => item.x == x && item.y == y);
        console.log("found element :: ", x, y, elementInfo);
        if (elementInfo) {
          fillFormValue(elementInfo.element, value);
        }
      },
      x,
      y,
      value
    );
  }
};

const main = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  try {
    console.log("1. Opened a browser and visiting the url : ", url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    let registerPageIframe = null;
    if (url === "https://www.williamhill.com/") {
      // await new Promise((resolve) => setTimeout(resolve, 5000));
      // only to be executed in williamhills
      const joinButton = await page.$(".action-registration__button");
      await joinButton.evaluate((btn) => btn.click());
      await new Promise((resolve) => setTimeout(resolve, 7000));
      console.log(
        "2. Start finding coordinates of all the visible form elements"
      );
      registerPageIframe = await page.$(".cp-reg-iframe");
    } else if (url === "https://kycoolheat.com/") {
      registerPageIframe = await page.$("#JotFormIFrame-223494403132953");
    }

    const registerFrame = await registerPageIframe.contentFrame();

    const inputsWithinIframe = await registerFrame.evaluate(() => {
      const getCenterCoordinates = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          element: element.outerHTML,
        };
      };

      const tempCords = [];
      const neededInputs = document.querySelectorAll(
        'input:not([type="hidden"],[type="file"]), select, textarea'
      );
      for (const input of neededInputs) {
        tempCords.push(getCenterCoordinates(input));
      }
      return tempCords;
    });

    const filteredCords = inputsWithinIframe
      .filter((item) => item.x !== 0 && item.y !== 0)
      .map((item) => {
        if (item.element.length > 10000) {
          return {
            ...item,
            element: item.element.substr(0, 10000),
          };
        }
        return item;
      });

    console.log("Form Element Coordinates:", filteredCords);

    const gptPrompt = prompt2(filteredCords);
    const gptResponse = await generalOpenAIResponse(gptPrompt);
    console.log(
      "gpt response for coordinates:",
      gptResponse.choices[0].message.content
    );
    const responseJson = JSON.parse(gptResponse.choices[0].message.content);

    if (responseJson.fields) {
      await fillFormElements(registerFrame, responseJson.fields);
      console.log(gptResponse);
      await grabAScreenshot(page, "submit.png");
    }
  } catch (e) {
    console.log(e);
  } finally {
    await browser.close();
  }
};

// main("https://stake.com/?tab=register&modal=auth");
// main("https://signup.pinnacle.com/");
// main("https://www.dafabet.com/in/join?regvia=2");
// main("https://kycoolheat.com/")
main("https://www.williamhill.com/");
