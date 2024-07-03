"use strict";
import { connect } from "puppeteer-real-browser";
import { prompt2 } from "./constants/prompts.js";
import { generalOpenAIResponse } from "./services/openai.js";
import { sleep } from "./utils/helpers.js";
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
    const {x , y} = location;
    
    await page.evaluate(
      async (x, y, value) => {
        await new Promise((resolve) => setTimeout(() => resolve(), 1000));

        // get coordinates
        const cords = [];
        await (async () => {
          const getCenterCoordinates = async (element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              element,
            };
          };
          // form elements in DOM
          const inputs = document.querySelectorAll(
            'input:not([type="hidden"],[type="file"]), select, textarea'
          );
          for (const input of inputs) {
            cords.push(await getCenterCoordinates(input));
          }

          // Shadow DOM elements
          const detectFormElementsInShadowDOM = async (element) => {
            const cords = [];
            if (element.shadowRoot) {
              const inputs = element.shadowRoot.querySelectorAll(
                'input:not([type="hidden"],[type="file"]), select, textarea'
              );
              for (const input of inputs) {
                cords.push(await getCenterCoordinates(input));
              }
              // Recursively check the Shadow DOM
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
        })();
        console.log(cords);
        const fillFormValue = async (element, value) => {
          if (["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName)) {
            element.focus();
            element.value = value;
          }
        };
        let elementInfo = cords.find((item) => item.x == x && item.y == y);
        if (elementInfo) {
          console.log("filling the value : ", value);
          fillFormValue(elementInfo.element, value);
        } else {
          console.log(elementInfo);
        }
      },
      x,
      y,
      value
    );
  }
};

const main = async (url) => {
  const { browser, page } = await connect({
    // headless: false,
    turnstile: true,
    fingerprint: true,
    connectOption: {
      protocolTimeout: 1800000,
    },
    devtools: true,
    // args: ['--auto-open-devtools-for-tabs']
  });
  try {
    console.log("1. Opened a browser and visiting the url : ", url);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const joinButton = await page.$(".action-registration__button");
    await joinButton.evaluate((btn) => btn.click());
    await new Promise((resolve) => setTimeout(resolve, 7000));
    console.log(
      "2. Start finding coordinates of all the visible form elements"
    );
    const registerPageIframe = await page.$(".cp-reg-iframe");
    const registerFrame = await registerPageIframe.contentFrame();
    const iframeRect = await registerPageIframe.boundingBox();

    const inputsWithinIframe = await registerFrame.evaluate(
      async (iframeRect) => {
        const getCenterCoordinates = (element, iframeRect) => {
          const rect = element.getBoundingClientRect();
          return {
            x: iframeRect.x + rect.left + rect.width / 2,
            y: iframeRect.y + rect.top + rect.height / 2,
            element: element.parentElement.outerHTML,
          };
        };

        const tempCords = [];
        const neededInputs = document.querySelectorAll(
          'input:not([type="hidden"],[type="file"]), select, textarea'
        );
        for (const input of neededInputs) {
          tempCords.push(getCenterCoordinates(input, iframeRect));
        }
        return tempCords;
      },
      iframeRect
    );

    const coordinates = await page.evaluate(async () => {
      const cords = [];
      const getCenterCoordinates = async (element) => {
        const rect = element.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          element: element.parentElement.outerHTML,
        };
      };

      const detectFormElementsInShadowDOM = async (element) => {
        const cords = [];
        if (element.shadowRoot) {
          const inputs = element.shadowRoot.querySelectorAll(
            'input:not([type="hidden"],[type="file"]), select, textarea'
          );
          for (const input of inputs) {
            cords.push(await getCenterCoordinates(input));
          }
          // Recursively check the Shadow DOM
          for (const child of element.shadowRoot.children) {
            cords.push(...(await detectFormElementsInShadowDOM(child)));
          }
        }

        for (const child of element.children) {
          cords.push(...(await detectFormElementsInShadowDOM(child)));
        }

        return cords;
      };

      console.log(
        "2.1. first approach grabbing the elements through DOM traversal"
      );
      // Direct DOM traversal
      const inputs = document.querySelectorAll(
        'input:not([type="hidden"],[type="file"]), select, textarea'
      );
      for (const input of inputs) {
        cords.push(await getCenterCoordinates(input));
      }

      console.log(
        "2.2. second approach grabbing the elements from the shadow DOM"
      );
      // Shadow DOM elements
      for (const child of document.body.children) {
        cords.push(...(await detectFormElementsInShadowDOM(child)));
      }

      return cords;
    }, registerFrame);
    const finalCords = [...coordinates, ...inputsWithinIframe];

    const filteredCords = finalCords
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
      console.log("within if statement");
      await fillFormElements(registerFrame, responseJson.fields);
      console.log(gptResponse);
      await grabAScreenshot(page, "submit.png");
    }
  } catch (e) {
    console.log(e);
  } finally {
    // await browser.close();
  }
  // page.mouse.click(951.5, 370)
};

// main("https://stake.com/?tab=register&modal=auth");
// main("https://signup.pinnacle.com/");
// main("https://www.dafabet.com/in/join?regvia=2");
main("https://www.williamhill.com/");
