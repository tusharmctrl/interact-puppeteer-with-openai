import fs from "fs";
import { clickOnButton } from "../services/login.js";
import { sleep, generalResponse, cleanURL } from "../utils/helpers.js";
import {
  convertToDesktop,
  convertToMobile,
  fillForm,
  fillFormNew,
  fillLoginForm,
  grabAScreenshot,
  start_browser,
  wait_for_navigation,
} from "../utils/puppeteer.js";
export const depositJourney = async (req, res) => {
  const { browser, page } = await start_browser();
  try {
    await convertToDesktop(page);
    const url = req.query.url;
    const { hostname } = new URL(url);
    fs.mkdir(`${hostname}/login`, { recursive: true }, (err) => {
      console.log(err);
    });
    await page.goto(url, {
      waitUntil: "load",
    });
    await sleep(7000);
    await clickOnButton(page, "login");
    await wait_for_navigation(page);
    await sleep(5000);
    const currentUrl = page.url();
    console.log("Found Login Button - You're at", currentUrl);
    await fillLoginForm(page);
    await page.keyboard.press("Enter");
    await sleep(5000);
    let homePageUrl = page.url();
    homePageUrl = cleanURL(homePageUrl);
    await page.goto(homePageUrl, {
      waitUntil: "domcontentloaded",
    });
    await sleep(5000);
    await convertToDesktop(page);
    const homePageDeposit = await grabAScreenshot(
      page,
      `${hostname}/deposit/home.png`
    );
    await convertToMobile(page);
    const homePageDepositMobile = await grabAScreenshot(
      page,
      `${hostname}/deposit/home-mobile.png`
    );
    await convertToDesktop(page);
    await clickOnButton(page, "Deposit");
    await sleep(8000);
    const responseOfFillingForm = await fillFormNew(page, {
      origin: `${hostname}/deposit`,
    });
    console.log(responseOfFillingForm);
  } catch (error) {
    console.log(error);
    return generalResponse(
      res,
      null,
      "Something went wrong while performing deposit page journey",
      "error",
      true,
      400
    );
  }
};
