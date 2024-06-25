import { connect } from "puppeteer-real-browser";
import cheerio from "cheerio";
import { sleep } from "./helpers.js";
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

  let important = [
    "main",
    '[role="main"]',
    "#bodyContent",
    "#search",
    "#searchform",
    ".kp-header",
  ];

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

  return (
    "## START OF PAGE CONTENT ##\nTitle: " +
    title +
    "\n\n" +
    ugly_chowder(html) +
    "\n## END OF PAGE CONTENT ##"
  );
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

export async function handleInput(page, field, value) {
  const elementHandle = await page.$(
    `input[name="${field}"], input[id="${field}"], select[name="${field}"], select[id="${field}"], textarea[name="${field}"], textarea[id="${field}"]`
  );
  if (elementHandle) {
    const tagName = await elementHandle.evaluate((el) =>
      el.tagName.toLowerCase()
    );
    if (tagName === "input") {
      const inputType = await elementHandle.evaluate((el) => el.type);
      if (inputType === "checkbox") {
        if (value) {
          await elementHandle.evaluate((el) => el.click());
        }
      } else {
        await elementHandle.type(value);
      }
    } else if (tagName === "select") {
      await elementHandle.select(value);
    } else if (tagName === "textarea") {
      await elementHandle.type(value);
    }
  } else {
    console.warn(`Element not found for field: ${field}`);
  }
}
