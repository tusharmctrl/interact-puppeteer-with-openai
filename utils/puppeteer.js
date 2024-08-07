import { connect } from "puppeteer-real-browser";
import cheerio from "cheerio";
import { sleep } from "./helpers.js";
import { prompt2 } from "../constants/prompts.js";
import { fetchOpenAIResponse, generalOpenAIResponse } from "../services/openai.js";
import puppeteer from "puppeteer";
// import puppeteer from "puppeteer";
export async function start_browser() {
  let page_loaded = false;
  let request_count = 0;
  const request_block = false;
  let response_count = 0;
  const { page, browser } = await connect({
    headless: "auto",
    fingerprint: true,
    turnstile: true,
  });

  /** 
   * This code will use actual puppeteer instead of bypassing one.
   const browser = await puppeteer.launch({
    headless: headless ? "new" : false,
  });
  const page = await browser.newPage();
  **/

  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });

  page.on("request", (request) => {
    if (request_block) {
      if (request.isNavigationRequest()) {
        request.respond({
          status: 200,
          contentType: "application/octet-stream",
          body: "Dummy file to block navigation",
        });
      } else {
        request.continue();
      }
    }
    request_count++;
  });

  page.on("load", () => {
    page_loaded = true;
  });

  page.on("framenavigated", async (frame) => {
    if (frame === page.mainFrame()) {
      if (frame._lifecycleEvents.length < 5) {
        if (page_loaded) {
          console.log("Loading page...");
        }
        page_loaded = false;
      } else {
        await sleep(500);
      }
    }
  });

  page.on("response", async (response) => {
    response_count++;
    let headers = response.headers();
    if (
      headers["content-disposition"]?.includes("attachment") ||
      headers["content-length"] > 1024 * 1024 ||
      headers["content-type"] === "application/octet-stream"
    ) {
      setTimeout(function () {
        if (response_count == 1) {
          console.log("DOWNLOAD: A file download has been detected");
          download_started = true;
        }
      }, 2000);
    }
  });
  return { page, browser };
}

