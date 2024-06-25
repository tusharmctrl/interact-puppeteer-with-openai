import puppeteer, { TimeoutError } from "puppeteer";
import { connect } from "puppeteer-real-browser";

(async () => {
  async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Launch the browser
  // const browser = await puppeteer.launch({ headless: false }); // Set to true to run headless
  // const page = await browser.newPage();

  const { browser, page } = await connect({
    headless: "auto",
    fingerprint: true,
    turnstile: true,
    connectOption: {
      protocolTimeout: 1800000,
    },
  });

  // Visit the URL
  const url = "https://www.williamhill.com/"; // Replace with your target URL
  // const url = "https://www.stake.com/"; // Replace with your target URL
  // const url = "https://www.dafabet.com/in/";
  // const url = "https://www.betonline.ag/"
  await page.goto(url);

  // Wait for the page to load completely
  await sleep(60000);

  await page.screenshot({ fullPage: true, path: "home.png" });

  // Extract all clickable elements (buttons and links)
  const clickableElements = await page.$$eval("a, button", (elements) =>
    elements.map((el) => ({
      tag: el.tagName,
      text: el.innerText,
      href: el.href,
      outerHTML: el.outerHTML,
    }))
  );

  // Define keywords to look for
  const keywords = ["register", "join", "sign up"];

  // Find the element that matches one of the keywords
  const targetElement = clickableElements.find((el) =>
    keywords.some((keyword) => el.text.toLowerCase().includes(keyword))
  );

  if (targetElement) {
    console.log("Target element found:", targetElement);

    // Click on the found element
    await page.evaluate((outerHTML) => {
      const elements = Array.from(document.querySelectorAll("a, button"));
      const target = elements.find((el) => el.outerHTML === outerHTML);
      if (target) {
        target.click();
      }
    }, targetElement.outerHTML);

    // Wait for the navigation to complete (optional, based on your use case)
    try {
      await page.waitForNavigation({
        waitUntil: "networkidle0",
        timeout: 60000,
      });
    } catch (err) {
      console.log("No naviagation ");
    } finally {
      await sleep(5000);
    }

    console.log("Clicked on the target element and navigated to:", page.url());

    // Wait for the form to load
    await page.waitForSelector("form");

    // Extract input field names and fill them dynamically
    const formFields = await page.$$eval("form input", (inputs) =>
      inputs.map((input) => input.name || input.id)
    );

    //chatgpt api call response will be here for getting dummy record

    // Fill the form dynamically based on available fields
    for (const field of formFields) {
      if (field && field.trim() !== "") {
        await page.type(`input[name="${field}"], input[id="${field}"]`, "test");
      }
    }

    await page.screenshot({ fullPage: true, path: "filled2.png" });

    await page.keyboard.press("Enter");
  }
  // Close the browser
  // await browser.close();
})();