function good_html(html) {
  html = html.replace(/<\//g, " </");
  let $ = cheerio.load(html);

  $("script, style").remove();

  let important = ["main", '[role="main"]', "#bodyContent", "#search", "#searchform", ".kp-header"];

  // move important content to top
  important.forEach((im) => {
    $(im).each((i, el) => {
      $(el).prependTo("body");
    });
  });

  return $;
}

function ugly_chowder(html) {
  const $ = good_html("<body>" + html + "</body>");

  function traverse(element) {
    let output = "";
    let children = element.children;

    if ($(element).is("h1, h2, h3, h4, h5, h6")) {
      output += "<" + element.name + ">";
    }

    if ($(element).is("form")) {
      output += "\n<" + element.name + ">\n";
    }

    if ($(element).is("div, section, main")) {
      output += "\n";
    }

    let the_tag = make_tag(element);
    if ($(element).attr("pgpt-id")) {
      output += " " + (the_tag.tag ? the_tag.tag : "");
    } else if (element.type === "text" && !$(element.parent).attr("pgpt-id")) {
      output += " " + element.data.trim();
    }

    if (children) {
      children.forEach((child) => {
        output += traverse(child);
      });
    }

    if ($(element).is("h1, h2, h3, h4, h5, h6")) {
      output += "</" + element.name + ">";
    }

    if ($(element).is("form")) {
      output += "\n</" + element.name + ">\n";
    }

    if ($(element).is("h1, h2, h3, h4, h5, h6, div, section, main")) {
      output += "\n";
    }

    return output
      .replace(/[^\S\n]+/g, " ")
      .replace(/ \n+/g, "\n")
      .replace(/[\n]+/g, "\n");
  }

  return traverse($("body")[0]);
}

export async function get_page_content(page) {
  const title = await page.evaluate(() => {
    return document.title;
  });

  const html = await page.evaluate(() => {
    return document.body.innerHTML;
  });

  return "## START OF PAGE CONTENT ##\nTitle: " + title + "\n\n" + ugly_chowder(html) + "\n## END OF PAGE CONTENT ##";
}

export async function wait_for_navigation(page) {
  try {
    await page.waitForNavigation({
      timeout: 10000,
      waitUntil: "domcontentloaded",
    });
  } catch (error) {
    console.log("NOTICE: Giving up on waiting for navigation");
  }
}

async function get_next_tab(page, element, id, selector = "*") {
  let obj = await page.evaluate(
    async (element, id, selector) => {
      if (!element.matches(selector)) {
        return false;
      }

      const tagName = element.tagName;

      if (tagName === "BODY") {
        return false;
      }

      let textContent = element.textContent.replace(/\s+/g, " ").trim();

      if (textContent === "" && !element.matches("select, input, textarea")) {
        return false;
      }

      element.classList.add("pgpt-element" + id);

      let role = element.role;
      let placeholder = element.placeholder;
      let title = element.title;
      let type = element.type;
      let href = element.href;
      let value = element.value;

      if (href && href.length > 32) {
        href = href.substring(0, 32) + "[..]";
      }

      if (placeholder && placeholder.length > 32) {
        placeholder = placeholder.substring(0, 32) + "[..]";
      }

      if (!textContent && title && title.length > 32) {
        title = title.substring(0, 32) + "[..]";
      }

      if (textContent && textContent.length > 200) {
        textContent = textContent.substring(0, 200) + "[..]";
      }

      let tag = `<${tagName}`;

      if (href) {
        tag += ` href="${href}"`;
      }
      if (type) {
        tag += ` type="${type}"`;
      }
      if (placeholder) {
        tag += ` placeholder="${placeholder}"`;
      }
      if (title) {
        tag += ` title="${title}"`;
      }
      if (role) {
        tag += ` role="${role}"`;
      }
      if (value) {
        tag += ` value="${value}"`;
      }

      tag += `>`;

      let obj = {
        tag: tag,
        id: id,
      };

      if (textContent) {
        obj.text = textContent;
      }

      return obj;
    },
    element,
    id,
    selector
  );

  if (!obj) {
    return false;
  }

  const visible = await page.evaluate(async (id) => {
    const element = document.querySelector(".pgpt-element" + id);

    if (!element) {
      return false;
    }

    const visibility = element.style.visibility;
    const display = element.style.display;
    const clip = element.style.clip;
    const rect = element.getBoundingClientRect();

    return (
      visibility !== "hidden" &&
      display !== "none" &&
      rect.width != 0 &&
      rect.height != 0 &&
      clip !== "rect(1px, 1px, 1px, 1px)" &&
      clip !== "rect(0px, 0px, 0px, 0px)"
    );
  }, id);

  if (!visible) {
    return false;
  } else {
    await page.evaluate(async (id) => {
      const element = document.querySelector(".pgpt-element" + id);
      element.setAttribute("pgpt-id", id);
      element.style.border = "1px solid red";
    }, id);
  }

  return obj;
}

export async function get_tabbable_elements(page, selector = "*") {
  const tabbable_elements = [];
  let id = 0;
  const elements = await page.$$(
    'input:not([type=hidden]):not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex]:not([tabindex="-1"]), select:not([disabled]), a[href]:not([href="javascript:void(0)"]):not([href="#"])'
  );
  let limit = 400;
  for (const element of elements) {
    if (--limit < 0) {
      break;
    }
    const next_tab = await get_next_tab(page, element, ++id, selector);
    if (next_tab !== false) {
      tabbable_elements.push(next_tab);
    }
  }

  return tabbable_elements;
}

export function make_tag(element) {
  const $ = cheerio;
  let textContent = $(element).text().replace(/\s+/g, " ").trim();
  let placeholder = $(element).attr("placeholder");
  let tagName = element.name;
  let title = $(element).attr("title");
  let value = $(element).attr("value");
  let role = $(element).attr("role");
  let type = $(element).attr("type");
  let href = $(element).attr("href");
  let pgpt_id = $(element).attr("pgpt-id");

  if (href && href.length > 32) {
    href = href.substring(0, 32) + "[..]";
  }

  if (placeholder && placeholder.length > 32) {
    placeholder = placeholder.substring(0, 32) + "[..]";
  }

  if (title && title.length > 32) {
    title = title.substring(0, 32) + "[..]";
  }

  if (textContent && textContent.length > 200) {
    textContent = textContent.substring(0, 200) + "[..]";
  }

  let tag = `<${tagName}`;

  if (href) {
    tag += ` href="${href}"`;
  }
  if (type) {
    tag += ` type="${type}"`;
  }
  if (placeholder) {
    tag += ` placeholder="${placeholder}"`;
  }
  if (title) {
    tag += ` title="${title}"`;
  }
  if (role) {
    tag += ` role="${role}"`;
  }
  if (value) {
    tag += ` value="${value}"`;
  }
  if (pgpt_id) {
    tag += ` pgpt-id="${pgpt_id}"`;
  }

  tag += `>`;

  let obj = {
    tag: tag,
  };

  if (textContent) {
    obj.text = textContent;
    obj.tag += `${textContent}</${tagName}>`;
  }

  return obj;
}

const selectOption = async (page, dropdownSelector, element) => {
  const options = await page.evaluate((dropdownSelector) => {
    const selectElement = document.querySelector(dropdownSelector);
    console.log("selectElement.options ", selectElement.options);
    return Array.from(selectElement.options).map((option) => option.value);
  }, dropdownSelector);

  const filteredOptions = options.filter((option) => option !== "");
  const randomOption = filteredOptions[Math.floor(Math.random() * filteredOptions.length)];
  await element.select(randomOption);
};

export async function typeTextInForm(formFields, data, page) {
  for (const field of formFields) {
    if (field.name && field.name.trim() !== "") {
      const value = data[field.name] || "";
      const element = await page.$(
        `input[name="${field.name}"], input[id="${field.name}"], select[name="${field.name}"], select[id="${field.name}"], textarea[name="${field.name}"], textarea[id="${field.name}"]`
      );
      if (element) {
        const tagName = await page.evaluate((el) => el.tagName.toLowerCase(), element);
        if (tagName === "input") {
          const inputType = await page.evaluate((el) => el.type, element);
          if (inputType === "checkbox") {
            await element.evaluate((el) => el.click());
          } else if (inputType === "radio") {
            const radios = formFields.filter((e) => e.type === "radio");
            element.type(radios[0].value);
          } else if (inputType === "hidden") {
          } else {
            await element.type(value);
          }
        } else if (tagName === "textarea") {
          await element.type(value);
        } else if (tagName === "select") {
          const dropdownSelector = `select[name="${field.name}"]`;
          await selectOption(page, dropdownSelector, element);
        }
      } else {
        console.error(`Element with field name or id '${field.name}' not found.`);
      }
    }
  }
}
export const grabAScreenshot = async (page, ssName) => {
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

export const convertToDesktop = async (page) => {
  await page.setViewport({
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
  });
  await sleep(3000);
};

export const convertToMobile = async (page) => {
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
  });
  await sleep(3000);
};
export const fillFormNewIframe = async (page, origin) => {
  try {
    const frames = await page.frames();
    const frameContents = [];
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

    console.log("Asking GPT for a frame that consists register form..");
    const iframeIdentification = await fetchOpenAIResponse({
      messages: [
        {
          role: "system",
          content: messageForFillUps,
        },
      ],
    });

    const registerFrame = frames.find((f) => f.name() === iframeIdentification.choices[0].message.content);
    if (!registerFrame) throw new Error("Could not detect iframe");
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
      const neededInputs = document.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
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
    await convertToDesktop(page);
    const beforeFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/before-filling.png`);
    await convertToMobile(page);
    const beforeFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/before-filling-mobile.png`);
    const gptPrompt = prompt2(filteredCords);
    const gptResponse = await generalOpenAIResponse(gptPrompt);
    const responseJson = JSON.parse(gptResponse.choices[0].message.content);
    for (const field of responseJson.fields) {
      const element = await registerFrame.$(field.selector);
      if (element) {
        if (field.element_type === "textbox") {
          await registerFrame.type(field.selector, field.value, { delay: 100 });
        } else if (field.element_type === "radio") {
          await registerFrame.click(field.selector);
        } else if (field.element_type === "selectbox") {
          const dropdownSelector = field.selector;
          const options = await registerFrame.evaluate((dropdownSelector) => {
            const selectElement = document.querySelector(dropdownSelector);
            return Array.from(selectElement.options).map((option) => option.value);
          }, dropdownSelector);
          const randomOption = options[Math.floor(Math.random() * options.length)];
          await registerFrame.select(dropdownSelector, randomOption);
        }
        await page.keyboard.press("Enter");
      } else {
        console.error(`Element not found: ${field.selector}`);
      }
    }
    await convertToDesktop(page);
    const buttonSelector = await page.$(`button[type="submit"]`);
    if (buttonSelector) {
      await page.evaluate(() => {
        const findAndClickSubmitButton = () => {
          const button = document.querySelector('button[id*="submit"], button[type*="submit"], button[name*="submit"]');
          if (button) {
            button.click();
          } else {
            document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
          }
        };
        findAndClickSubmitButton();
      });
    } else {
      await page.keyboard.press("Enter");
    }
    const afterFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/after-filling.png`);
    await convertToMobile(page);
    const afterFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/after-filling-mobile.png`);
    await convertToDesktop(page);
    return {
      data: {
        gptResponse,
        before: {
          beforeFillingUpScreenshot,
          beforeFillingUpScreenshotMobile,
        },
        after: {
          afterFillingUpScreenshot,
          afterFillingUpScreenshotMobile,
        },
      },
      success: true,
      message: "Successfully Filled Up Form",
    };
  } catch (error) {
    console.log(error);
    return {};
  }
};
export const fillFormNew = async (page, origin) => {
  try {
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
          const inputs = element.shadowRoot.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
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

      const inputs = document.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
      for (const input of inputs) {
        cords.push(await getCenterCoordinates(input));
      }

      for (const child of document.body.children) {
        cords.push(...(await detectFormElementsInShadowDOM(child)));
      }

      return cords;
    });
    const filteredCords = coordinates
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
    if (!filteredCords.length) {
      const iframeResult = await fillFormNewIframe(page, origin);
      return iframeResult;
    }
    await convertToDesktop(page);
    const beforeFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/before-filling.png`);
    await convertToMobile(page);
    const beforeFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/before-filling-mobile.png`);
    await convertToDesktop(page);
    const gptPrompt = prompt2(filteredCords);
    const gptResponse = await generalOpenAIResponse(gptPrompt);
    const responseJson = JSON.parse(gptResponse.choices[0].message.content);
    console.log(responseJson.fields);
    for (const field of responseJson.fields) {
      if (!field.selector) continue;
      const element = await page.$(field.selector);
      if (element) {
        if (field.element_type === "textbox") {
          await page.type(field.selector, field.value, { delay: 100 });
        } else if (field.element_type === "selectbox") {
          const dropdownSelector = field.selector;
          if (dropdownSelector) {
            const options = await page.evaluate((dropdownSelector) => {
              const selectElement = document.querySelector(dropdownSelector);
              return Array.from(selectElement.options).map((option) => option.value);
            }, dropdownSelector);
            const randomOption = options[Math.floor(Math.random() * options.length)];
            await page.select(dropdownSelector, randomOption);
          }
        } else if (field.element_type === "checkbox" || field.element_type === "radiobutton") {
          const checkboxEl = await page.waitForSelector(field.selector);
          await checkboxEl.click();
        }
        await page.keyboard.press("Enter");
      } else {
        console.error(`Element not found: ${field.selector}`);
      }
    }
    await sleep(1000);
    const afterFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/after-filling.png`);
    await sleep(1000);
    await convertToMobile(page);
    const afterFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/after-filling-mobile.png`);

    const buttonSelector = await page.$(`button[type="submit"]`);
    if (buttonSelector) {
      await page.evaluate(() => {
        const findAndClickSubmitButton = () => {
          const button = document.querySelector('button[id*="submit"], button[type*="submit"], button[name*="submit"]');
          if (button) {
            button.click();
          } else {
            document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
          }
        };
        findAndClickSubmitButton();
      });
    }
    return {
      data: {
        gptResponse,
        before: {
          beforeFillingUpScreenshot,
          beforeFillingUpScreenshotMobile,
        },
        after: {
          afterFillingUpScreenshot,
          afterFillingUpScreenshotMobile,
        },
      },
      success: true,
      isFormInsideIframe: false,
      message: "Successfully Filled Up Form",
    };
  } catch (error) {
    console.log(error);
    return {};
  }
};
export const fillForm = async (page, origin) => {
  try {
    const beforeFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/before-filling.png`);
    await convertToMobile(page);
    const beforeFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/before-filling-mobile.png`);
    await convertToDesktop(page);
    const fillFormElements = async (page, elements) => {
      await page.evaluate(() => {
        const findSubmitButton = () => {
          return document.querySelector('button[id*="submit"], button[type*="submit"], button[name*="submit"]');
        };
        const submitButton = findSubmitButton();
        if (submitButton) {
          submitButton.click();
        }
      });
      for (const element of elements) {
        const { location, value } = element;
        const { x, y } = location;

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
              const inputs = document.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
              for (const input of inputs) {
                cords.push(await getCenterCoordinates(input));
              }

              // Shadow DOM elements
              const detectFormElementsInShadowDOM = async (element) => {
                const cords = [];
                if (element.shadowRoot) {
                  const inputs = element.shadowRoot.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
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
                // element.focus();
                element.value = structuredClone(value);
              }
            };
            let elementInfo = cords.find((item) => item.x == x && item.y == y);
            if (elementInfo) {
              console.log("filling the value : ", value);
              const elementClickPoints = document.elementFromPoint(elementInfo.x, elementInfo.y);
              if (elementClickPoints) {
                console.log("clicking", elementInfo);
                var clickEvent = new MouseEvent("click", {
                  view: window,
                  bubbles: true,
                  cancelable: true,
                });
                elementClickPoints.dispatchEvent(clickEvent);
                // await new Promise((resolve) => setTimeout(resolve, 3000));
                await fillFormValue(elementInfo.element, value);
              }
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
          const inputs = element.shadowRoot.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
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

      const inputs = document.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
      for (const input of inputs) {
        cords.push(await getCenterCoordinates(input));
      }

      for (const child of document.body.children) {
        cords.push(...(await detectFormElementsInShadowDOM(child)));
      }

      return cords;
    });

    const filteredCords = coordinates
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

    if (!filteredCords.length) {
      console.log("Could not find any elements here, checking in iframe...");
      const iframeResponse = await fillFormInsideIframe(page, origin);
      return iframeResponse;
    }

    console.log("Form Element Coordinates:", filteredCords);
    const gptPrompt = prompt2(filteredCords);
    const gptResponse = await generalOpenAIResponse(gptPrompt);
    const responseJson = JSON.parse(gptResponse.choices[0].message.content);
    console.log("GPT Coordinates", responseJson.fields);
    if (responseJson.fields) {
      await fillFormElements(page, responseJson.fields);
      const afterFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/after-filling.png`);
      await convertToMobile(page);
      const afterFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/after-filling-mobile.png`);
      return {
        data: {
          gptResponse,
          before: {
            beforeFillingUpScreenshot,
            beforeFillingUpScreenshotMobile,
          },
          after: {
            afterFillingUpScreenshot,
            afterFillingUpScreenshotMobile,
          },
        },
        success: true,
        isFormInsideIframe: false,
        message: "Successfully Filled Up Form",
      };
    }
  } catch (error) {
    console.log(error);
  }
};

export const fillFormInsideIframe = async (page, origin) => {
  try {
    await convertToDesktop(page);
    const beforeFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/before-filling.png`);
    await convertToMobile(page);
    const beforeFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/before-filling-mobile.png`);
    const fillFormElementsOfIframe = async (page, elements) => {
      const elementData = elements.map(({ location, value }) => ({
        x: location.x,
        y: location.y,
        value,
      }));

      await page
        .evaluate(async (elementData) => {
          const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

          const getCenterCoordinates = (element) => {
            const rect = element.getBoundingClientRect();
            return {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              element,
            };
          };

          const detectFormElementsInShadowDOM = async (element) => {
            const cords = [];
            if (element.shadowRoot) {
              const inputs = element.shadowRoot.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
              for (const input of inputs) {
                cords.push(getCenterCoordinates(input));
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

          const fillFormValue = (element, value) => {
            if (["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName)) {
              element.focus();
              element.value = value;
              element.dispatchEvent(new Event("input", { bubbles: true }));
              element.dispatchEvent(new Event("change", { bubbles: true }));
            }
          };

          const cords = [];
          const inputs = document.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
          for (const input of inputs) {
            cords.push(getCenterCoordinates(input));
          }
          for (const child of document.body.children) {
            cords.push(...(await detectFormElementsInShadowDOM(child)));
          }

          elementData.forEach(({ x, y, value }) => {
            const elementInfo = cords.find((item) => item.x === x && item.y === y);
            console.log("found element :: ", x, y, elementInfo);
            if (elementInfo) {
              fillFormValue(elementInfo.element, value);
            } else {
              console.error("Element not found at coordinates: ", x, y);
            }
          });

          await sleep(500);

          const findSubmitButton = () => {
            return document.querySelector('button[id*="submit"], button[type*="submit"], button[name*="submit"]');
          };
          const submitButton = findSubmitButton();
          console.log(submitButton);
          if (submitButton) {
            submitButton.click();
          }
        }, elementData)
        .catch((err) => {
          console.error("Error during form filling:", err);
        });
    };
    const frames = await page.frames();
    const frameContents = [];
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

    console.log("Asking GPT for a frame that consists register form..");
    const iframeIdentification = await fetchOpenAIResponse({
      messages: [
        {
          role: "system",
          content: messageForFillUps,
        },
      ],
    });

    const registerFrame = frames.find((f) => f.name() === iframeIdentification.choices[0].message.content);
    if (!registerFrame) throw new Error("Could not detect iframe");
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
      const neededInputs = document.querySelectorAll('input:not([type="hidden"],[type="file"]), select, textarea');
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
    const responseJson = JSON.parse(gptResponse.choices[0].message.content);
    if (responseJson.fields) {
      await fillFormElementsOfIframe(registerFrame, responseJson.fields);
      await convertToDesktop(page);
      const afterFillingUpScreenshot = await grabAScreenshot(page, `${origin.origin}/after-filling.png`);
      await convertToMobile(page);
      const afterFillingUpScreenshotMobile = await grabAScreenshot(page, `${origin.origin}/after-filling-mobile.png`);
      await convertToDesktop(page);
      return {
        data: {
          gptResponse,
          before: {
            beforeFillingUpScreenshot,
            beforeFillingUpScreenshotMobile,
          },
          after: {
            afterFillingUpScreenshot,
            afterFillingUpScreenshotMobile,
          },
        },
        success: true,
        message: "Successfully Filled Up Form",
      };
    }
  } catch (e) {
    console.log(e);
  }
};

export async function scrollToBottom(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      var totalHeight = 0;
      var distance = 500;
      var timer = setInterval(async () => {
        var scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        totalHeight += distance;
        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await sleep(500);
}

export async function scrapeReviews(website) {
  const fromPage = 1;
  const toPage = 3;
  const reviews = [];

  const { browser, page } = await start_browser();

  let overallRating = "0";

  for (let i = fromPage; i <= toPage; i++) {
    await page.goto(`https://www.trustpilot.com/review/${website}?page=${i}&date=last30days&language=en`, { waitUntil: "domcontentloaded" });

    const pageReviews = await page.evaluate(() => {
      const reviewsArray = [];
      const reviewElements = document.querySelectorAll(
        ".paper_paper__1PY90.paper_outline__lwsUX.card_card__lQWDv.card_noPadding__D8PcU.styles_reviewCard__hcAvl"
      );

      const overallRating = document.querySelector("span.typography_heading-m__T_L_X.typography_appearance-default__AAY17");
      const overallRatingText = overallRating ? overallRating.innerText : "";

      reviewElements.forEach((review) => {
        const reviewTitleElement = review.querySelector(".typography_heading-s__f7029.typography_appearance-default__AAY17");
        const reviewTitle = reviewTitleElement ? reviewTitleElement.innerText : "";

        const reviewUserElement = review.querySelector(".typography_heading-xxs__QKBS8.typography_appearance-default__AAY17");
        const reviewUser = reviewUserElement ? reviewUserElement.innerText : "";

        const reviewDateOriginalElement = review.querySelector("time");
        const reviewDateOriginal = reviewDateOriginalElement ? reviewDateOriginalElement.innerText : "";

        const reviewRatingElement = review.querySelector(".star-rating_starRating__4rrcf.star-rating_medium__iN6Ty").firstChild;
        const reviewRating = reviewRatingElement ? reviewRatingElement.getAttribute("alt") : "";

        const reviewTextElement = review.querySelector(".typography_body-l__KUYFJ.typography_appearance-default__AAY17.typography_color-black__5LYEn");
        const reviewText = reviewTextElement ? reviewTextElement.innerText : "";

        reviewsArray.push({
          review_title: reviewTitle,
          review_user: reviewUser,
          review_date: reviewDateOriginal,
          review_rating: reviewRating,
          review_text: reviewText,
        });
      });

      return { reviews: reviewsArray, overallRating: overallRatingText };
    });

    reviews.push(...pageReviews.reviews);
    overallRating = pageReviews.overallRating;
  }

  await browser.close();
  return { reviews, overallRating };
}

export const fillLoginForm = async (page) => {
  try {
    const formFields = await page.$$eval("form input", (elements) => elements.map((element) => element.name || element.id));
    const email = process.env.BASIC_AUTH_USERNAME;
    const password = process.env.BASIC_AUTH_PASSWORD;
    console.log(email, password);
    for (const field of formFields) {
      const element = await page.$(`input[name="${field}"], input[id="${field}"]`);
      if (element) {
        const tagName = await page.evaluate((el) => el.tagName.toLowerCase(), element);
        if (tagName === "input") {
          if (field.toLowerCase().includes("email") || field.toLowerCase().includes("username")) {
            console.log("typing", email);
            await element.type(email);
          } else if (field.toLowerCase().includes("password")) {
            await element.type(password);
          }
        }
      } else {
        console.error(`Element with field name or id '${field}' not found.`);
      }
    }
  } catch (e) {
    console.log(e);
  }
};
